// Documento PDF do orçamento no formato "nota comercial": grade de células com bordas finas
// pretas, alto contraste e cabeçalhos invertidos (@react-pdf/renderer: vetorial, A4).
// Este módulo só é carregado ao clicar em "Gerar PDF" (ver lib/quotePdf.js).
//
// Regra das bordas (evita linhas duplicadas): cada caixa externa desenha a borda inteira;
// dentro dela, as células desenham só a borda da DIREITA (entre colunas) e a de BAIXO
// (entre linhas) — e a última célula de cada linha/coluna não desenha a sua.
import { Document, Page, Path, Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import { brl } from '../../lib/money.js';
import { formatDateBR } from '../../lib/dates.js';
import { quoteNumber } from '../../lib/quotes.js';
import { formatBRPhone } from '../../lib/whatsapp.js';

const INK = '#000';
const DARK = '#111827';
const MUTED = '#4b5563';
const B = 1; // espessura das bordas

// Intl usa espaço não separável em "R$ 10,00"; a fonte padrão do PDF não tem esse glifo
const money = (v) => brl(v).replace(/ /g, ' ');
const qty = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const dateBR = (d) => new Date(d).toLocaleDateString('pt-BR');

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 40, paddingHorizontal: 28, fontSize: 9.5, fontFamily: 'Helvetica', color: INK },

  // ---------- Caixa genérica e rótulos de célula
  box: { borderWidth: B, borderColor: INK },
  label: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  value: { fontSize: 10 },
  valueBold: { fontSize: 10.5, fontFamily: 'Helvetica-Bold' },

  // ---------- Cabeçalho: logo 20% | prestador 50% | datas/número 30%
  header: { flexDirection: 'row', borderWidth: B, borderColor: INK },
  logoCell: { width: '20%', borderRightWidth: B, borderColor: INK, padding: 8, alignItems: 'center', justifyContent: 'center' },
  logoText: { marginTop: 4, fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 1 },
  providerCell: { width: '50%', borderRightWidth: B, borderColor: INK, padding: 10, alignItems: 'center', justifyContent: 'center' },
  providerName: { fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  providerLine: { fontSize: 9, textAlign: 'center', color: '#1f2937', marginTop: 1 },
  metaCol: { width: '30%' },
  metaCell: { flexGrow: 1, borderBottomWidth: B, borderColor: INK, paddingVertical: 4, paddingHorizontal: 8, justifyContent: 'center' },
  metaCellLast: { flexGrow: 1, paddingVertical: 4, paddingHorizontal: 8, justifyContent: 'center' },
  metaValue: { fontSize: 10.5, fontFamily: 'Helvetica-Bold' },

  // ---------- Barra do título
  titleBar: { marginTop: 8, backgroundColor: DARK, paddingVertical: 7, borderWidth: B, borderColor: INK },
  title: { color: '#fff', fontSize: 18, fontFamily: 'Helvetica-Bold', textAlign: 'center', letterSpacing: 4 },

  // ---------- Grade do cliente
  sectionBar: { backgroundColor: DARK, paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: B, borderColor: INK },
  sectionBarText: { color: '#fff', fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 0.6 },
  clientBox: { marginTop: 8, borderWidth: B, borderColor: INK },
  row: { flexDirection: 'row' },
  rowDivider: { borderBottomWidth: B, borderColor: INK },
  cell: { padding: 6 },
  cellDivider: { borderRightWidth: B, borderColor: INK },

  // ---------- Tabela de itens
  table: { marginTop: 8, borderTopWidth: B, borderLeftWidth: B, borderColor: INK },
  th: { flexDirection: 'row', backgroundColor: DARK },
  thCell: { color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 8.5, paddingVertical: 5, paddingHorizontal: 6, borderRightWidth: B, borderBottomWidth: B, borderColor: INK },
  tr: { flexDirection: 'row' },
  trAlt: { flexDirection: 'row', backgroundColor: '#f3f4f6' },
  td: { fontSize: 9.5, paddingVertical: 5, paddingHorizontal: 6, borderRightWidth: B, borderBottomWidth: B, borderColor: INK },
  cDesc: { width: '52%' },
  cQty: { width: '10%', textAlign: 'center' },
  cUnit: { width: '19%', textAlign: 'right' },
  cTotal: { width: '19%', textAlign: 'right' },

  // ---------- Resumo financeiro (à direita)
  summary: { marginTop: 8, alignSelf: 'flex-end', width: '38%', borderWidth: B, borderColor: INK },
  summaryRow: { flexDirection: 'row', borderBottomWidth: B, borderColor: INK },
  summaryLabel: { width: '50%', padding: 6, borderRightWidth: B, borderColor: INK, fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
  summaryValue: { width: '50%', padding: 6, fontSize: 10, textAlign: 'right' },
  totalRow: { flexDirection: 'row', backgroundColor: DARK },
  totalLabel: { width: '50%', padding: 7, borderRightWidth: B, borderColor: '#fff', color: '#fff', fontSize: 10.5, fontFamily: 'Helvetica-Bold' },
  totalValue: { width: '50%', padding: 7, color: '#fff', fontSize: 12, fontFamily: 'Helvetica-Bold', textAlign: 'right' },

  // ---------- Observações e pagamento
  notesBox: { marginTop: 12, borderWidth: B, borderColor: INK },
  notesBody: { flexDirection: 'row' },
  notesText: { fontSize: 10, lineHeight: 1.45 },
  pixKey: { fontSize: 11.5, fontFamily: 'Helvetica-Bold' },
  notesEmpty: { padding: 8, fontSize: 9.5, color: MUTED },

  // ---------- Assinatura e rodapé
  signatures: { marginTop: 36, flexDirection: 'row', justifyContent: 'space-between' },
  signature: { width: '44%', borderTopWidth: B, borderColor: INK, paddingTop: 4, alignItems: 'center' },
  signatureText: { fontSize: 8.5, color: MUTED },
  footer: { position: 'absolute', bottom: 18, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: MUTED },
});

/** Espaço da logo: ícone de documento + "SUA LOGO" (substituível pela logo do prestador no futuro). */
function LogoPlaceholder() {
  return (
    <>
      <Svg width={34} height={34} viewBox="0 0 40 40">
        <Rect x="1" y="1" width="38" height="38" rx="6" stroke={INK} strokeWidth={1.5} fill="#fff" />
        <Path d="M13 9.5h10.5L29 15v15.5a1.5 1.5 0 0 1-1.5 1.5h-14.5a1.5 1.5 0 0 1-1.5-1.5V11a1.5 1.5 0 0 1 1.5-1.5Z" fill={DARK} />
        <Path d="M15.5 17h9M15.5 21h9M15.5 25h6" stroke="#fff" strokeWidth={1.6} />
      </Svg>
      <Text style={s.logoText}>SUA LOGO</Text>
    </>
  );
}

/** Célula com rótulo pequeno em cima e valor embaixo. */
function Field({ label, children, style, bold }) {
  return (
    <View style={[s.cell, style]}>
      <Text style={s.label}>{label}</Text>
      <Text style={bold ? s.valueBold : s.value}>{children}</Text>
    </View>
  );
}

/**
 * `quote` vem de GET /api/quotes/:id; `provider` é o prestador logado
 * ({ name, email, phone, address? } — endereço aparece quando existir no perfil).
 */
export default function QuotePdf({ quote, provider }) {
  const number = quoteNumber(quote.id).slice(1);
  const subtotal = quote.items.reduce((cents, i) => cents + Math.round(i.total * 100), 0) / 100;
  const hasClientContact = quote.client.phone || quote.client.address;
  const hasPayment = quote.paymentTerms || quote.pixKey;

  return (
    <Document title={`Orçamento ${number} · ${quote.client.name}`} author={provider.name} language="pt-BR">
      <Page size="A4" style={s.page}>
        {/* ---------- Cabeçalho em 3 colunas */}
        <View style={s.header}>
          <View style={s.logoCell}>
            <LogoPlaceholder />
          </View>
          <View style={s.providerCell}>
            <Text style={s.providerName}>{provider.name}</Text>
            {provider.phone && <Text style={s.providerLine}>WhatsApp: {formatBRPhone(provider.phone)}</Text>}
            <Text style={s.providerLine}>E-mail: {provider.email}</Text>
            {provider.address && <Text style={s.providerLine}>{provider.address}</Text>}
          </View>
          <View style={s.metaCol}>
            <View style={s.metaCell}>
              <Text style={s.label}>Criado em</Text>
              <Text style={s.metaValue}>{dateBR(quote.createdAt)}</Text>
            </View>
            <View style={s.metaCell}>
              <Text style={s.label}>Válido até</Text>
              <Text style={s.metaValue}>{quote.expiresAt ? formatDateBR(quote.expiresAt) : '—'}</Text>
            </View>
            <View style={s.metaCellLast}>
              <Text style={s.label}>Orçamento Nº</Text>
              <Text style={s.metaValue}>{number}</Text>
            </View>
          </View>
        </View>

        {/* ---------- Título */}
        <View style={s.titleBar}>
          <Text style={s.title}>ORÇAMENTO</Text>
        </View>

        {/* ---------- Cliente */}
        <View style={s.clientBox} wrap={false}>
          <View style={s.sectionBar}>
            <Text style={s.sectionBarText}>DADOS DO CLIENTE</Text>
          </View>
          <View style={hasClientContact ? [s.row, s.rowDivider] : s.row}>
            <Field label="Cliente" style={{ width: '100%' }} bold>
              {quote.client.name}
            </Field>
          </View>
          {hasClientContact && (
            <View style={s.row}>
              <Field label="Contato (WhatsApp)" style={[{ width: '35%' }, s.cellDivider]}>
                {quote.client.phone ? formatBRPhone(quote.client.phone) : '—'}
              </Field>
              <Field label="Endereço" style={{ width: '65%' }}>
                {quote.client.address || '—'}
              </Field>
            </View>
          )}
        </View>

        {/* ---------- Itens */}
        <View style={s.table}>
          <View style={s.th} fixed>
            <Text style={[s.thCell, s.cDesc]}>DESCRIÇÃO</Text>
            <Text style={[s.thCell, s.cQty]}>QTD</Text>
            <Text style={[s.thCell, s.cUnit]}>VALOR UNIT.</Text>
            <Text style={[s.thCell, s.cTotal]}>TOTAL</Text>
          </View>
          {quote.items.map((item, i) => (
            <View key={item.id} style={i % 2 ? s.trAlt : s.tr} wrap={false}>
              <Text style={[s.td, s.cDesc]}>{item.description}</Text>
              <Text style={[s.td, s.cQty]}>{qty(item.quantity)}</Text>
              <Text style={[s.td, s.cUnit]}>{money(item.unitPrice)}</Text>
              <Text style={[s.td, s.cTotal]}>{money(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* ---------- Resumo financeiro */}
        <View style={s.summary} wrap={false}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Subtotal</Text>
            <Text style={s.summaryValue}>{money(subtotal)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL FINAL</Text>
            <Text style={s.totalValue}>{money(quote.totalAmount)}</Text>
          </View>
        </View>

        {/* ---------- Observações e pagamento */}
        <View style={s.notesBox} wrap={false}>
          <View style={s.sectionBar}>
            <Text style={s.sectionBarText}>OBSERVAÇÕES E PAGAMENTO</Text>
          </View>
          {hasPayment ? (
            <View style={s.notesBody}>
              <View style={quote.pixKey ? [s.cell, { width: '60%' }, s.cellDivider] : [s.cell, { width: '100%' }]}>
                <Text style={s.label}>Condições de pagamento</Text>
                <Text style={s.notesText}>{quote.paymentTerms || 'A combinar.'}</Text>
              </View>
              {quote.pixKey && (
                <View style={[s.cell, { width: '40%' }]}>
                  <Text style={s.label}>Chave PIX</Text>
                  <Text style={s.pixKey}>{quote.pixKey}</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={s.notesEmpty}>Condições de pagamento a combinar.</Text>
          )}
        </View>

        {/* ---------- Assinaturas */}
        <View style={s.signatures} wrap={false}>
          <View style={s.signature}>
            <Text style={s.signatureText}>{provider.name}</Text>
          </View>
          <View style={s.signature}>
            <Text style={s.signatureText}>De acordo — {quote.client.name}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>
            Orçamento Nº {number} · {provider.name}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
