// Composition root (arquitectura §6.2): único lugar que conoce el grafo de dependencias.
// Las islas importan desde aquí y nunca saben cómo se construyó cada servicio.
import { db } from './db';
import { $session } from './stores/session';
import { ListService } from '../features/my-list/logic/ListService';
import { SubmissionService } from '../features/submission/logic/SubmissionService';
import { SearchService } from '../features/search/logic/SearchService';
import { setSearchMode } from '../features/search/store';
import { AccountService } from '../features/account/logic/AccountService';
import { API_URL, WHATSAPP_NUMBER } from '../shared/env';

// Mi lista: Dexie por constructor (testeable con un fake de Table).
export const listService = new ListService(db.listItems, db.meta);

// Submission: número de WhatsApp + dependencias del envío por web (token de sesión vivo).
export const submissionService = new SubmissionService(WHATSAPP_NUMBER, {
  fetchFn: (...args) => fetch(...args),
  apiUrl: API_URL,
  get token() {
    return $session.get().token;
  },
});

// Account: auth contra NestJS, con degradación local en F1/offline.
export const accountService = new AccountService(API_URL, (...args) => fetch(...args));

// Search: el índice se carga aparte (loadIndex es asíncrono, arquitectura §6.2).
export const searchService = new SearchService({
  indexUrl: '/search-index.json',
  apiUrl: API_URL,
  fetchFn: (...args) => fetch(...args),
  timeoutMs: 12000,
  onModeChange: (mode) => setSearchMode(mode),
});
