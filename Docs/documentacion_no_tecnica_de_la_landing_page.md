# Daher — Documentación funcional

> Documento no técnico que describe el producto. Se usa como contexto para IA al generar el proyecto base.

---

## 1. Resumen del negocio

Daher vende contenido audiovisual de forma **presencial** en Cuba (películas, series, novelas, shows, animes — en adelante "audiovisuales").

Esta web **no vende ni reproduce contenido**. Es un catálogo de consulta. Su función es:

1. Mostrar el inventario disponible actualmente, incluyendo estrenos.
2. Permitir al usuario armar una lista con lo que desea ver.
3. Calcular total en GB, precio total, y compararlo contra el espacio disponible del usuario.
4. Enviar esa lista al negocio por distintos canales.
5. Coordinar la entrega presencial, donde el negocio identifica al usuario y le copia lo solicitado.

El sistema **existe principalmente por comodidad del vendedor**: facilita localizar la selección del cliente. El usuario no necesita cuenta para usar la web; solo necesita cuenta si quiere enviar su lista por la propia web.

Diseño primario: **mobile-first**. Hay versión responsive para desktop con diferencias específicas señaladas en cada sección.

Inspiración visual: **EPIX PLAY**.

---

## 2. Códigos de identificación de audiovisuales

Cada audiovisual tiene un código corto, fácil de leer y generar, que sirve para localizarlo y copiarlo rápidamente en el momento del encuentro presencial.

### 2.1. Formato

```
(tipo)(id)-(temporada)-(capítulo)
```

- **tipo**: letra inicial (`P` = película, `S` = serie, etc.).
- **id**: identificador numérico.
- **temporada** y **capítulo**: solo aplican a contenido episódico.

### 2.2. Ejemplos

| Solicitud | Código |
|---|---|
| Película *El Gigante de Hierro* | `P0023` |
| Serie *Juego de Tronos* completa | `S1122` |
| Temporada 3 completa de esa serie | `S1122-3` |
| Capítulo 10 de la temporada 3 | `S1122-3-10` |

### 2.3. Implicación para la búsqueda

El formato permite que buscar por código funcione como filtro jerárquico: cuanto más específico el código, más estrecho el resultado.

---

## 3. Flujo general del usuario

1. Entra a la web (sin necesidad de cuenta).
2. Explora desde Home, Biblioteca o Buscador.
3. Selecciona contenido que le interesa → entra a su detalle.
4. Lo añade a su lista (drawer "Mi lista").
5. Revisa la lista: total GB, precio total, y opcionalmente compara contra el espacio disponible que él mismo declara.
6. Envía la lista al negocio:
   - Desde la propia web (requiere cuenta — registro o login mediante modal sin salir de la vista).
   - Por WhatsApp.
   - Exportada a TXT.
   - Copiada al portapapeles.
7. En el encuentro presencial, el negocio busca al usuario desde el admin (descrito en otro documento) y entrega lo solicitado.

---

## 4. Cuenta de usuario

### 4.1. Cuándo se requiere

Solo cuando el usuario quiere **enviar la lista directamente por la web**. Para las otras tres vías (WhatsApp, TXT, copiar) **no se requiere cuenta**.

### 4.2. Registro

Datos mínimos:

- Nombre.
- Apellidos.
- Vía de contacto: correo o teléfono (uno de los dos basta).

### 4.3. Modal de login/registro

- Se invoca desde el ícono de usuario en el navbar.
- Se invoca también desde el botón de envío en "Mi lista" cuando el usuario elige la opción "Enviar por la web" sin tener sesión.
- En ambos casos, **no se navega fuera de la vista actual**: el modal aparece encima.

---

## 5. Componentes compartidos

### 5.1. Navbar

Visible en **todas las páginas**, incluso al hacer scroll.

- **Extremo izquierdo**: logo y nombre de la app.
- **Extremo derecho**:
  - Ícono de usuario. Cuando hay sesión iniciada, muestra la inicial del usuario con un color de fondo.
  - Botón / ícono de **Mi lista** (drawer).
- **En desktop**: además incorpora las opciones de navegación que en móvil viven en la botonera inferior.

### 5.2. Botonera inferior

- **Solo visible en móvil**. En desktop no aparece porque sus opciones se integran al navbar.
- Permite navegar entre las páginas principales y acceder al buscador.

---

## 6. Páginas

### 6.1. Home

Compuesta por dos secciones, una debajo de la otra. Las divisiones son conceptuales, no necesariamente visibles.

#### 6.1.1. Sección inicial / Carátula

- Carrusel a ancho completo (`100vw`) con los 5 últimos estrenos (o las 5 mejores).
- Cada slide muestra: nombre, nota, año y descripción breve.
- Si la descripción no entra (especialmente en móvil), truncar con `...` al final.
- La composición visual debe estar bien balanceada.

#### 6.1.2. Sección de recomendados

- Recomendaciones agrupadas por clasificación: **estrenos**, **mejor votadas**.
- Cada clasificación se divide por género: **shows, películas, series, animes, novelas, show**.
- Formato: carrusel lateral donde se ven aproximadamente **3 items en pantalla a la vez**.

---

### 6.2. Detalle de audiovisual (película)

Al tocar un audiovisual desde cualquier listado se entra a esta vista.

#### 6.2.1. Cambios de chrome (solo móvil)

- El navbar **desaparece**.
- Aparecen dos botones flotantes en los extremos laterales:
  - Izquierda: volver atrás.
  - Derecha: compartir.

#### 6.2.2. Sección principal (hero)

Foto de fondo a pantalla completa con la siguiente información sobrepuesta:

- Nombre.
- Género.
- Duración.
- Rating / nota.
- Peso (cuánto ocupa en GB).
- Descripción. Si excede, truncar con `... más`; al tocar, expande.
- Botón **"Agregar a Mi lista"**.

#### 6.2.3. Trailers

- Solo si existen. Si no hay, omitir la sección por completo.
- Formato: carrusel lateral de videos.
- **Origen**: YouTube embed, usando `lite-youtube-embed` (Paul Irish) o su variante con Shadow DOM (`@justinribeiro/lite-youtube`) para reducir peso y mejorar tiempos de carga frente al iframe oficial. La elección de la variante se decide en la fase técnica.

#### 6.2.4. Reparto

- Lista con los nombres de los actores principales, solamente los nombres de los actores

#### 6.2.5. Sugerencias

- Carrusel lateral.
- Lógica: películas con mayor rating del mismo género.

#### 6.2.6. Capítulos (solo si es episodico)

- Aparece debajo de la sección principal.
- Relaciona con capítulos anteriores y siguientes.
- *Nota: si el usuario entró desde la vista de episodico como un todo, esta sección actúa diferente; ver §6.3.*

---

### 6.3. Detalle de audiovisual episódico (serie, novela, show)

Estructura **muy parecida a §6.2**, con dos diferencias:

#### 6.3.1. Botón "Agregar a Mi lista"

Genera el código según el nivel en el que se encuentre el usuario:

- Serie completa → código tipo `S1122`.
- Temporada específica → `S1122-3`.
- Capítulo específico → `S1122-3-10`.

#### 6.3.2. Navegación a temporadas y capítulos

- Reemplaza a la sección "Capítulos" descrita en §6.2.6.
- Es un sistema de navegación rápido para acceder a una temporada específica o a un capítulo específico.

---

### 6.4. Buscar

Página dedicada al buscador.

#### 6.4.1. Buscador

- Input de búsqueda en la parte superior.
- Mientras se escribe, sugiere audiovisuales que ya existen en el catálogo.
- Búsqueda avanzada (la implementación específica se aborda en el documento técnico).
- Búsqueda por código (ver §2.3).

#### 6.4.2. Resultados

- Listado vertical con scroll infinito.
- Cada item muestra: foto, nombre, clasificación (película, serie, etc.), año.
- Para contenido episódico: **solo aparece el item completo**, no temporadas ni capítulos individuales. El usuario navega desde el detalle si quiere granularidad.
  - Alternativa a evaluar: mostrar el nivel específico si el usuario lo pide explícitamente en la búsqueda.

#### 6.4.3. Solicitud de contenido no disponible

Después del buscar resultados resultados, entre el buscador y el listado poner un enlace tipo:

> "¿No encontraste lo que buscabas? Solicítala y estará disponible en unos días."

**Flujo**:

1. El usuario toca el enlace.
2. Si no tiene sesión, aparece el modal de login/registro descrito en §4.3 (sin salir de la vista).
3. Una vez con sesión, se registra la solicitud asociada a su cuenta.
4. Cuando el contenido esté disponible, el admin (otro documento) le envía un mensaje por WhatsApp con la novedad.

---

### 6.5. Biblioteca

Página de exploración por **filtrado**, no por búsqueda libre.

#### 6.5.1. Layout

- Grid de 3 columnas con scroll infinito.
- Cada item: foto, nombre (truncar con `...` si es largo), año de salida.

#### 6.5.2. Controles superiores

- **Clasificaciones rápidas (chips horizontales)**: todos, películas, series, animes, novelas, shows. Es el tipo de filtro más frecuente, así que va afuera para acceso de un toque.
- Botón **Filtrar**: abre un panel con filtros menos frecuentes (año, género, región, idioma, etc.). Botones **Aplicar** y **Resetear**.
- **Ordenar por...**: ordenamiento por distintos parámetros.

---

## 7. Mi lista (drawer)

### 7.1. Forma

- **Drawer lateral** que se abre desde el navbar.
- Permanece accesible desde cualquier página.

### 7.2. Contenido permanente

- Lista de items agregados, con miniatura, nombre, código, peso (GB) y precio individual.
- Acción **Quitar** en cada item.
  - Al quitar, aparece un *toast con "Deshacer"* durante ~7 segundos. Mantiene la lista limpia sin perder la posibilidad de revertir.
- **Totales** siempre visibles: GB totales, precio total.

### 7.3. Comparación contra espacio disponible (opcional)

- Input dentro del drawer donde el usuario declara cuánto espacio tiene disponible.
- Una vez declarado, la UI compara el total de la lista contra ese espacio y muestra si cabe o cuánto se pasa.
- Persistente para esa sesión: no hace falta volverlo a teclear cada vez.

### 7.4. Envío

- Botón **"Enviar lista"** abajo del drawer.
- Al tocarlo, abre un modal con las cuatro vías de envío:
  1. **Enviar por la web** (requiere cuenta — si no hay sesión, abre el modal de §4.3).
  2. **WhatsApp** (genera un mensaje pre-formateado y abre `wa.me`).
  3. **Exportar a TXT** (descarga un archivo).
  4. **Copiar al portapapeles**.

### 7.5. Persistencia

La fuente de verdad en el cliente es siempre el almacenamiento local del navegador; la cuenta es un espejo opcional cuando hay sesión y red.

- **Sin sesión**: la lista vive solo en el almacenamiento local del dispositivo.
- **Con sesión**: la lista del dispositivo se sincroniza con la cuenta cuando hay red, de modo que el usuario la recupera desde otro dispositivo.
- **De anónimo a registrado**: si el usuario arma la lista sin cuenta y luego se registra, la lista local se fusiona (merge) con la de la cuenta. Estrategia de merge: unión de items, conservando cantidades/preferencias locales si hay conflicto.

> **Nota de implementación (ver documento técnico).** El mecanismo de almacenamiento local evoluciona por fases: el MVP arranca con `localStorage` simple y migra a Dexie.js sobre IndexedDB para el modo offline-first. Este documento describe el comportamiento esperado, no la tecnología final de almacenamiento; esa decisión y su calendario viven en la guía técnica (§6 y §10).

---

## 8. Pricing

### 8.1. Modelo

Precio **por audiovisual** (por película, por serie, por temporada o por capítulo — la unidad es lo que el usuario agrega a la lista).

### 8.2. Valores iniciales

- Audiovisual normal: **$10**.
- Estreno: **$20**.
- Moneda: CUP

### 8.3. Configurabilidad

Los valores deben ser configurables a futuro (no hardcodeados). Probable: un endpoint o tabla de configuración leída por el frontend al cargar.

---

## 9. Documentos relacionados (fuera de este archivo)

- **Admin** (panel del vendedor): aplicación aparte, documentada por separado.
- **Búsqueda avanzada / vectorial**: implementación técnica, documentada por separado.
- **Documento técnico**: stack, arquitectura, despliegue, etc.