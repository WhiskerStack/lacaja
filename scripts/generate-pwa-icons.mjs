import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const FAVICON = resolve(ROOT, 'public/favicon.svg');
const OUT_DIR = resolve(ROOT, 'public/icons');

// Color de fondo tomado de tu config de PWA (backgroundColor y themeColor)
const BACKGROUND_COLOR = '#0b0f17';
// Porcentaje del icono dentro del área segura para maskable (Android corta el 20% exterior)
const MASKABLE_SAFE_ZONE = 0.6; // 60%

async function generate() {
  mkdirSync(OUT_DIR, { recursive: true });

  // 1. Generar iconos normales (purpose: 'any')
  const sizes = [192, 512];
  for (const size of sizes) {
    const out = resolve(OUT_DIR, `icon-${size}.png`);
    
    // Creamos un fondo cuadrado sólido
    const background = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BACKGROUND_COLOR
      }
    }).png().toBuffer();

    // Redimensionamos el logo original (claqueta)
    const logo = await sharp(FAVICON)
      .resize(size, size)
      .png()
      .toBuffer();

    // Unimos el fondo con el logo centrado
    await sharp(background)
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toFile(out);
      
    console.log(`✅ Generado ${out}`);
  }

  // 2. Generar icono Maskable (512x512) 
  // Este es el que estaba fallando en tu captura.
  const maskable = resolve(OUT_DIR, 'icon-512-maskable.png');
  const maskableSize = 512;
  
  const maskableBackground = await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: BACKGROUND_COLOR
    }
  }).png().toBuffer();

  // Reducimos la claqueta al 60% del tamaño total para que entre en la zona segura
  const maskableLogo = await sharp(FAVICON)
    .resize(Math.round(maskableSize * MASKABLE_SAFE_ZONE), Math.round(maskableSize * MASKABLE_SAFE_ZONE))
    .png()
    .toBuffer();

  await sharp(maskableBackground)
    .composite([{ input: maskableLogo, gravity: 'center' }])
    .png()
    .toFile(maskable);

  console.log(`✅ Generado ${maskable}`);
}

generate().catch((err) => {
  console.error('❌ Error generando iconos PWA:', err);
  process.exit(1);
});