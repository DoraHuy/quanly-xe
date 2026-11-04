import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module.js';

let appInstance: INestApplication | null = null;

async function bootstrap(): Promise<INestApplication> {
  if (!appInstance) {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
      origin: true,
      credentials: true,
    });
    await app.init();
    appInstance = app;
  }
  return appInstance;
}

// Chạy server khi ở môi trường phát triển local hoặc VPS (không phải Vercel Serverless)
if (!process.env.VERCEL) {
  bootstrap().then(async (app) => {
    const port = Number(process.env.PORT) || 4000;
    await app.listen(port);
    console.log(`🚀 EV Rental Backend running on http://localhost:${port}`);
  });
}

// Handler cho Vercel Serverless Function (Fluid compute)
export default async function handler(req: any, res: any) {
  try {
    const app = await bootstrap();
    const expressInstance = app.getHttpAdapter().getInstance();
    return expressInstance(req, res);
  } catch (err: any) {
    console.error('CRITICAL SERVERLESS BOOTSTRAP ERROR:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        status: 'error',
        error: 'CRITICAL_BOOTSTRAP_ERROR',
        message: err?.message || String(err),
        stack: err?.stack,
      }),
    );
  }
}
