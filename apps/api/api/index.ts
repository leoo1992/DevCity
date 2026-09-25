import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, {
  type Request,
  type Response,
} from 'express';
import { AppModule } from '../src/app.module';

let cachedServer: express.Express | null = null;

async function getServer() {
  if (cachedServer) return cachedServer;

  const server = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
    {
      logger: ['error', 'warn'],
    },
  );

  app.enableCors({
    origin: true,
    methods: ['GET', 'OPTIONS'],
  });

  await app.init();
  cachedServer = server;

  return server;
}

export default async function handler(
  request: Request,
  response: Response,
) {
  const server = await getServer();
  return server(request, response);
}
