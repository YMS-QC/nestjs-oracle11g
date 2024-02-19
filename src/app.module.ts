import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { GlobalExceptionsFilter } from '@/common/filters/global.filter';
import { GlobalInterceptor } from '@/common/interceptors/global.interceptor';
import { OracleDbModule } from '@/infra/database/oracle/oracledb.module';
import { BasicAuthMiddleware } from '@/middlewares/basic-auth.middleware';
import { AuthModule } from '@/modules/auth/auth.module';
import { AccessTokenAuthGuard } from '@/modules/auth/guards';
import { Srm2AcctOrgModule } from '@/modules/basic-data/srm2/srm2-acctorg/srm2-acctorg.module';
import { Srm2BankModule } from '@/modules/basic-data/srm2/srm2-bank/srm2-bank.module';
import { Srm2BankBranchModule } from '@/modules/basic-data/srm2/srm2-bankbranch/srm2-bankbranch.module';
import { Srm2BdgOrgModule } from '@/modules/basic-data/srm2/srm2-bdgorg/srm2-bdgorg.module';
import { Srm2CashPrjModule } from '@/modules/basic-data/srm2/srm2-cashprj/srm2-cashprj.module';
import { Srm2BasicItemDataModule } from '@/modules/basic-data/srm2/srm2-items/srm2-basic-item-data.module';
import { Srm2BasicRcvDataModule } from '@/modules/basic-data/srm2/srm2-rcv/srm2-basic-rcv-data.module';
import { PlsqlModule } from '@/modules/plsql/plsql.module';

@Module({
    imports: [
        // 使用配置
        ConfigModule.forRoot({
            envFilePath: `.env`,
            isGlobal: true,
        }),

        // feature modules from here.
        // Database,
        OracleDbModule,
        // auth
        AuthModule,

        ThrottlerModule.forRoot({}),

        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                connection: {
                    host:
                        configService.get<string>('REDIS_HOST') || 'localhost',
                    port: configService.get<number>('REDIS_PORT') || 6379,
                    password: configService.get<string>('REDIS_PASSWORD'),
                },
            }),
            inject: [ConfigService],
        }),
        // register the bull-board module forRoot in your app.module
        BullBoardModule.forRoot({
            route: '/queues',
            adapter: ExpressAdapter,
            middleware: BasicAuthMiddleware,
        }),

        Srm2BasicItemDataModule,
        Srm2BasicRcvDataModule,
        Srm2BdgOrgModule,
        Srm2AcctOrgModule,
        Srm2CashPrjModule,
        Srm2BankModule,
        Srm2BankBranchModule,
        PlsqlModule.forRoot(),
    ],
    providers: [
        // 用于bullboard的路由
        BasicAuthMiddleware,
        // 用于全局请求鉴权
        {
            provide: APP_GUARD,
            useClass: AccessTokenAuthGuard,
        },
        // 用于规范化response结构
        {
            provide: APP_INTERCEPTOR,
            useClass: GlobalInterceptor,
        },
        // 用于处理exception规范返回
        {
            provide: APP_FILTER,
            useClass: GlobalExceptionsFilter,
        },
    ],
})
export class AppModule {}
