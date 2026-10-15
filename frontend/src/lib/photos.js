import { API_BASE_URL } from './api.js';

/** URL pública e versionada da foto tirada no celular (ou null). */
export function productPhotoUrl(product) {
  if (!product?.id || !product.photoVersion) return null;
  return `${API_BASE_URL}/public/product-photos/${product.id}?v=${product.photoVersion}`;
}

/**
 * Reduz a foto no próprio celular antes de enviar (câmeras geram 3–12 MB):
 * lado maior até `maxSide` px, JPEG. Respeita a orientação EXIF (foto "deitada").
 */
export async function compressImage(file, { maxSide = 640, quality = 0.8 } = {}) {
  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    source = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Não foi possível ler a foto'));
      img.src = URL.createObjectURL(file);
    });
  }
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível processar a foto'))), 'image/jpeg', quality),
  );
}
