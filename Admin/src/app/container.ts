import { createContainer, asClass, asFunction, asValue, InjectionMode, type AwilixContainer } from 'awilix';
import { HttpClient } from './http';
import { AuthApi } from '@/features/auth/api/AuthApi';
import { AuthService } from '@/features/auth/logic/AuthService';
import { CatalogApi } from '@/features/catalog/api/CatalogApi';
import { CatalogService } from '@/features/catalog/logic/CatalogService';
import { SubmissionsApi } from '@/features/submissions/api/SubmissionsApi';
import { SubmissionsService } from '@/features/submissions/logic/SubmissionsService';
import { RequestsApi } from '@/features/requests/api/RequestsApi';
import { RequestsService } from '@/features/requests/logic/RequestsService';
import { PricingApi } from '@/features/pricing/api/PricingApi';
import { PricingService } from '@/features/pricing/logic/PricingService';
import { UsersApi } from '@/features/users/api/UsersApi';
import { UsersService } from '@/features/users/logic/UsersService';
import { PublishApi } from '@/features/publish/api/PublishApi';
import { PublishService } from '@/features/publish/logic/PublishService';

/**
 * Contenedor awilix en modo CLASSIC: resuelve cada dependencia por el NOMBRE
 * del parámetro del constructor, que debe coincidir con la clave registrada
 * (`http`, `authApi`, `catalogApi`, ...). Sin decoradores ni reflect-metadata.
 *
 * CAVEAT de build: la minificación renombra parámetros y rompería esta
 * resolución; por eso vite.config.ts activa `esbuild.keepNames`. Como red de
 * seguridad adicional, el HttpClient recibe sus deps por una clave de objeto
 * explícita (`httpDeps`), no por destructuración posicional.
 */
export interface ContainerOptions {
  /** Devuelve el token vigente. Se cablea contra AuthService tras crearse. */
  onUnauthorized?: () => void;
}

export type AppContainer = AwilixContainer;

export function buildContainer(options: ContainerOptions = {}): AppContainer {
  const container = createContainer({ injectionMode: InjectionMode.CLASSIC });

  // El HttpClient necesita el token, pero AuthService necesita el HttpClient
  // (vía AuthApi). Rompemos el ciclo con una referencia perezosa al servicio
  // ya registrado en el mismo contenedor.
  const httpDeps = {
    getToken: () => container.resolve<AuthService>('authService').getToken(),
    onUnauthorized: options.onUnauthorized,
  };

  container.register({
    // Infraestructura
    httpDeps: asValue(httpDeps),
    http: asClass(HttpClient).singleton(),

    // auth
    authApi: asClass(AuthApi).singleton(),
    authService: asClass(AuthService).singleton(),

    // catalog
    catalogApi: asClass(CatalogApi).singleton(),
    catalogService: asClass(CatalogService).singleton(),

    // submissions
    submissionsApi: asClass(SubmissionsApi).singleton(),
    submissionsService: asClass(SubmissionsService).singleton(),

    // requests
    requestsApi: asClass(RequestsApi).singleton(),
    requestsService: asClass(RequestsService).singleton(),

    // pricing
    pricingApi: asClass(PricingApi).singleton(),
    pricingService: asClass(PricingService).singleton(),

    // users
    usersApi: asClass(UsersApi).singleton(),
    usersService: asClass(UsersService).singleton(),

    // publish
    publishApi: asClass(PublishApi).singleton(),
    publishService: asClass(PublishService).singleton(),
  });

  return container;
}

// `asFunction` se reexporta por conveniencia para contenedores de prueba.
export { asFunction };
