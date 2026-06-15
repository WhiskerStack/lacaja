import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useService } from '@/app/providers';
import type { CatalogService } from './logic/CatalogService';
import type { AudiovisualInput, AuxKind, EpisodeInput, SeasonInput } from './types';

const KEY = ['catalog'] as const;

export function useCatalogList() {
  const service = useService<CatalogService>('catalogService');
  return useQuery({ queryKey: KEY, queryFn: () => service.list() });
}

export function useCreateAudiovisual() {
  const service = useService<CatalogService>('catalogService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AudiovisualInput) => service.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateAudiovisual() {
  const service = useService<CatalogService>('catalogService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: AudiovisualInput }) =>
      service.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteAudiovisual() {
  const service = useService<CatalogService>('catalogService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => service.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

// --- Catálogos auxiliares ---
export function useAuxList(kind: AuxKind) {
  const service = useService<CatalogService>('catalogService');
  return useQuery({ queryKey: ['catalog', 'aux', kind], queryFn: () => service.listAux(kind) });
}

export function useCreateAux(kind: AuxKind) {
  const service = useService<CatalogService>('catalogService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => service.createAux(kind, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', 'aux', kind] }),
  });
}

export function useDeleteAux(kind: AuxKind) {
  const service = useService<CatalogService>('catalogService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => service.removeAux(kind, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', 'aux', kind] }),
  });
}

// --- Temporadas y capítulos ---
export function useSeasons(audiovisualId: number) {
  const service = useService<CatalogService>('catalogService');
  return useQuery({
    queryKey: ['catalog', audiovisualId, 'seasons'],
    queryFn: () => service.listSeasons(audiovisualId),
    enabled: audiovisualId > 0,
  });
}

export function useCreateSeason(audiovisualId: number) {
  const service = useService<CatalogService>('catalogService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SeasonInput) => service.createSeason(audiovisualId, input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['catalog', audiovisualId, 'seasons'] }),
  });
}

export function useDeleteSeason(audiovisualId: number) {
  const service = useService<CatalogService>('catalogService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (seasonId: number) => service.removeSeason(seasonId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['catalog', audiovisualId, 'seasons'] }),
  });
}

// El backend no expone GET de capítulos: no hay hook de listado. Tras crear o
// eliminar un capítulo se refrescan las temporadas (su peso se deriva de ellos).
export function useCreateEpisode(audiovisualId: number, seasonId: number) {
  const service = useService<CatalogService>('catalogService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EpisodeInput) => service.createEpisode(seasonId, input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['catalog', audiovisualId, 'seasons'] }),
  });
}

export function useDeleteEpisode(audiovisualId: number) {
  const service = useService<CatalogService>('catalogService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (episodeId: number) => service.removeEpisode(episodeId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['catalog', audiovisualId, 'seasons'] }),
  });
}

export function useAudiovisualDetail(id: number) {
  const service = useService<CatalogService>('catalogService');
  return useQuery({
    queryKey: ['catalog', id, 'detail'],
    queryFn: () => service.getDetail(id),
    enabled: id > 0,
  });
}

// --- Trailers ---
export function useTrailers(audiovisualId: number) {
  const service = useService<CatalogService>('catalogService');
  return useQuery({
    queryKey: ['catalog', audiovisualId, 'trailers'],
    queryFn: () => service.listTrailers(audiovisualId),
    enabled: audiovisualId > 0,
  });
}

export function useCreateTrailer(audiovisualId: number) {
  const service = useService<CatalogService>('catalogService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (youtubeId: string) => service.createTrailer(audiovisualId, youtubeId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['catalog', audiovisualId, 'trailers'] }),
  });
}

export function useDeleteTrailer(audiovisualId: number) {
  const service = useService<CatalogService>('catalogService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trailerId: number) => service.removeTrailer(trailerId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['catalog', audiovisualId, 'trailers'] }),
  });
}
