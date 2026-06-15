import type { PublishApi, PublishResult, PublishStatus } from '../api/PublishApi';

/**
 * Orquesta la publicación del landing (regenera el SSG). El paso de publicar es
 * explícito (funcional admin §8): el admin decide cuándo llevar los cambios.
 */
export class PublishService {
  constructor(private readonly publishApi: PublishApi) {}

  trigger(): Promise<PublishResult> {
    return this.publishApi.trigger();
  }

  status(): Promise<PublishStatus> {
    return this.publishApi.status();
  }

  /** ¿Está el build en curso ahora mismo? */
  isRunning(status: PublishStatus | undefined): boolean {
    return status?.state === 'running';
  }
}
