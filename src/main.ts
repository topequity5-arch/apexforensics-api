/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Build the Swagger Document configuration
  const config = new DocumentBuilder()
    .setTitle('Funds Recovery')
    .setDescription(
      'Core business logic engine architecture for Funds claims and authentication management',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter your Supabase access token payload',
        in: 'header',
      },
      'JWT-auth', // This reference string matches the security guards in controllers
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Expose the documentation playground at http://localhost:3000/api/v1/docs
  SwaggerModule.setup('api/v1/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Prevents losing your token on page refresh
    },
  });

  await app.listen(process.env.PORT || 3000);
}
void bootstrap();
