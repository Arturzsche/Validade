// Dados de demonstração para ver o Dashboard preenchido.
// Uso: npm run db:seed   (login: demo@prestador.com / senha-demo)
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const dateIn = (n) => new Date(`${new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)}T00:00:00.000Z`);

const QUOTES = [
  { client: 0, status: 'APPROVED', created: 9, responded: 2, items: [['Troca de quadro de distribuição (12 disjuntores)', 1, 1450], ['Disjuntor DR 40A', 1, 180]] },
  { client: 1, status: 'PENDING', created: 1, items: [['Instalação de chuveiro elétrico', 1, 180], ['Fiação 10mm (m)', 8, 14.5]] },
  { client: 2, status: 'APPROVED', created: 6, responded: 4, items: [['Desentupimento de pia e ralo', 1, 320]] },
  { client: 3, status: 'REJECTED', created: 12, responded: 8, items: [['Armário planejado de cozinha (m linear)', 3.5, 1100]] },
  { client: 1, status: 'PENDING', created: 0, items: [['Revisão elétrica completa', 1, 650], ['Tomadas 20A', 6, 38]] },
  { client: 4, status: 'APPROVED', created: 20, responded: 15, items: [['Manutenção de ar-condicionado split', 2, 230]] },
];

async function main() {
  await prisma.user.deleteMany({ where: { email: 'demo@prestador.com' } });
  const user = await prisma.user.create({
    data: { name: 'Carlos Prestador', email: 'demo@prestador.com', passwordHash: await bcrypt.hash('senha-demo', 10), phone: '+5511988887777' },
  });
  const clients = [];
  for (const [name, phone, address] of [
    ['Mariana Souza', '+5511991112222', 'Rua das Flores, 120 - Vila Mariana'],
    ['Condomínio Jardim Azul', '+5511993334444', 'Av. Paulista, 900'],
    ['Roberto Lima', '+5511995556666', 'Rua Augusta, 45 - ap 31'],
    ['Padaria Pão Quente', '+5511997778888', 'Rua do Comércio, 300'],
    ['Ana Beatriz Costa', null, null],
  ]) {
    clients.push(await prisma.client.create({ data: { userId: user.id, name, phone, address } }));
  }
  for (const q of QUOTES) {
    const items = q.items.map(([description, quantity, unitPrice], position) => ({ description, quantity, unitPrice, position }));
    const total = items.reduce((c, i) => c + Math.round(i.quantity * i.unitPrice * 100), 0) / 100;
    await prisma.quote.create({
      data: {
        clientId: clients[q.client].id,
        status: q.status,
        totalAmount: total,
        createdAt: daysAgo(q.created),
        expiresAt: dateIn(15 - q.created),
        respondedAt: q.responded === undefined ? null : daysAgo(q.responded),
        paymentTerms: '50% de entrada e 50% na conclusão do serviço',
        pixKey: 'carlos.prestador@email.com',
        items: { create: items },
      },
    });
  }
  console.log(`✅ Seed pronto: ${clients.length} clientes, ${QUOTES.length} orçamentos. Login: demo@prestador.com / senha-demo`);
}

main().finally(() => prisma.$disconnect());
