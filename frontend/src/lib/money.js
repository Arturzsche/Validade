const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const brl = (value) => formatter.format(value);

/** Centavos inteiros -> reais (number) */
export const centsToReais = (cents) => (cents === null ? null : cents / 100);
