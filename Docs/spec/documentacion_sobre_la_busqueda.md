# Estrategia de búsqueda — Dahem

> Informe técnico que define cómo se implementará el buscador del catálogo, qué se descarta y por qué, y cuáles son los criterios para migrar en el futuro.

---

## 1. Decisión

**Fase inicial**: búsqueda léxica usando capacidades nativas de Postgres — `tsvector` (FTS) combinado con `pg_trgm` (trigramas para tolerancia a typos).

**Fase de crecimiento**: migrar a **Meilisearch** cuando el buscador léxico se quede corto, según los criterios definidos en §4.

**Descartado**: búsqueda vectorial / semántica con embeddings. Justificación detallada en §5.

Esta decisión prioriza tres cosas: una sola pieza de infraestructura (Supabase = Postgres ya existente), cero costos adicionales en fase inicial, y una ruta de migración clara sin reescritura del backend.

---

## 2. Búsqueda léxica con Postgres

### 2.1. FTS (Full-Text Search)

Postgres tiene búsqueda de texto completo nativa desde hace más de una década. Trabaja sobre el tipo `tsvector`, que representa el texto como una bolsa de **lexemas** (raíces morfológicas) en vez de palabras crudas.

Lo que aporta:

- **Stemming en español**: buscar `corriendo` encuentra `correr`, `corrió`, `corredor`.
- **Stopwords**: ignora palabras vacías (`el`, `de`, `que`) que no aportan al match.
- **Multi-campo con pesos**: el match en el título cuenta más que el match en la sinopsis.
- **Ranking**: `ts_rank()` ordena resultados por relevancia.

Lo que NO aporta:

- **Tolerancia a typos**. `jugos de tronos` NO encuentra `Juego de Tronos`. Para eso necesitamos `pg_trgm`.
- **Sinónimos automáticos**. Hay que configurarlos manualmente vía diccionarios. Generalmente no vale la pena para este caso.

### 2.2. `pg_trgm` (trigramas)

Extensión nativa de Postgres. Parte cada cadena en trigramas (subcadenas de 3 caracteres) y compara qué fracción comparten dos textos. `juego de tronos` → `{jue, ueg, ego, ...}`.

Aporta exactamente lo que FTS no:

- **Tolerancia a typos**: `jugos de tronos` y `juego de tronos` comparten suficientes trigramas para matchear.
- **Match parcial**: `tron` matchea `tronos` sin necesidad de stemming.
- **Operador `%`** con índice GIN para queries rápidas: `WHERE titulo % 'jugos'`.

Lo que NO aporta:

- No entiende semántica. `jugos` matchea `tronos` con baja similitud pero algo de similitud — hay que poner umbral.
- Funciona peor con sinopsis largas porque diluye el score. Conviene aplicarlo solo a campos cortos (título, nombres del reparto).

### 2.3. Combinación de ambos

La estrategia más limpia es **híbrida con ranking unificado**: ambas búsquedas en paralelo, combinas los scores con pesos.

```sql
SELECT
  id, titulo, anno, tipo,
  ts_rank(search_vector, plainto_tsquery('spanish', $1)) AS fts_score,
  similarity(titulo, $1) AS trgm_score
FROM audiovisuales
WHERE
  search_vector @@ plainto_tsquery('spanish', $1)
  OR titulo % $1
ORDER BY
  GREATEST(
    ts_rank(search_vector, plainto_tsquery('spanish', $1)) * 0.7,
    similarity(titulo, $1) * 0.3
  ) DESC
LIMIT 50;
```

Los pesos `0.7 / 0.3` no son sagrados — se calibran observando resultados reales. El FTS gana cuando hay match exacto; el trigrama rescata cuando hay typo.

### 2.4. Búsqueda por código (caso especial)

**Importante**: la búsqueda por código (`P0023`, `S1122-3-10`) **no pasa ni por FTS ni por trigramas**. Es match exacto con prefijo jerárquico (ver §2.3 del documento funcional).

El backend debe detectar si la query es un código y rutear:

```typescript
const codePattern = /^[PS]\d{4}(-\d+)?(-\d+)?$/i;

if (codePattern.test(input.trim().toUpperCase())) {
  // Match exacto o prefijo en columna `code`
  // Ej: S1122 encuentra S1122, S1122-1, S1122-1-1, etc.
  return repo.query(`
    SELECT * FROM audiovisuales
    WHERE code = $1 OR code LIKE $1 || '-%'
    ORDER BY code
    LIMIT 50
  `, [input.trim().toUpperCase()]);
}

// Si no es código, va al buscador léxico
return searchLexical(input);
```

Esto es notablemente más rápido (índice B-tree directo) y predecible. Meterlo por FTS funcionaría pero rompería el ranking cuando un usuario busca exactamente por código.

---

## 3. Implementación

### 3.1. Schema y extensiones

Activar extensiones (Supabase las soporta nativamente):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- FTS viene de serie, no requiere extensión.
```

Columna `tsvector` generada (Postgres la mantiene automáticamente al insertar/actualizar):

```sql
ALTER TABLE audiovisuales
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('spanish', coalesce(titulo, '')), 'A') ||
  setweight(to_tsvector('spanish',
    coalesce(array_to_string(generos, ' '), '')), 'B') ||
  setweight(to_tsvector('spanish', coalesce(director, '')), 'B') ||
  setweight(to_tsvector('spanish',
    coalesce(array_to_string(reparto, ' '), '')), 'C') ||
  setweight(to_tsvector('spanish', coalesce(sinopsis, '')), 'D')
) STORED;
```

Pesos: `A > B > C > D`. Título es lo más fuerte, sinopsis lo más débil. Es lo razonable: si alguien busca "matrix" quiere *The Matrix*, no una peli random cuya sinopsis menciona "matrix de transformación".

### 3.2. Índices

```sql
-- Índice para FTS
CREATE INDEX audiovisuales_search_idx
  ON audiovisuales USING GIN(search_vector);

-- Índice para pg_trgm (solo en título, no en sinopsis)
CREATE INDEX audiovisuales_titulo_trgm_idx
  ON audiovisuales USING GIN (titulo gin_trgm_ops);

-- Índice para búsqueda por código
CREATE INDEX audiovisuales_code_idx ON audiovisuales(code);
```

GIN es lo apropiado para ambos: optimizado para lectura, levemente más lento en escritura — aceptable porque insertas audiovisuales raramente.

### 3.3. Sugerencias mientras se escribe

El requerimiento §6.4.1 del documento funcional pide search-as-you-type. Para esto:

- Lanzar la query con debounce de 200–300ms en el frontend (no en cada keystroke).
- Limitar a 5–8 resultados.
- Solo búsqueda por título (no sinopsis) para reducir ruido.
- Combinar FTS prefix match (`titulo:*`) + trigram con umbral alto (≥ 0.3 similarity).

```sql
SELECT id, titulo, tipo, anno
FROM audiovisuales
WHERE
  titulo ILIKE $1 || '%'
  OR titulo % $1
ORDER BY
  CASE WHEN titulo ILIKE $1 || '%' THEN 0 ELSE 1 END,
  similarity(titulo, $1) DESC
LIMIT 8;
```

Los matches por prefijo van primero porque son los que el usuario "espera ver" mientras escribe.

### 3.4. Rendimiento esperado

Con índices GIN en una tabla de hasta **~50.000 filas**, las queries devuelven en < 50ms en hardware modesto. Para el volumen razonable de un catálogo de audiovisuales (estimado: cientos a pocos miles de items), Postgres no se inmuta.

El cuello de botella no va a ser Postgres — va a ser la red entre el backend y la base, y el render de los resultados en el cliente.

---

## 4. Plan de migración a Meilisearch

### 4.1. Criterios concretos para migrar

No migrar "por las dudas". Migrar cuando uno o más de estos sea cierto:

| Señal | Umbral aproximado |
|---|---|
| Latencia p95 del buscador | > 300ms con índices correctos |
| Volumen de catálogo | > 50.000 audiovisuales |
| Queries con typos de 2+ letras que no resuelven | > 10% de las búsquedas |
| Necesidad de facetas complejas en Biblioteca | Filtros combinados que pesan en Postgres |
| Demanda de búsqueda en sinopsis con tolerancia a typos | Si esto se vuelve un caso frecuente |

Hasta que ninguno aplique, FTS+trgm sigue siendo la decisión correcta.

### 4.2. Cómo migrar sin reescribir todo

La clave para que esta migración sea barata es **aislar la búsqueda detrás de una interfaz** desde el día uno.

```typescript
// Definir una interfaz en el backend desde el inicio
interface SearchProvider {
  search(query: string, opts?: SearchOptions): Promise<SearchResult[]>;
  index(audiovisual: Audiovisual): Promise<void>;
  delete(id: string): Promise<void>;
}

// Implementación 1: Postgres
class PostgresSearchProvider implements SearchProvider { ... }

// Implementación 2: Meilisearch (cuando llegue el momento)
class MeilisearchProvider implements SearchProvider { ... }
```

El día que migres, cambias la implementación inyectada. El resto del backend no se entera.

### 4.3. Sincronización Postgres ↔ Meilisearch

Meilisearch no reemplaza Postgres. Es un índice paralelo. Postgres sigue siendo la fuente de verdad. Hay tres formas de mantenerlos en sync:

**Opción A — Doble escritura desde el backend.**
Cada vez que insertas/actualizas/borras un audiovisual, escribes en ambos. Simple, pero si Meili está caído, te quedas con datos inconsistentes.

**Opción B — CDC (Change Data Capture).**
Usar logical replication de Postgres para detectar cambios y propagarlos a Meili (vía Debezium, o un consumidor custom). Robusto pero requiere infraestructura adicional.

**Opción C — Job de reindexado periódico.**
Cada N minutos, un cron lee los audiovisuales modificados y los upsertea en Meili. Menos en tiempo real, mucho más simple. Para Dahem es probablemente suficiente — el catálogo cambia poco y un retraso de 5–10 minutos en que una película nueva aparezca en el buscador no es crítico.

Recomendación cuando migres: **Opción C**. Es la más simple y la que mejor encaja con la cadencia real de cambios en el catálogo.

---

## 5. Por qué NO se usa búsqueda vectorial

Esta es la sección que faltaría justificar a futuro yo mismo cuando reabras el doc en 6 meses pensando "¿por qué no metimos vectores?".

### 5.1. Costo computacional

La búsqueda vectorial parece "solo guardar floats" hasta que la operacionalizas. Implica:

- **Generar embeddings al indexar**: cada audiovisual nuevo o modificado tiene que pasar por un modelo de embeddings. Si lo haces local en batch, ok. Si lo necesitas online, necesitas un servicio corriendo 24/7.
- **Generar embeddings al consultar**: y esta es la trampa. Cada query del usuario tiene que pasar por el mismo modelo de embeddings antes de poder compararse contra los vectores guardados. **Esto exige tener un embedder accesible en producción**. No basta con generarlos en local desde tu PC.
- **CPU/GPU para el modelo de embeddings**: incluso un modelo modesto como `bge-m3` consume 300–600ms por query en CPU. Un VPS de 4–8GB de RAM corriendo Ollama de forma estable cuesta $10–20/mes — no es escandaloso, pero es costo y es complejidad permanente.
- **Storage**: vectores de 1024 dimensiones a 4 bytes cada uno = ~4KB por audiovisual. Manejable, pero no gratis, y crece linealmente.

Sumado: una pieza de infraestructura nueva (embedder server), costo recurrente, y un punto adicional de fallo en el camino crítico del buscador.

### 5.2. El caso de uso no lo justifica

El argumento real no es el costo computacional — Dahem podría asumirlo. El argumento es que **el caso de uso no lo necesita**.

Las queries reales esperables en Dahem se distribuyen así, aproximadamente:

- ~70% — el usuario sabe el título y lo teclea (con o sin typo). *Lo resuelve FTS+trgm perfecto.*
- ~20% — el usuario busca por código. *Lo resuelve match exacto.*
- ~10% — el usuario explora por filtros (género, año). *Lo resuelve la página Biblioteca, no el buscador.*
- **< 1%** — el usuario teclea una descripción libre tipo "una peli de terror que esté buena". *Esto es lo único que vectorial resolvería mejor.*

Invertir en una pieza de infraestructura entera para mejorar el <1% de las queries es mala asignación de esfuerzo. Y el <1% además se resuelve "suficientemente bien" con FTS si la query contiene palabras clave que matchean alguna sinopsis ("terror" en este caso).

### 5.3. Cuándo sí valdría reconsiderarla

No hay que cerrarse. Vectoriales tienen sentido si:

- Demanda real medida (no anticipada) de queries semánticas libres. Si las analytics muestran que los usuarios escriben en lenguaje natural y se frustran cuando no encuentran, la inversión cambia de signo.
- La sección de **Sugerencias** (§6.2.5 del funcional) evoluciona de "películas con mayor rating del mismo género" a "películas parecidas a esta". El "parecidas a esta" es donde los embeddings brillan — comparar el vector de la película actual contra el resto del catálogo. Es prácticamente trivial una vez tienes los vectores.
- El catálogo cruza idiomas significativamente (títulos en inglés + sinopsis en español + queries en ambos). FTS por configuración de idioma no maneja bien esto; los embeddings multilingües sí.

Si alguno de esos tres llega a ser real, la conversación se reabre. Hasta entonces, no.

### 5.4. Lo que NO es un buen argumento para meter vectores

- "Está de moda".
- "Lo tienen otros productos".
- "Self-hosted con Ollama suena cool".

Cualquier inversión técnica que no resuelva un problema medido o anticipado con evidencia es deuda futura disfrazada.

---

## 6. Resumen ejecutivo

| Pregunta | Respuesta |
|---|---|
| ¿Qué motor de búsqueda en fase inicial? | Postgres FTS + `pg_trgm` |
| ¿Y para búsqueda por código? | Match exacto / prefijo en columna `code` (no FTS) |
| ¿Infraestructura adicional necesaria? | Ninguna (todo dentro de Supabase) |
| ¿Cuándo migrar a Meilisearch? | Cuando se cumplan los criterios de §4.1 |
| ¿Cómo evitar reescribir al migrar? | Interfaz `SearchProvider` desde el día uno |
| ¿Búsqueda vectorial? | No por ahora. Reconsiderar bajo condiciones de §5.3 |