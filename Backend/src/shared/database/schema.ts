// Barrel del esquema completo: reexporta cada *.schema.ts de los módulos.
// drizzle-kit apunta aquí (drizzle.config.ts) y el DatabaseModule lo pasa a drizzle(pool, { schema }).

export * from '../../modules/catalog/infrastructure/catalog.schema';
export * from '../../modules/account/infrastructure/account.schema';
export * from '../../modules/list/infrastructure/list.schema';
export * from '../../modules/requests/infrastructure/requests.schema';
export * from '../../modules/submission/infrastructure/submission.schema';
export * from '../../modules/pricing/infrastructure/pricing.schema';
export * from '../../modules/admin/infrastructure/admin.schema';
export * from '../../modules/publish/infrastructure/publish.schema';
