# Dahem

Catálogo audiovisual de consulta para un negocio **presencial** en Cuba (películas, series, novelas, shows, animes). La web no vende ni reproduce contenido: muestra el inventario, deja al usuario armar una lista (GB + precio + espacio disponible) y enviarla al vendedor por una de cuatro vías. El negocio identifica al cliente en el encuentro presencial y le copia lo solicitado.

> Inspiración visual: **EPIX PLAY**. Mobile-first. Entorno de red lenta (Cuba): cada KB importa.

## Monorepo (pnpm workspaces)

```
Dahem/
  packages/domain/   @dahem/domain — clases de dominio compartidas (una sola fuente de verdad de las reglas)
  Backend/           @dahem/backend — NestJS + Drizzle + Postgres (frontera de escritura + generador del SSG)
  Landing/           @dahem/landing — Astro SSG + islas Preact (catálogo público de solo lectura)
  Admin/             @dahem/admin — React + Vite + shadcn/ui (panel del vendedor)
  Docs/              especificaciones del proyecto (fuente de verdad funcional y técnica)
```

Tres apps, tres contextos, tres stacks — coherente, no contradictorio:

| | Landing | Admin | Backend |
|---|---|---|---|
| Plataforma | Astro SSG + Preact | SPA React + Vite | NestJS |
| Operación dominante | **lectura** | **escritura** (CRUD) | **escritura** + genera el SSG |
| UI | daisyUI (sin Radix, por peso) | shadcn/ui (Radix) | — |
| IoC | sin contenedor (cableado manual) | awilix | contenedor de NestJS |
| Frontera de serialización | build SSG | API HTTP | fila de BD ↔ dominio |

La regla mental: **lectura siempre desde SSG, escritura siempre contra el backend.**

## Requisitos

- Node ≥ 20, pnpm ≥ 11
- Postgres (para el backend) — local o gestionado
- Redis opcional (BullMQ para la cola de rebuild; el MVP puede ir sin cola)

## Arranque

```bash
pnpm install
pnpm build:domain        # compila @dahem/domain (dual ESM/CJS), lo consumen las 3 apps

# Backend
cp Backend/.env.example Backend/.env   # configura DATABASE_URL, JWT_SECRET
pnpm --filter @dahem/backend db:push   # aplica el esquema Drizzle
pnpm dev:backend                       # http://localhost:3000

# Landing
pnpm dev:landing                       # http://localhost:4321

# Admin
pnpm dev:admin                         # http://localhost:5173
```

## Dominio compartido

`@dahem/domain` contiene las clases con sus reglas adentro (`Audiovisual.code()`, `List.fitsIn()`,
`User.validate()`, snapshots de envío, tarifas). Las tres apps **hidratan en la frontera**
(`fromJSON`/`toJSON`) y delegan las reglas al dominio, nunca las reimplementan.

## Documentación

Las especificaciones completas (funcional + técnica de cada pieza, modelo de datos, estrategia de
búsqueda) viven en [`Docs/`](./Docs).

## Licencia

MIT
