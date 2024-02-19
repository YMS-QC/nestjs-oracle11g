import { ConnectionAttributes, PoolAttributes } from 'oracledb';

export type StandaloneConnectionConfig = {
    databaseName: string;
    user: string;
    password: string;
    connectionString: string;
} & ConnectionAttributes;

export type PoolConnectionConfig = {
    poolAlias: string;
    user: string;
    password: string;
    connectionString: string;
    poolMin: number;
    poolMax: number;
} & PoolAttributes;
