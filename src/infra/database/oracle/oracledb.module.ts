import { Logger, Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';

import OracleDB from 'oracledb';

import { dbConfigs } from '@/infra/database/oracle/connections/configs';
import { OracleConnectionFactory } from '@/infra/database/oracle/connections/oracle-connnection.factory';
import { DatabaseService } from '@/infra/database/oracle/database.service';

@Module({
    imports: [ConfigModule],
    providers: [
        {
            inject: [ConfigService],
            provide: DatabaseService.name,
            useFactory: async (config: ConfigService) => {
                const logger = new Logger(DatabaseService.name);

                // Oracle 11g 必须使用thick mode 也就是需要使用instantclient 连接数据库
                const libDir = config.get('ORACLE_LIBDIR');
                logger.log('初始化instantclient');
                if (libDir) {
                    logger.log('检测有libDir变量');
                    OracleDB.initOracleClient({ libDir });
                } else {
                    OracleDB.initOracleClient();
                }

                await OracleConnectionFactory.initDatabases(
                    dbConfigs(config),
                    logger,
                );

                return new DatabaseService();
            },
        },
    ],
})
export class OracleDbModule {}
