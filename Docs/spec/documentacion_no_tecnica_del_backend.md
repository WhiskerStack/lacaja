# Dahem — Backend (documentación funcional)

> Documento no técnico que describe qué hace el backend y por qué, sin entrar en cómo está construido.
> El "cómo" (stack, endpoints, despliegue) vive en `dahem_backend.md` y los documentos técnicos.
> Fuente: `documentacion_no_tecnica_de_la_landing_page.md`, `documentacion_no_tecnica_del_panel_admin.md`, `documentacion_del_dominio_y_el_modelo_de_datos.md`.

---

## 1. Qué es el backend, en una frase

Es el **cerebro invisible** de Dahem: la parte que nadie ve pero que guarda toda la información, aplica las reglas del negocio y conecta las dos caras visibles del sistema — la web pública (landing) y el panel del vendedor (admin).

Ni el cliente ni el vendedor interactúan con él directamente. El cliente usa la web; el vendedor usa el panel; ambos, por detrás, hablan con el backend.

---

## 2. Por qué existe (si la web es solo un catálogo)

La web pública es un **catálogo de solo lectura**: se genera como páginas fijas y el cliente solo las consulta. Para *leer* el catálogo no haría falta un backend en vivo. Entonces, ¿por qué existe?

Porque hay cosas que **sí requieren guardar o procesar información en el momento**, y eso no lo puede hacer una página fija:

- Cuando el vendedor **agrega o edita** contenido en el panel, alguien tiene que guardarlo.
- Cuando un cliente **se registra o envía su lista por la web**, alguien tiene que recibirlo y guardarlo.
- Cuando un cliente **solicita** contenido que no existe, alguien tiene que registrarlo.
- Cuando el vendedor pulsa **Publicar**, alguien tiene que **regenerar** la web con los cambios.

El backend es ese "alguien" en todos los casos. Regla simple para entenderlo: **leer el catálogo no pasa por el backend; escribir o cambiar cualquier cosa, sí.**

---

## 3. Responsabilidades

### 3.1. Guardar el catálogo

Todo lo que el vendedor crea en el panel —audiovisuales, temporadas, capítulos, géneros, reparto, trailers, tarifas— se guarda y se custodia en el backend. Es la **fuente de verdad** del inventario. La web pública no es más que una "foto" de este catálogo en un momento dado (ver §3.5).

### 3.2. Cuentas de clientes

Cuando un cliente se registra para enviar su lista por la web, el backend guarda su cuenta (nombre, apellidos, y un correo o teléfono) y reconoce su sesión cuando vuelve. Esto permite que su lista lo siga entre dispositivos.

> El cliente solo necesita cuenta para enviar por la web. Para las otras vías (WhatsApp, TXT, copiar) no hace falta, y el backend no interviene.

### 3.3. Recibir envíos de listas por la web

Cuando un cliente con cuenta envía su lista "por la web", el backend la recibe y la **congela**: guarda exactamente qué pidió, cuánto pesaba y a qué precio, junto con un **código de envío** corto. Ese código y los datos congelados son los que el vendedor verá en el panel para atender al cliente en el encuentro presencial.

Que quede congelado importa: aunque después cambie el catálogo o suban las tarifas, el envío sigue mostrando lo que el cliente pidió ese día.

### 3.4. Registrar solicitudes de contenido

Cuando un cliente busca algo que no está y lo solicita, el backend guarda esa solicitud asociada a su cuenta, con un estado que el vendedor puede ir actualizando (pendiente → disponible → avisado).

### 3.5. Regenerar la web pública

Esta es la responsabilidad más particular. La web pública no se actualiza sola cuando el vendedor cambia algo: es un conjunto de páginas fijas. Cuando el vendedor pulsa **Publicar** en el panel, el backend toma el catálogo actual y **vuelve a generar** todas las páginas de la web, ya con los cambios. Hasta que eso ocurre, el público sigue viendo la versión anterior.

El backend también puede hacer esta regeneración **de forma automática y programada** (por ejemplo, de madrugada), para recoger cambios sin que nadie tenga que pulsar el botón.

### 3.6. Responder búsquedas cuando hace falta

La búsqueda del catálogo ocurre normalmente dentro del navegador del cliente, sin backend. Pero en el primer instante —mientras el navegador aún no ha terminado de cargar lo que necesita para buscar por su cuenta— el backend puede responder búsquedas como apoyo temporal, para que el cliente no espere.

---

## 4. Cómo se relaciona con las dos caras visibles

### 4.1. Con la web pública (landing)

- **Lectura del catálogo:** no pasa por el backend en vivo; el cliente lee las páginas ya generadas. El backend influyó antes, al generarlas.
- **Escritura:** registro de cuenta, envío de lista por la web y solicitudes de contenido sí van al backend en el momento.

### 4.2. Con el panel admin

- **Todo** lo que el vendedor hace en el panel pasa por el backend: crear y editar catálogo, ver envíos, atender solicitudes, ajustar tarifas, gestionar cuentas de administrador.
- El botón **Publicar** del panel le ordena al backend regenerar la web.

> El panel es una "ventana" sobre el backend: por sí mismo no guarda nada; solo muestra y pide cambios que el backend ejecuta y custodia.

---

## 5. Reglas de negocio que el backend hace cumplir

El backend no solo guarda datos; también vela por que se respeten las reglas del negocio, independientemente de lo que envíe la web o el panel:

- **Una vía de contacto obligatoria:** un cliente debe tener al menos un correo o un teléfono.
- **Códigos coherentes:** cada audiovisual y cada nivel (temporada, capítulo) tiene su código según las reglas del negocio.
- **Envíos congelados:** un envío guarda los datos del momento y no cambia aunque el catálogo cambie después.
- **Tarifas configurables:** los precios (normal y estreno) se leen de donde el vendedor los configura, no están fijos.
- **Primer administrador:** la primera vez que se usa el panel, se crea la cuenta inicial del vendedor; después, las cuentas nuevas se crean desde dentro.

---

## 6. Qué NO hace el backend

- **No reproduce ni entrega contenido audiovisual.** El negocio es presencial; el backend solo administra información sobre el catálogo, no el contenido en sí.
- **No cobra ni procesa pagos.** El pago ocurre en persona.
- **No recibe las listas enviadas por WhatsApp, TXT o copiar.** Esas vías existen para no obligar al cliente a registrarse, y llegan al vendedor por fuera del sistema. El backend solo conoce los envíos hechos "por la web".
- **No sirve la web pública en vivo.** Genera las páginas y las deja listas; servirlas al público es otra pieza.

---

## 7. Una analogía para no técnicos

Piensa en una **tienda con vitrina a la calle**:

- La **vitrina** (web pública) muestra los productos. La gente mira sin entrar. La vitrina se arma una vez y queda fija hasta que alguien la rehace.
- La **trastienda** (backend) es donde está todo el inventario real, el cuaderno de pedidos y las reglas del negocio. El público nunca entra ahí.
- El **vendedor** usa una puerta interna (el panel) para tocar el inventario de la trastienda y, cuando quiere, **rehacer la vitrina** para que muestre lo nuevo.
- Cuando un cliente deja un **pedido por la web**, queda anotado en el cuaderno de la trastienda con un número (el código de envío) para encontrarlo cuando venga a recogerlo.

El backend es la trastienda: invisible desde la calle, pero sin ella no hay tienda.

---

## 8. Documentos relacionados

- **Web pública / landing (funcional):** `documentacion_no_tecnica_de_la_landing_page.md`.
- **Panel admin (funcional):** `documentacion_no_tecnica_del_panel_admin.md`.
- **Dominio y modelo de datos:** `documentacion_del_dominio_y_el_modelo_de_datos.md`.
- **Backend (técnico):** `dahem_backend.md`.