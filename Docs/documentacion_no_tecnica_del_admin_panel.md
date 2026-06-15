# Dahem — Panel admin (documentación funcional)

> Documento no técnico que describe el panel de administración del vendedor. Aplicación aparte del catálogo público.
> Fuente: `documentacion_no_tecnica_de_la_landing_page.md` y `documentacion_del_dominio_y_el_modelo_de_datos.md`.

---

## 1. Qué es y para quién

El panel admin es la herramienta interna del negocio Dahem. **No es público**: vive en una URL separada del catálogo y requiere iniciar sesión. Lo usan el vendedor y, a lo sumo, 2 o 3 personas de confianza.

Tiene cuatro trabajos:

1. **Gestionar el catálogo** que alimenta la web pública (agregar, editar, quitar audiovisuales y sus temporadas/capítulos).
2. **Publicar** los cambios para que aparezcan en la web.
3. **Atender los envíos de listas hechos por la web** y localizarlos en el encuentro presencial.
4. **Atender solicitudes** de contenido que el usuario no encontró, y avisarle cuando llegue.

El panel **no reproduce ni vende contenido**, igual que la web pública. Solo administra información.

### 1.1. Qué queda explícitamente fuera

- **Listas enviadas por WhatsApp, TXT o portapapeles.** Esas vías existen para que el usuario no tenga que registrarse (documento funcional §4.1). Por diseño, esas listas **no entran al sistema**: le llegan al vendedor por fuera (su WhatsApp personal, un archivo, un mensaje). El panel solo ve los envíos hechos *por la web*.
  > Implicación a tener presente: el panel refleja una parte de la demanda, no toda. La mayoría de pedidos probablemente sigan llegando por WhatsApp y se atiendan fuera del panel. Es una decisión deliberada, no una carencia.
- **Reproducción o descarga de audiovisuales.** El negocio es presencial.
- **Cobros en línea.** El precio se calcula y se muestra; el pago ocurre presencialmente.

---

## 2. Acceso y cuentas

### 2.1. Primer arranque (bootstrap)

La primera vez que alguien entra al panel y no existe ninguna cuenta, el sistema pide crear la **cuenta inicial**: datos del primer administrador. No hay registro abierto al público; esta pantalla aparece una sola vez, mientras no exista ningún usuario.

### 2.2. Crear más usuarios

Ya dentro del panel, un administrador puede crear otras cuentas de administrador. No hay invitación por correo ni flujo externo: el usuario se crea desde dentro y se le entregan sus credenciales.

### 2.3. Roles

**No hay roles diferenciados.** Todas las cuentas son administrador con los mismos permisos. Se asume un equipo pequeño (2-3 personas) de plena confianza, así que la complejidad de permisos no se justifica.

### 2.4. Inicio de sesión

- Login con usuario y contraseña.
- Mientras no haya sesión, ninguna pantalla del panel es accesible.

---

## 3. Estructura del panel

Secciones principales, accesibles desde una navegación lateral o superior:

- **Catálogo** — el inventario (§4).
- **Envíos** — listas recibidas por la web (§5).
- **Solicitudes** — pedidos de contenido no disponible (§6).
- **Tarifas** — precios configurables (§7).
- **Publicar** — botón/acción para llevar los cambios a la web (§8).
- **Usuarios** — gestión de cuentas de administrador (§2.2).

---

## 4. Gestión del catálogo

El corazón del panel. Aquí se mantiene todo lo que la web pública muestra.

### 4.1. Lista de audiovisuales

- Listado de todos los audiovisuales con búsqueda y filtros (por tipo, género, etc.).
- Cada fila muestra al menos: nombre, tipo, año, código, si es estreno, y si está publicado o tiene cambios sin publicar.
- Acciones: crear, editar, quitar.

### 4.2. Crear / editar un audiovisual

Formulario con los datos del modelo:

- **Nombre, tipo** (película, serie, novela, show, anime), **año, rating, descripción**.
- **Estreno** (sí/no) — afecta el precio (§7).
- **Imagen** — se indica el origen de la imagen; el sistema la procesa al publicar.
- **Género, región, idioma** — se eligen de catálogos existentes (§4.4).
- **Reparto** — lista de nombres de actores principales.
- **Trailers** — opcional; cero o varios enlaces de YouTube.
- **Peso (GB)** — solo para películas/contenido no episódico. En contenido episódico el peso vive en cada temporada/capítulo (§4.3).

El **código** (`P0023`, `S1122`...) se genera a partir del tipo y el id; no se teclea a mano.

### 4.3. Contenido episódico: temporadas y capítulos

Cuando el tipo es episódico (serie, novela, show, anime), el audiovisual tiene una estructura de **temporadas**, y cada temporada tiene **capítulos**:

- Agregar/editar/quitar temporadas (número, peso en GB).
- Dentro de cada temporada, agregar/editar/quitar capítulos (número, peso en GB, duración).
- El código de cada nivel se deriva solo: serie `S1122`, temporada `S1122-3`, capítulo `S1122-3-10`.

La razón: el usuario en la web puede agregar a su lista la serie completa, una temporada o un capítulo suelto, y cada nivel necesita su propio peso para calcular totales.

### 4.4. Catálogos auxiliares (género, región, idioma)

- Pantallas simples para mantener las listas de **géneros, regiones e idiomas**.
- Sirven para que los filtros de la Biblioteca pública sean consistentes (evitar "Sci-Fi" y "Ciencia ficción" como dos cosas distintas).
- Acciones: crear, renombrar, quitar (con aviso si está en uso).

### 4.5. Reparto

- Los actores se gestionan como nombres reutilizables: un mismo actor puede asociarse a varios audiovisuales.
- Al editar un audiovisual se eligen o agregan nombres de su reparto.

---

## 5. Envíos (listas recibidas por la web)

Aquí llegan **solo** las listas que el usuario envió usando la opción "Enviar por la web" (que requiere cuenta).

### 5.1. Listado de envíos

- Lista de envíos recibidos, ordenada por fecha (más reciente primero).
- Cada envío muestra: **código de envío**, nombre del usuario, vía de contacto, fecha, total en GB y precio total.

### 5.2. Identificación en el encuentro presencial

Cuando el cliente llega presencialmente, el vendedor lo localiza de **dos formas** (cualquiera sirve):

1. **Por código de envío**: el usuario presenta el código corto que la web le mostró al enviar (ej. lo tiene en pantalla o anotado). El vendedor lo teclea y encuentra el envío exacto. Es la vía inequívoca: aunque haya dos clientes con el mismo nombre, el código es único.
2. **Por nombre o vía de contacto**: el vendedor busca por nombre, apellido, correo o teléfono. Útil si el cliente no trae el código.

> El código de envío (`submission_code`) se agregó al modelo de datos para esto. Ver `documentacion_del_dominio_y_el_modelo_de_datos.md`.

### 5.3. Detalle de un envío

- Muestra la lista completa tal como se envió: cada ítem con su código, nombre, peso y precio, más los totales.
- Los datos son un **snapshot**: reflejan lo que el usuario pidió en el momento del envío, aunque el catálogo o las tarifas hayan cambiado después.
- Desde aquí el vendedor lee los códigos y copia el contenido al cliente.

---

## 6. Solicitudes de contenido no disponible

Cuando un usuario busca algo que no está y usa el enlace "Solicítala y estará disponible en unos días" (documento funcional §6.4.3), queda registrada una solicitud asociada a su cuenta.

### 6.1. Listado de solicitudes

- Lista de solicitudes con: texto que buscó el usuario, nombre y contacto del solicitante, fecha, y **estado**.
- Estados: **pendiente** (recién llegada), **disponible** (el contenido ya se agregó al catálogo), **avisado** (ya se le notificó al usuario).

### 6.2. Flujo de atención

1. El vendedor ve la solicitud pendiente.
2. Si decide conseguir el contenido, lo agrega al catálogo (§4) y marca la solicitud como **disponible**.
3. Avisa al usuario **por WhatsApp** (el panel facilita el contacto; el mensaje se manda por WhatsApp como en el resto del negocio) y marca como **avisado**.

> El aviso por WhatsApp es manual o semiasistido: el panel muestra el contacto y puede preparar el mensaje, pero el canal sigue siendo WhatsApp, coherente con el resto de Dahem.

---

## 7. Tarifas (pricing)

Los precios no están fijos en el código; se administran aquí (documento funcional §8.3).

- Dos valores configurables: **audiovisual normal** y **estreno**.
- Moneda: **CUP**.
- Valores iniciales de referencia: normal $10, estreno $20.
- Al cambiar una tarifa y publicar, la web recalcula los precios mostrados.

> El precio se aplica por unidad agregada a la lista (película, serie, temporada o capítulo), según el documento funcional §8.1.

---

## 8. Publicar cambios

La web pública es estática: lo que el admin edita **no aparece al instante**. Hay un paso explícito de publicación.

### 8.1. Cómo funciona (a nivel de usuario)

- Tras editar el catálogo o las tarifas, los cambios quedan en estado "sin publicar".
- El administrador pulsa **Publicar**.
- El sistema regenera la web con los cambios. Tarda un poco (no es instantáneo); el panel muestra el progreso o el resultado.
- Cuando termina, la web pública refleja los cambios.

### 8.2. Por qué hay un paso de publicar

Permite preparar varios cambios y publicarlos juntos, en vez de regenerar la web con cada pequeña edición. También da un punto de control: nada llega al público sin que alguien lo decida.

> Existe además una publicación automática programada (de madrugada) descrita en la documentación técnica; el botón Publicar es la vía manual para cambios urgentes.

---

## 9. Supuestos de este documento

Decisiones tomadas donde los documentos previos no especificaban. Marcadas para poder revisarlas:

1. **Identificación del cliente: código de envío + nombre/contacto, ambas.** Se agregó `submission_code` al modelo de datos.
2. **Alcance: solo envíos por web.** WhatsApp/TXT/copiar quedan fuera del sistema por diseño, para no obligar al usuario a registrarse. No hay registro manual de pedidos externos en el panel.
3. **Autenticación: bootstrap del primer usuario, creación de más usuarios desde dentro, rol único admin.** Sin jerarquía de permisos (equipo de 2-3 personas).
4. **Aviso al usuario por WhatsApp**, semiasistido desde el panel, coherente con el resto del negocio.

---

## 10. Documentos relacionados

- **Catálogo público / landing**: `documentacion_no_tecnica_de_la_landing_page.md`.
- **Dominio y modelo de datos**: `documentacion_del_dominio_y_el_modelo_de_datos.md`.
- **Monitoreo y observabilidad del panel**: pendiente, documento aparte.
- **Documento técnico**: stack, arquitectura, despliegue.