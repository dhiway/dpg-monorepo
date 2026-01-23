import z from '@dpg/schemas';
import fastify from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import AuthRoutes from './routes/auth';
import { api_secrets } from 'packages/config/src/secrets';

const app = fastify({
  logger: true,
});

// Add schema validator and serializer
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(AuthRoutes);

app.withTypeProvider<ZodTypeProvider>().route({
  method: 'GET',
  url: '/',
  // Define your schema
  schema: {
    querystring: z.object({
      name: z.string().min(4),
    }),
    response: {
      200: z.string(),
    },
  },
  handler: (req, res) => {
    res.send(req.query.name);
  },
});

await app
  .listen({
    port: api_secrets.api_port,
    host: '0.0.0.0',
  })
  .then((endpoint) => console.log('Server Endpoint: ', endpoint))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
