// Categorias de varejo do iValida (espelham o enum ProductCategory do backend).
import { productCategory } from './productCategory.js';

export const CATEGORIES = [
  { value: 'FOOD', label: 'Comidas', emoji: '🥫', tile: 'bg-orange-50', ring: 'ring-orange-300', text: 'text-orange-800' },
  { value: 'DRINKS', label: 'Bebidas', emoji: '🧃', tile: 'bg-sky-50', ring: 'ring-sky-300', text: 'text-sky-800' },
  { value: 'CLEANING', label: 'Limpeza', emoji: '🧼', tile: 'bg-violet-50', ring: 'ring-violet-300', text: 'text-violet-800' },
  { value: 'PETS', label: 'Pets', emoji: '🐶', tile: 'bg-amber-50', ring: 'ring-amber-300', text: 'text-amber-800' },
  { value: 'OTHER', label: 'Outros', emoji: '📦', tile: 'bg-lime-50', ring: 'ring-lime-300', text: 'text-lime-800' },
];

const BY_VALUE = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

export const categoryInfo = (value) => BY_VALUE[value] ?? BY_VALUE.OTHER;

/** Sugere a categoria pelo nome (o operador confirma ou troca com um toque). */
export function guessCategory(name) {
  switch (productCategory(name)) {
    case 'dairy':
    case 'bakery':
    case 'produce':
      return 'FOOD';
    case 'drinks':
      return 'DRINKS';
    case 'cleaning':
      return 'CLEANING';
    case 'pet':
      return 'PETS';
    default:
      return 'OTHER';
  }
}

/** Emoji do ladrilho sem foto. Em "Outros", ainda tenta um palpite pelo nome (💊 remédio). */
export function fallbackEmoji(category, name) {
  if (category && category !== 'OTHER') return categoryInfo(category).emoji;
  return productCategory(name) === 'pharmacy' ? '💊' : categoryInfo('OTHER').emoji;
}
