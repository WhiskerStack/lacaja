// DTOs planos (la frontera de serialización: SSG en landing, API en admin, fila de BD en backend).
// Convención: identificadores en inglés, igual que el modelo de datos.

export type AudiovisualType = 'movie' | 'series' | 'telenovela' | 'show' | 'anime';

/** Nivel al que apunta un ítem de "Mi lista" (modelo de datos §3.2). */
export type ItemLevel = 'audiovisual' | 'season' | 'episode';

/** Estado de una solicitud de contenido no disponible (funcional admin §6.1). */
export type RequestStatus = 'pending' | 'available' | 'notified';

/** Clave de tarifa configurable (modelo de datos PRICE_RATE). */
export type PriceKey = 'normal' | 'premiere';

export interface AudiovisualDTO {
  id: number;
  type: AudiovisualType;
  name: string;
  year: number;
  rating: number;
  /** Solo significativo si NO es episódico. En episódicos el peso vive en season/episode. */
  sizeGb: number;
  isPremiere: boolean;
}

export interface SeasonDTO {
  id: number;
  audiovisualId: number;
  number: number;
  sizeGb: number;
}

export interface EpisodeDTO {
  id: number;
  seasonId: number;
  number: number;
  sizeGb: number;
  durationMin?: number;
}

export interface ListItemDTO {
  /** PK en Dexie: "S1122", "S1122-3", "S1122-3-10". */
  code: string;
  level: ItemLevel;
  /** id del audiovisual/season/episode según level. */
  targetId: number;
  name: string; // snapshot
  sizeGb: number; // snapshot
  price: number; // snapshot
}

export interface SubmissionItemDTO {
  code: string;
  name: string; // snapshot
  sizeGb: number; // snapshot
  price: number; // snapshot
}

export interface WebSubmissionDTO {
  id?: number;
  userId: number;
  submissionCode: string;
  createdAt: string; // ISO
  totalGb: number;
  totalPrice: number;
  items: SubmissionItemDTO[];
}

export interface ContentRequestDTO {
  id?: number;
  userId: number;
  searchText: string;
  status: RequestStatus;
}

export interface PriceRateDTO {
  key: PriceKey;
  priceCup: number;
}

export interface UserDTO {
  id?: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

export interface AdminUserDTO {
  id?: number;
  username: string;
  displayName: string;
  createdAt?: string; // ISO
}

/** Tarifa resuelta y lista para calcular precios. */
export interface Rate {
  normal: number;
  premiere: number;
}
