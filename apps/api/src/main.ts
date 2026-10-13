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

  const allowedOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Check wildcard origins in allowedOrigins list (e.g. *.vercel.app or *.sewnet.et)
      const matchesWildcard = allowedOrigins.some((allowed) => {
        if (allowed.includes('*')) {
          const regexStr = '^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '[a-z0-9-]+') + '$';
          return new RegExp(regexStr, 'i').test(origin);
        }
        return false;
      });
      if (matchesWildcard) {
        callback(null, true);
        return;
      }

      const isLocalDevOrigin =
        process.env.NODE_ENV !== 'production' &&
        /^http:\/\/(?:[a-z0-9-]+\.)*(?:localhost|127\.0\.0\.1):\d+$/.test(origin);
      if (isLocalDevOrigin) {
        callback(null, true);
        return;
      }

      // Allow any Vercel preview or production deployment
      if (origin.endsWith('.vercel.app')) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
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
