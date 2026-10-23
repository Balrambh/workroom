import { existsSync } from 'node:fs';
import http from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from './errors.js';
import { attachHub } from './hub.js';
import { apiRouter } from './routes.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});
app.use('/api', apiRouter);

const webDist = resolve(here, '../../web/dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      next();
      return;
    }
    res.sendFile(join(webDist, 'index.html'));
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    const message = error.issues
      .map((issue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
      .join('; ');
    res.status(400).json({ error: message || 'Invalid request' });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Something went wrong' });
});

const server = http.createServer(app);
attachHub(server);

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => {
  console.log(`RoomForge server listening on http://localhost:${port}`);
});
