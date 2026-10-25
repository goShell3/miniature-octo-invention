import * as dns from 'node:dns';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from './app.module';
import { auth } from './auth/better-auth';

// Ensure Node.js prioritizes IPv4 over IPv6 on cloud environments (e.g. Render)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configuredOrigins = (process.env.WEB_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const standardOrigins = [
    'https://sewnet.vercel.app',
    'https://miniature-octo-invention-rouge.vercel.app',
    'https://sewnet-api.onrender.com',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'https://www.koo-link.com',
    'https://koo-link.com',
    'https://*.koo-link.com',
    'https://koolink.com',
    'https://*.koolink.com',
    'https://koolink.co',
    'https://*.koolink.co',
    'https://koolink.io',
    'https://*.koolink.io',
  ];

  const allowedOrigins = [...new Set([...standardOrigins, ...configuredOrigins])];

  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const cleanOrigin = origin.trim().replace(/\/+$/, '');

      if (allowedOrigins.includes(cleanOrigin)) {
        callback(null, true);
        return;
      }

      // Check wildcard origins in configured list (e.g. *.vercel.app or *.sewnet.et)
      const matchesWildcard = allowedOrigins.some((allowed) => {
        if (allowed.includes('*')) {
          const regexStr = '^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '[a-z0-9-]+') + '$';
          return new RegExp(regexStr, 'i').test(cleanOrigin);
        }
        return false;
      });
      if (matchesWildcard) {
        callback(null, true);
        return;
      }

      // Allow any Vercel deployment (preview, production, subdomains)
      if (cleanOrigin.endsWith('.vercel.app')) {
        callback(null, true);
        return;
      }

      // Allow any Render deployment
      if (cleanOrigin.endsWith('.onrender.com')) {
        callback(null, true);
        return;
      }

      // Allow local development (any port and any localhost subdomain, e.g. user.localhost:5173)
      const isLocalHost = /^https?:\/\/(?:[a-z0-9-]+\.)*(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(cleanOrigin);
      if (isLocalHost) {
        callback(null, true);
        return;
      }

      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['set-auth-token', 'Set-Cookie'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use('/api/auth', toNodeHandler(auth));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
