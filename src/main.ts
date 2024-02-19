import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
    ExpressAdapter,
    NestExpressApplication,
} from '@nestjs/platform-express';

// import {
//     FastifyAdapter,
//     NestFastifyApplication,
// } from '@nestjs/platform-fastify';

import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(
        AppModule,
        new ExpressAdapter(),
    );
    app.enableCors();
    const port = app.get(ConfigService).get('NESTJS_PORT') || 3000;
    app.enableShutdownHooks();
    await app.listen(port, '0.0.0.0'); // 不加这个，只能允许localhost的连接
    console.log(`Apps starts on port ${port}`);
}
bootstrap();
