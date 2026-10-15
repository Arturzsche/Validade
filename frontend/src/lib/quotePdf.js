// Gera e baixa o PDF do orçamento. A biblioteca de PDF (~1 MB) só é baixada no primeiro clique.
import { createElement } from 'react';
import { quoteNumber } from './quotes.js';

const slug = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

export async function downloadQuotePdf(quote, provider) {
  const [{ pdf }, { default: QuotePdf }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../components/quotes/QuotePdf.jsx'),
  ]);
  const blob = await pdf(createElement(QuotePdf, { quote, provider })).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orcamento-${quoteNumber(quote.id).slice(1).toLowerCase()}-${slug(quote.client.name)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return blob;
}
