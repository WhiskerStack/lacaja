import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Filtro global de excepciones: normaliza la respuesta de error y evita filtrar
 * detalles internos. Los errores de dominio (p.ej. "Campo no permitido en el Criteria")
 * salen como 400 controlado; el resto, 500 sin exponer el stack.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Error interno del servidor.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof Error) {
      // Errores de regla de negocio/dominio: 400 con el mensaje, sin stack.
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      this.logger.warn(`${request.method} ${request.url} -> ${exception.message}`);
    }

    if (status >= 500) {
      this.logger.error(exception);
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      message,
    });
  }
}
