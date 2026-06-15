import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Logger estructurado (Pino) en lugar del logger por defecto.
  app.useLogger(app.get(Logger));

  // Cabeceras de seguridad (stack §8).
  app.use(helmet());

  // CORS acotado a landing + admin (no '*').
  const landing = process.env.LANDING_ORIGIN ?? 'http://localhost:4321';
  const admin = process.env.ADMIN_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({ origin: [landing, admin], credentials: true });

  // ValidationPipe global: whitelist (descarta props no declaradas) + transform (DTOs tipados).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  app.get(Logger).log(`Daher backend escuchando en http://localhost:${port}`);
}

void bootstrap();
