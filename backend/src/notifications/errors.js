// Dois tipos de falha com tratamentos diferentes no motor de alertas:

/** Canal fora do ar (WhatsApp desconectado, aguardando QR...). Transitória:
 *  o alerta continua pendente e NÃO consome tentativa — sai quando a conexão voltar. */
export class NotifierUnavailableError extends Error {
  constructor(message = 'Canal de notificação indisponível') {
    super(message);
    this.name = 'NotifierUnavailableError';
  }
}

/** Problema com o destinatário (sem número, número sem WhatsApp). Conta como tentativa. */
export class RecipientError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RecipientError';
  }
}
