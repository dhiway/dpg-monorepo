import fastify from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import AuthRoutes from './routes/auth';
import { apiConfig } from './config';
import cors from '@fastify/cors';
import 'dotenv/config';
import { allowed_origins } from '@dpg/config';

const app = fastify({
  logger: true,
  trustProxy: true,
});

// Add schema validator and serializer
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// CORS
await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin || allowed_origins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

// Routes
app.withTypeProvider<ZodTypeProvider>().route({
  method: 'GET',
  url: '/',
  handler: (_, res) => {
    res.send('welcome');
  },
});
app.register(AuthRoutes);

// setup
await app
  .listen({
    port: apiConfig.port,
    host: '0.0.0.0',
  })
  .then((endpoint) => console.log('Server Endpoint: ', endpoint))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  app.log.info(`Shutting down (${signal})`);

  try {
    await app.close();
  } catch (err) {
    app.log.error(err);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
