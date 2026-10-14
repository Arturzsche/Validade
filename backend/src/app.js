import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import routes from './routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',') }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
