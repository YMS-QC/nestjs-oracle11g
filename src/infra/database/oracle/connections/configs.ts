import { ConfigService } from '@nestjs/config';

import {
    PoolConnectionConfig,
    StandaloneConnectionConfig,
} from '@/infra/database/oracle/connections/types';
import { ERP_PLSQL_POOL_NAME } from '@/modules/plsql/constants';

export function dbConfigs(config: ConfigService) {
    const oracleConfig: Array<
        PoolConnectionConfig | StandaloneConnectionConfig
    > = [
        {
            poolAlias: 'ERP',
            user: config.get('ERP_USER'),
            password: config.get('ERP_PASSWORD'),
            connectionString: config.get('ERP_CONNECTION_STRING'),
            poolMax: Number(config.get('ERP_POOL_MAX')),
            poolMin: Number(config.get('ERP_POOL_MIN')),
        },
        {
            poolAlias: 'C1_DW',
            user: config.get('C1_DW_USER'),
            password: config.get('C1_DW_PASSWORD'),
            connectionString: config.get('C1_DW_CONNECTION_STRING'),
            poolMax: Number(config.get('C1_DW_POOL_MAX')),
            poolMin: Number(config.get('C1_DW_POOL_MIN')),
        },
        {
            poolAlias: 'TGS',
            user: config.get('TGS_USER'),
            password: config.get('TGS_PASSWORD'),
            connectionString: config.get('TGS_CONNECTION_STRING'),
            poolMax: Number(config.get('TGS_POOL_MAX')),
            poolMin: Number(config.get('TGS_POOL_MIN')),
        },
        {
            poolAlias: ERP_PLSQL_POOL_NAME,
            user: config.get('ERP_USER'),
            password: config.get('ERP_PASSWORD'),
            connectionString: config.get('ERP_CONNECTION_STRING'),
            poolMax: Number(config.get('ERP_PLSQL_POOL_MAX')),
            poolMin: Number(config.get('ERP_PLSQL_POOL_MAX')),
            enableStatistics: true, // 需要展示统计信息
            queueTimeout: Number(config.get('ERP_PLSQL_QUEUE_TIMEOUT')), // 获取链接的最大等待时间
        },
    ];

    return oracleConfig;
}
