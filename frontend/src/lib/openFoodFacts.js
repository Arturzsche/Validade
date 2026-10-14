// Busca nome/marca/foto pelo EAN na base pública Open Food Facts.
// É só um "atalho": se falhar ou demorar, o fluxo segue normalmente sem foto.

const cache = new Map();
const TIMEOUT_MS = 2500;
const FIELDS = 'product_name_pt,product_name,brands,image_front_small_url,image_front_url';

export async function lookupOpenFoodFacts(barcode) {
  if (cache.has(barcode)) return cache.get(barcode);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${FIELDS}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(String(res.status));
    const { product, status } = await res.json();
    const image = product?.image_front_small_url || product?.image_front_url || '';
    const info =
      status === 1 && product
        ? {
            name: (product.product_name_pt || product.product_name || '').trim().slice(0, 120) || null,
            brand: product.brands?.split(',')[0]?.trim().slice(0, 60) || null,
            imageUrl: image.startsWith('https://') ? image : null, // a API só aceita https
          }
        : null;
    cache.set(barcode, info);
    return info;
  } catch {
    return null; // offline, timeout, bloqueio de rede: sem foto, sem problema
  } finally {
    clearTimeout(timer);
  }
}
