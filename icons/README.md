# Iconos PWA

Coloca aquí los iconos referenciados por el manifest (`astro.config.mjs`):

- `icon-192.png` — 192×192
- `icon-512.png` — 512×512
- `icon-512-maskable.png` — 512×512, `purpose: maskable` (con safe-area)

Son placeholders hasta tener el arte final (inspiración EPIX PLAY, tema oscuro cinematográfico,
`theme-color` #0b0f17). El build no falla por su ausencia, pero la instalación PWA en Android
necesita al menos el de 192 y 512. Generarlos desde el logotipo cuando esté disponible.
