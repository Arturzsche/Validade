/**
 * Valida body/query/params com schemas zod. O resultado (já convertido e com
 * defaults) fica em `req.valid` — no Express 5 `req.query` é somente leitura.
 */
export const validate = (schemas) => (req, _res, next) => {
  req.valid = {};
  for (const key of ['params', 'query', 'body']) {
    if (schemas[key]) req.valid[key] = schemas[key].parse(req[key] ?? {});
  }
  next();
};
