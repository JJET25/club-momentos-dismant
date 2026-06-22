import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

export interface StatementEntry {
  id:            string
  type:          string
  points:        number
  balance_after: number
  description:   string | null
  created_at:    string
}

export interface StatementMember {
  full_name:    string
  rfc:          string
  company_name: string
  email:        string
}

export interface StatementDocumentProps {
  entries:      StatementEntry[]
  member:       StatementMember
  balance:      number
  periodLabel:  string
  generatedAt:  string
}

Font.register({
  family: 'Helvetica',
  fonts: [],
})

const TYPE_LABELS: Record<string, string> = {
  invoice:       'Factura validada',
  redemption:    'Canje de premio',
  welcome_bonus: 'Bono de bienvenida',
  review_bonus:  'Bono por reseña',
  adjustment:    'Ajuste manual',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function fmtPts(n: number) {
  return n.toLocaleString('es-MX')
}

const C = {
  blue:    '#2563eb',
  gray50:  '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray700: '#374151',
  gray900: '#111827',
  green:   '#16a34a',
  red:     '#dc2626',
}

const s = StyleSheet.create({
  page:        { padding: 40, fontSize: 9, color: C.gray900, fontFamily: 'Helvetica' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  logoBox:     { width: 32, height: 32, borderRadius: 6, backgroundColor: C.blue,
                 alignItems: 'center', justifyContent: 'center' },
  logoText:    { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 16 },
  brand:       { fontFamily: 'Helvetica-Bold', fontSize: 13, marginBottom: 2 },
  brandSub:    { fontSize: 9, color: C.gray500 },
  right:       { textAlign: 'right' },
  rightBold:   { fontFamily: 'Helvetica-Bold', textAlign: 'right', marginBottom: 2 },
  rightSub:    { fontSize: 8, color: C.gray500, textAlign: 'right' },
  infoBox:     { backgroundColor: C.gray50, borderRadius: 6, padding: 12, marginBottom: 16 },
  infoGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  infoCell:    { width: '48%' },
  infoLabel:   { fontSize: 8, color: C.gray500 },
  infoValue:   { fontFamily: 'Helvetica-Bold' },
  summaryRow:  { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryCard: { flex: 1, border: `1 solid ${C.gray200}`, borderRadius: 6, padding: 10 },
  summaryLbl:  { fontSize: 8, color: C.gray500, marginBottom: 4 },
  summaryVal:  { fontFamily: 'Helvetica-Bold', fontSize: 13 },
  table:       { width: '100%' },
  thead:       { flexDirection: 'row', backgroundColor: C.gray100,
                 borderBottom: `1 solid ${C.gray200}`, paddingVertical: 5 },
  th:          { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.gray700, paddingHorizontal: 8 },
  tr:          { flexDirection: 'row', borderBottom: `1 solid ${C.gray200}`, paddingVertical: 5 },
  td:          { fontSize: 8, paddingHorizontal: 8 },
  colDate:     { width: '14%' },
  colType:     { width: '20%' },
  colDesc:     { width: '36%' },
  colPts:      { width: '15%', textAlign: 'right' },
  colBal:      { width: '15%', textAlign: 'right' },
  green:       { color: C.green },
  red:         { color: C.red },
  bold:        { fontFamily: 'Helvetica-Bold' },
  empty:       { textAlign: 'center', color: C.gray400, marginTop: 24, fontSize: 9 },
  footer:      { marginTop: 24, borderTop: `1 solid ${C.gray200}`, paddingTop: 10,
                 fontSize: 8, color: C.gray400 },
})

export function StatementDocument({
  entries, member, balance, periodLabel, generatedAt,
}: StatementDocumentProps) {
  const initialBalance = entries.length > 0
    ? entries[entries.length - 1].balance_after - entries[entries.length - 1].points
    : balance

  return (
    <Document title={`Estado de Cuenta — ${member.rfc}`} author="Club Momentos Dismant">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={s.logoBox}>
              <Text style={s.logoText}>D</Text>
            </View>
            <View>
              <Text style={s.brand}>Club Momentos Dismant</Text>
              <Text style={s.brandSub}>Estado de Cuenta de Puntos</Text>
            </View>
          </View>
          <View>
            <Text style={s.rightBold}>Período: {periodLabel}</Text>
            <Text style={s.rightSub}>Generado: {generatedAt}</Text>
          </View>
        </View>

        {/* Member info */}
        <View style={s.infoBox}>
          <View style={s.infoGrid}>
            {([
              ['Nombre',  member.full_name],
              ['RFC',     member.rfc],
              ['Empresa', member.company_name],
              ['Correo',  member.email],
            ] as [string, string][]).map(([label, value]) => (
              <View key={label} style={s.infoCell}>
                <Text style={s.infoLabel}>{label}</Text>
                <Text style={s.infoValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary cards */}
        <View style={s.summaryRow}>
          {[
            { label: 'Saldo inicial del período', value: `${fmtPts(initialBalance)} pts` },
            { label: 'Saldo final del período',   value: `${fmtPts(balance)} pts` },
            { label: 'Total de movimientos',       value: String(entries.length) },
          ].map(card => (
            <View key={card.label} style={s.summaryCard}>
              <Text style={s.summaryLbl}>{card.label}</Text>
              <Text style={s.summaryVal}>{card.value}</Text>
            </View>
          ))}
        </View>

        {/* Table */}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, s.colDate]}>Fecha</Text>
            <Text style={[s.th, s.colType]}>Tipo</Text>
            <Text style={[s.th, s.colDesc]}>Descripción</Text>
            <Text style={[s.th, s.colPts]}>Puntos</Text>
            <Text style={[s.th, s.colBal]}>Saldo</Text>
          </View>

          {entries.map((e, i) => (
            <View key={e.id} style={[s.tr, i % 2 === 1 ? { backgroundColor: C.gray50 } : {}]}>
              <Text style={[s.td, s.colDate]}>{fmtDate(e.created_at)}</Text>
              <Text style={[s.td, s.colType]}>{TYPE_LABELS[e.type] ?? e.type}</Text>
              <Text style={[s.td, s.colDesc, { color: C.gray500 }]}>{e.description ?? '—'}</Text>
              <Text style={[s.td, s.colPts, s.bold, e.points > 0 ? s.green : s.red]}>
                {e.points > 0 ? '+' : ''}{fmtPts(e.points)}
              </Text>
              <Text style={[s.td, s.colBal]}>{fmtPts(e.balance_after)}</Text>
            </View>
          ))}
        </View>

        {entries.length === 0 && (
          <Text style={s.empty}>Sin movimientos en el período seleccionado.</Text>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text>
            Club Momentos Dismant — Documento generado automáticamente.
            Los puntos tienen trazabilidad completa ante cada movimiento.
          </Text>
        </View>

      </Page>
    </Document>
  )
}
