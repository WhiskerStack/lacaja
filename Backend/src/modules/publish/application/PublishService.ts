import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../shared/database/database.tokens';
import type { Database } from '../../../shared/database/database.types';
import { publishRuns } from '../infrastructure/publish.schema';

const execAsync = promisify(exec);

export interface PublishStatus {
  running: boolean;
  lastRun?: {
    id: number;
    status: string;
    trigger: string;
    startedAt: string;
    finishedAt: string | null;
  };
}

/**
 * Regenera el SSG del landing ejecutando BUILD_COMMAND como subproceso (publish §7, MVP
 * sin BullMQ). Un lock en proceso evita ejecuciones paralelas. Registra cada corrida en
 * publish_run para auditoría. El comando real es configurable por env (placeholder por defecto).
 */
@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);
  private running = false;
  /** Marca de tiempo del último build correcto (para el chequeo "¿cambió?" del cron). */
  private lastBuiltAt = 0;

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly config: ConfigService,
  ) {}

  isRunning(): boolean {
    return this.running;
  }

  /** Devuelve true si el catálogo "cambió" desde el último build (stub por timestamp). */
  hasChangesSince(timestamp: number): boolean {
    return timestamp > this.lastBuiltAt;
  }

  async status(): Promise<PublishStatus> {
    const [last] = await this.db
      .select()
      .from(publishRuns)
      .orderBy(desc(publishRuns.id))
      .limit(1);
    return {
      running: this.running,
      lastRun: last
        ? {
            id: last.id,
            status: last.status,
            trigger: last.trigger,
            startedAt: last.startedAt.toISOString(),
            finishedAt: last.finishedAt?.toISOString() ?? null,
          }
        : undefined,
    };
  }

  /**
   * Dispara el build. Si ya hay uno en curso, no encola otro (lock simple): devuelve
   * `{ started: false }`. Para el MVP el build corre de forma síncrona y protegida.
   */
  async publish(trigger: 'manual' | 'cron'): Promise<{ started: boolean; runId?: number }> {
    if (this.running) {
      this.logger.warn('Publicación ya en curso; se ignora la nueva petición.');
      return { started: false };
    }
    this.running = true;

    const [run] = await this.db
      .insert(publishRuns)
      .values({ status: 'running', trigger })
      .returning();

    const command = this.config.get<string>('BUILD_COMMAND') ?? 'echo "no BUILD_COMMAND"';
    this.runBuild(run.id, command).catch((err) => this.logger.error(err));
    return { started: true, runId: run.id };
  }

  private async runBuild(runId: number, command: string): Promise<void> {
    try {
      this.logger.log(`Ejecutando build del SSG: ${command}`);
      const { stdout, stderr } = await execAsync(command, { timeout: 10 * 60_000 });
      this.lastBuiltAt = Date.now();
      await this.finish(runId, 'success', `${stdout}\n${stderr}`.trim());
      this.logger.log(`Publicación ${runId} completada.`);
    } catch (err) {
      await this.finish(runId, 'failed', err instanceof Error ? err.message : String(err));
      this.logger.error(`Publicación ${runId} falló: ${String(err)}`);
    } finally {
      this.running = false;
    }
  }

  private async finish(runId: number, status: 'success' | 'failed', log: string): Promise<void> {
    await this.db
      .update(publishRuns)
      .set({ status, finishedAt: new Date(), log: log.slice(0, 10_000) })
      .where(eq(publishRuns.id, runId));
  }
}
