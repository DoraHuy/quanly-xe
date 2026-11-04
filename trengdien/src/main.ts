import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module.js';

let appPromise: Promise<INestApplication> | null = null;

async function bootstrap(): Promise<INestApplication> {
  if (!appPromise) {
    appPromise = (async () => {
      const app = await NestFactory.create(AppModule);
      app.enableCors({
        origin: true,
        credentials: true,
      });
      const port = Number(process.env.PORT) || 4000;
      await app.listen(port);
      console.log(`🚀 EV Rental Backend running on port ${port}`);
      return app;
    })();
  }
  return appPromise;
}

// Luôn khởi động server
bootstrap().catch((err) => {
  console.error('CRITICAL BOOTSTRAP ERROR:', err);
});

// Serverless Handler với Promise đợi response hoàn tất
export default async function handler(req: any, res: any) {
  try {
    const app = await bootstrap();
    const expressApp = app.getHttpAdapter().getInstance();
    return await new Promise<void>((resolve, reject) => {
      res.on('finish', resolve);
      res.on('close', resolve);
      res.on('error', reject);
      expressApp(req, res);
    });
  } catch (err: any) {
    console.error('CRITICAL HANDLER ERROR:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          status: 'error',
          error: 'INTERNAL_SERVER_ERROR',
          message: err?.message || String(err),
        }),
      );
    }
  }
}
