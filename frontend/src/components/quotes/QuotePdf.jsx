// Documento PDF do orçamento (@react-pdf/renderer: vetorial, texto selecionável, A4).
// Este módulo só é carregado ao clicar em "Gerar PDF" (ver lib/quotePdf.js).
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { brl } from '../../lib/money.js';
import { formatDateBR } from '../../lib/dates.js';
import { quoteNumber } from '../../lib/quotes.js';
import { formatBRPhone } from '../../lib/whatsapp.js';

const NAVY = '#132642';
const SLATE = '#64748b';
const LINE = '#e2e8f0';

// Intl usa espaço não separável em "R$ 10,00"; a fonte padrão do PDF não tem esse glifo
const money = (v) => brl(v).replace(/ /g, ' ');
const qty = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, fontSize: 10, fontFamily: 'Helvetica', color: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: NAVY, paddingBottom: 14 },
  provider: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: NAVY },
  muted: { color: SLATE },
  docTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'right' },
  meta: { textAlign: 'right', marginTop: 3, color: SLATE },
  section: { marginTop: 22 },
  label: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: SLATE, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  clientName: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  tableHead: { flexDirection: 'row', backgroundColor: NAVY, color: '#fff', paddingVertical: 6, paddingHorizontal: 8, fontFamily: 'Helvetica-Bold', fontSize: 9 },
  row: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: LINE },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 50, textAlign: 'right' },
  cUnit: { width: 80, textAlign: 'right' },
  cTotal: { width: 84, textAlign: 'right' },
  totalBox: { marginTop: 12, alignSelf: 'flex-end', width: 220, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f1f5fb', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 4 },
  totalLabel: { fontFamily: 'Helvetica-Bold', color: NAVY, fontSize: 11 },
  totalValue: { fontFamily: 'Helvetica-Bold', color: NAVY, fontSize: 14 },
  validity: { marginTop: 10, textAlign: 'right', color: SLATE, fontSize: 9 },
  payment: { marginTop: 24, backgroundColor: '#f1f5f9', borderRadius: 4, padding: 14, flexDirection: 'row' },
  paymentCol: { flex: 1, paddingRight: 12 },
  paymentLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: SLATE, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  paymentText: { fontSize: 10.5, lineHeight: 1.45 },
  pixKey: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY },
  footer: { position: 'absolute', bottom: 28, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: SLATE },
});

/** `quote` vem de GET /api/quotes/:id; `provider` é o prestador logado (nome, e-mail, telefone). */
export default function QuotePdf({ quote, provider }) {
  const created = new Date(quote.createdAt).toLocaleDateString('pt-BR');
  return (
    <Document title={`Orçamento ${quoteNumber(quote.id)} · ${quote.client.name}`} author={provider.name} language="pt-BR">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.provider}>{provider.name}</Text>
            {provider.phone && <Text style={s.muted}>WhatsApp: {formatBRPhone(provider.phone)}</Text>}
            <Text style={s.muted}>{provider.email}</Text>
          </View>
          <View>
            <Text style={s.docTitle}>ORÇAMENTO</Text>
            <Text style={s.meta}>Nº {quoteNumber(quote.id).slice(1)}</Text>
            <Text style={s.meta}>Emitido em {created}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.label}>Cliente</Text>
          <Text style={s.clientName}>{quote.client.name}</Text>
          {quote.client.phone && <Text style={s.muted}>{formatBRPhone(quote.client.phone)}</Text>}
          {quote.client.address && <Text style={s.muted}>{quote.client.address}</Text>}
        </View>

        <View style={s.section}>
          <Text style={s.label}>Serviços e materiais</Text>
          <View style={s.tableHead} fixed>
            <Text style={s.cDesc}>Descrição</Text>
            <Text style={s.cQty}>Qtd.</Text>
            <Text style={s.cUnit}>Valor unit.</Text>
            <Text style={s.cTotal}>Subtotal</Text>
          </View>
          {quote.items.map((item) => (
            <View key={item.id} style={s.row} wrap={false}>
              <Text style={s.cDesc}>{item.description}</Text>
              <Text style={s.cQty}>{qty(item.quantity)}</Text>
              <Text style={s.cUnit}>{money(item.unitPrice)}</Text>
              <Text style={s.cTotal}>{money(item.total)}</Text>
            </View>
          ))}
          <View style={s.totalBox} wrap={false}>
            <Text style={s.totalLabel}>TOTAL</Text>
            <Text style={s.totalValue}>{money(quote.totalAmount)}</Text>
          </View>
        </View>

        {quote.expiresAt && <Text style={s.validity}>Proposta válida até {formatDateBR(quote.expiresAt)}</Text>}

        {(quote.paymentTerms || quote.pixKey) && (
          <View style={s.payment} wrap={false}>
            {quote.paymentTerms && (
              <View style={s.paymentCol}>
                <Text style={s.paymentLabel}>Condições de pagamento</Text>
                <Text style={s.paymentText}>{quote.paymentTerms}</Text>
              </View>
            )}
            {quote.pixKey && (
              <View style={s.paymentCol}>
                <Text style={s.paymentLabel}>Chave PIX</Text>
                <Text style={s.pixKey}>{quote.pixKey}</Text>
              </View>
            )}
          </View>
        )}

        <View style={s.footer} fixed>
          <Text>
            {provider.name} · Orçamento {quoteNumber(quote.id)}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
