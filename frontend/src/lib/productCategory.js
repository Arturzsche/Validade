// Categoria visual do produto a partir do nome (só para o ícone; não afeta regras de negócio).
// A ordem importa: "Shampoo Pet" é pet, não higiene; "Água sanitária" é limpeza, NUNCA bebida.

const RULES = [
  ['pharmacy', /\b(\d+ ?mg|\d+ ?ml gotas|comp(rimidos?)?\.?|capsulas?|xarope|dipirona|paracetamol|ibuprofeno|amoxicilina|losartana|omeprazol|vitamina|pomada|remedio|generico)\b/],
  ['pet', /\b(racao|pet|petisco|areia (sanitaria|higienica)|coleira|sache (para )?(caes|gatos)|caes|gatos|whiskas|pedigree|golden|premier)\b/],
  ['dairy', /\b(leite|iogurte|queijo|requeijao|manteiga|nata|creme de leite|coalhada|bebida lactea|danone|mussarela|ricota)\b/],
  ['bakery', /\b(pao|paes|bolo|biscoito|bolacha|torrada|bisnaguinha|croissant|rosca|panetone|wafer)\b/],
  ['cleaning', /\b(shampoo|condicionador|sabonete|detergente|sabao|desinfetante|amaciante|alvejante|creme dental|pasta de dente|desodorante|limpador|agua sanitaria)\b/],
  ['drinks', /\b(refrigerante|suco|cerveja|agua|cha gelado|energetico|vinho|refri|coca|guarana|isotonico|nectar)\b/],
  ['produce', /\b(banana|maca|tomate|alface|laranja|limao|batata|cebola|cenoura|fruta|verdura|legume|morango|uva|mamao|ovos?)\b/],
];

const normalize = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function productCategory(name) {
  const text = normalize(name);
  return RULES.find(([, re]) => re.test(text))?.[0] ?? 'generic';
}
