import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const config = app.get(AppConfigService);
  const port = config.port;
  const isDev = config.nodeEnv !== 'production';
  const logger = new Logger('Bootstrap');

  const corsOrigins = process.env['CORS_ORIGINS']?.split(',').map((o) => o.trim()) ?? [
    'http://localhost:3001',
    'http://localhost:3002',
  ];
  app.enableCors({ origin: corsOrigins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());

  if (isDev) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('FlavoHub API')
      .setDescription('The FlavoHub platform REST API')
      .setVersion('0.1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  app.enableShutdownHooks();
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}`);
  if (isDev) {
    logger.log(`Swagger docs: http://localhost:${port}/docs`);
  }
}

void bootstrap();
