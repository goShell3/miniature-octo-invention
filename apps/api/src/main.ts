import * as dns from 'node:dns';
import { json, urlencoded } from 'express';
import type { Request, Response, NextFunction } from 'express';
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

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

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

  // Intercept OAuth callback redirects to append the session token to the return URL
  app.use('/api/auth/callback', (req: Request, res: Response, next: NextFunction) => {
    let capturedLocation: string | null = null;
    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = function (name: string, value: any) {
      if (typeof name === 'string' && name.toLowerCase() === 'location') {
        capturedLocation = String(value);
      }
      return originalSetHeader(name, value);
    };

    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = function (statusCode: number, ...args: any[]) {
      if (statusCode === 302 || statusCode === 301 || statusCode === 307) {
        let headers: any = args[0];
        if (typeof args[1] === 'object') headers = args[1];
        const location = capturedLocation || headers?.Location || headers?.location || res.getHeader('location');
        const setCookie = headers?.['Set-Cookie'] || headers?.['set-cookie'] || res.getHeader('set-cookie');
        if (location && setCookie) {
          const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie);
          const match = cookieStr.match(/(?:session_token)=([^;]+)/);
          if (match && match[1]) {
            const token = decodeURIComponent(match[1]);
            const locStr = String(location);
            const sep = locStr.includes('?') ? '&' : '?';
            const newLoc = locStr + sep + 'token=' + encodeURIComponent(token);
            if (headers?.Location) headers.Location = newLoc;
            if (headers?.location) headers.location = newLoc;
            originalSetHeader('location', newLoc);
          }
        }
      }
      return (originalWriteHead as any)(statusCode, ...args);
    };
    next();
  });

  const authNodeHandler = toNodeHandler(auth);
  app.use('/api/auth', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authNodeHandler(req, res);
    } catch (err: any) {
      console.error('[BETTER-AUTH UNCAUGHT ERROR]', err?.stack || err?.message || err);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'better_auth_server_error',
          message: err?.message || 'Authentication error',
        });
      }
    }
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
