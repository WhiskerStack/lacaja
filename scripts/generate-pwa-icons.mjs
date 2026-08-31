import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const FAVICON = resolve(ROOT, 'public/favicon.svg');
const OUT_DIR = resolve(ROOT, 'public/icons');

async function generate() {
  mkdirSync(OUT_DIR, { recursive: true });
  const sizes = [192, 512];
  for (const size of sizes) {
    const out = resolve(OUT_DIR, `icon-${size}.png`);
    await sharp(FAVICON)
      .resize(size, size)
      .png()
      .toFile(out);
    console.log(`✅ Generado ${out}`);
  }
  // Icono maskable (misma imagen)
  const maskable = resolve(OUT_DIR, 'icon-512-maskable.png');
  await sharp(FAVICON)
    .resize(512, 512)
    .png()
    .toFile(maskable);
  console.log(`✅ Generado ${maskable}`);
}

generate().catch((err) => {
  console.error('❌ Error generando iconos PWA:', err);
  process.exit(1);
});