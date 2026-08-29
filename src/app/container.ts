// Composition root (arquitectura §6.2): único lugar que conoce el grafo de dependencias.
// Las islas importan desde aquí y nunca saben cómo se construyó cada servicio.
import { db } from './db';
import { ListService } from '../features/my-list/logic/ListService';
import { SearchService } from '../features/search/logic/SearchService';
import { SubmissionService } from '@/features/submission/logic/SubmissionService';

// Mi lista: Dexie por constructor (testeable con un fake de Table).
export const listService = new ListService(db.listItems, db.meta);

// Search: el índice se carga aparte (loadIndex es asíncrono, arquitectura §6.2).
export const searchService = new SearchService({
  indexUrl: '/search-index.json',
  fetchFn: (...args) => fetch(...args),
  timeoutMs: 12000,
});

export const submissionService = new SubmissionService()