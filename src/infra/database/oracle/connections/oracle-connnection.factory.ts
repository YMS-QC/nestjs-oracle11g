import { Logger } from '@nestjs/common';
import OracleDB, { Connection, PoolAttributes } from 'oracledb';

import {
    PoolConnectionConfig,
    StandaloneConnectionConfig,
} from '@/infra/database/oracle/connections/types';

export const DEFAULT_POOL_NAME = 'default';

export type OraclePoolConfig = Map<string, PoolAttributes>;

export class OracleConnectionFactory {
    private static _config: Map<
        string,
        {
            configType: 'pool' | 'alone';
            configData: StandaloneConnectionConfig | PoolConnectionConfig;
        }
    > = new Map();

    private static _pools: Map<string, OracleDB.Pool> = new Map();

    private static _alones: Set<string> = new Set<string>();

    private static _staticConnections: Map<string, OracleDB.Connection> =
        new Map();

    private static async initDatabase(
        config: StandaloneConnectionConfig | PoolConnectionConfig,
        logger?: Logger,
    ) {
        const realLogger = logger ?? console;
        if (config.poolAlias) {
            const { poolAlias } = config;

            if (this._config.has(poolAlias))
                throw new Error('Duplicated poolAlias name or database name!');

            this._config.set(poolAlias, {
                configType: 'pool',
                configData: config,
            });

            try {
                realLogger.log(`initializing connection pool ${poolAlias}`);
                await OracleDB.createPool(config);
                const pool = OracleDB.getPool(poolAlias);

                realLogger.log(`storing a static connection`);

                const staticConnection = await pool.getConnection();
                this._staticConnections.set(poolAlias, staticConnection);

                realLogger.log(`static connection stored`);

                OracleConnectionFactory._pools.set(poolAlias, pool);
                realLogger.log(`initialized connection pool ${poolAlias}`);
            } catch (error: any) {
                const message = `cannot init connection pool ${poolAlias}\n${error.message}`;
                throw Error(message);
            }
        } else {
            const { databaseName } = config as StandaloneConnectionConfig;

            if (this._config.has(databaseName))
                throw new Error('Duplicated poolAlias name or database name!');

            this._config.set(databaseName, {
                configType: 'alone',
                configData: config,
            });

            try {
                realLogger.log(`connecting database ${databaseName}`);

                realLogger.log(`storing a static connection`);

                const staticConnection = await OracleDB.getConnection(config);

                this._staticConnections.set(databaseName, staticConnection);

                realLogger.log(`static connection stored`);

                this._alones.add(databaseName);
                realLogger.log(`connectd database ${databaseName}`);
            } catch (error: any) {
                const message = `cannot connect to database ${config.poolAlias}\n${error.message}`;
                throw Error(message);
            }
        }
    }

    static async initDatabases(
        configs:
            | StandaloneConnectionConfig
            | PoolConnectionConfig
            | Array<PoolConnectionConfig | StandaloneConnectionConfig>,
        logger?: Logger,
    ) {
        (logger ?? console).log(
            '====================连接数据库开始========================',
        );
        if (Array.isArray(configs)) {
            for (const config of configs) {
                await OracleConnectionFactory.initDatabase(config, logger);
            }
        } else {
            await OracleConnectionFactory.initDatabase(configs, logger);
        }
        (logger ?? console).log(
            '====================连接数据库结束========================',
        );
    }

    /**
     * @description
     * 应用关闭，最后释放连接池
     */
    static async onApplicationShutdown(signal?: string) {
        const poolConfigs = OracleConnectionFactory._config;

        for (const [key] of poolConfigs) {
            try {
                console.log(`closing connection pool - ${key}`);
                await OracleDB.getPool(key).close(1);
                console.log(`pool - ${key} closed`);
            } catch (error: any) {
                console.log(
                    `error in close connection pool - ${key} - ${error.message}`,
                );
            }
        }
    }

    static async getConnection(
        poolAliasOrName: string = DEFAULT_POOL_NAME,
    ): Promise<{
        success: boolean;
        connection: Connection;
        message?: any;
        errorCode?: any;
    }> {
        try {
            if (OracleConnectionFactory._pools.has(poolAliasOrName)) {
                const pool = OracleDB.getPool(poolAliasOrName);
                const connection = await pool.getConnection();
                return {
                    success: true,
                    connection,
                };
            }

            if (OracleConnectionFactory._alones.has(poolAliasOrName)) {
                const connection = await OracleDB.getConnection(
                    OracleConnectionFactory._config.get(poolAliasOrName)
                        .configData,
                );
                return {
                    success: true,
                    connection,
                };
            }

            return {
                success: false,
                connection: null,
                message: 'wrong poolAlias or databasename plz check configs',
                errorCode: 'E9999',
            };
        } catch (error: any) {
            return {
                success: false,
                connection: null,
                errorCode: error.errorNum,
                message: error.message,
            };
        }
    }

    static async getStandaloneConnection(
        user: string,
        connectionString: string,
        password: string,
    ): Promise<{
        success: boolean;
        connection: Connection;
        message: any;
        errorCode: any;
    }> {
        try {
            const connection = await OracleDB.getConnection({
                user,
                connectionString,
                password,
            });
            return {
                success: true,
                connection,
                message: 'SUCCESS',
                errorCode: null,
            };
        } catch (error: any) {
            return {
                success: false,
                connection: null,
                errorCode: error.errorNum,
                message: error.message,
            };
        }
    }

    static getStaticConnection(poolAliasOrDbname: string): OracleDB.Connection {
        return this._staticConnections.get(poolAliasOrDbname);
    }
}
