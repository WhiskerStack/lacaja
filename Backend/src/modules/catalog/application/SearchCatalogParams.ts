/** Intención plana, agnóstica del transporte (arquitectura §5.4). El servicio la traduce a Criteria. */
export interface SearchCatalogParams {
  type?: string;
  name?: string;
  isPremiere?: boolean;
  page?: number;
  pageSize?: number;
}
