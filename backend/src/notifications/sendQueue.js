/**
 * Fila serial com intervalo mínimo entre envios. Disparar muitas mensagens em
 * rajada é o principal gatilho de bloqueio de número em clientes não oficiais.
 */
export function createSendQueue({ minIntervalMs, now = Date.now, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  let tail = Promise.resolve();
  let lastSentAt = 0;

  return function enqueue(task) {
    const run = tail.then(async () => {
      const wait = lastSentAt + minIntervalMs - now();
      if (wait > 0) await sleep(wait);
      try {
        return await task();
      } finally {
        lastSentAt = now();
      }
    });
    tail = run.catch(() => {}); // uma falha não trava a fila
    return run;
  };
}
