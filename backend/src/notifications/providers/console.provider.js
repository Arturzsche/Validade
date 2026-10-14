// Simulação do Passo 2: imprime a mensagem no terminal. Útil em dev e testes.

export function createConsoleProvider() {
  return {
    name: 'console',
    channel: 'CONSOLE',
    async start() {},
    async stop() {},
    isReady: () => true,
    onReady: () => () => {},
    status: () => ({ provider: 'console', state: 'open' }),
    getQr: () => null, // simulação não tem pareamento
    async restart() {},
    async send({ to, message }) {
      console.log(`\n📲 [simulação WhatsApp] para ${to ?? '(loja sem número cadastrado)'}\n${message}\n`);
      return { id: null };
    },
  };
}
