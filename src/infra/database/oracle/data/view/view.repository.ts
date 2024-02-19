import { Logger } from '@nestjs/common';

import OracleDB, { OUT_FORMAT_OBJECT } from 'oracledb';

import {
    OracleWhereParameter,
    OracleWhereParameters,
    OracleWhereOprators,
} from '@/infra/database/oracle/data/base/oracle.parameter';
import { PlainClass } from '@/infra/database/oracle/data/interfaces/column-mapper';

import { ViewEntity } from '@/infra/database/oracle/data/view/view.entity';

import { OracleConnectionFactory } from '../../connections/oracle-connnection.factory';

import { FindOptionsWhere } from '../interfaces/find-options-where';

import { IOracleResults } from '../interfaces/ioracle-results';
import {
    IOracleOrderBy,
    OracleLimitRow,
    OraclePaginationType,
} from '../interfaces/ioracle.parameter';

import { IRepository } from '../interfaces/irepository';

import { LoggerOracle } from '../utils/logger-oracle';

import { ViewMetadata } from './view.metadata';

/**
 * Base Oracle Repository
 */
export class ViewRepository<T extends ViewEntity> implements IRepository<T, T> {
    /**
     * Create base reposytory
     */
    constructor(metadata: ViewMetadata<T>) {
        this.metadata = metadata;
    }

    protected metadata: ViewMetadata<T>;

    private readonly logger: Logger = new Logger(this.constructor.name);

    protected autoCommit: boolean = true;

    private _showLog: boolean = process.env.NODE_ENV === 'local';

    private readonly loggerOracle: LoggerOracle = new LoggerOracle(
        this.logger,
        this._showLog,
    );

    // protected poolAlias;

    /**
     *
     * @description map query data to entity
     *
     */
    mapData(data: PlainClass, fields?: Array<string>): any {
        const result: any = {};

        if (!data) return null;

        const keys = Object.keys(this.metadata.columnMapper);

        for (const key of keys) {
            if (
                (fields?.length ?? 0) < 1 ||
                fields?.find((e) => e === key) ||
                key === 'id'
            ) {
                const columnValue = data
                    ? data[(this.metadata.columnMapper as any)[key].name] ??
                      null
                    : null;

                const toEntity =
                    (this.metadata.columnMapper as any)[key].toEntity ?? null;

                if (toEntity) result[key] = toEntity(columnValue);
                else result[key] = columnValue;
            }
        }

        // 使用pk设置id
        // 如果没有，使用rowid

        const { key: pk } = this.metadata.primaryKey ?? {};

        if (pk) result.id = result[pk];
        else result.id = data.ROWID;

        return result as T;
    }

    mapArrayData(data: PlainClass[], fields?: Array<string>): T[] {
        const result: any[] = [];

        for (const e of data) {
            result.push(this.mapData(e, fields));
        }

        return result as T[];
    }

    /**
     * Find row by primary key
     */
    async findById(id: number | string): Promise<{
        success: boolean;
        data: T | null;
        errorCode?: string;
        message?: string;
    }> {
        this.log('findById');
        // create criteria
        const criteria = this.createPkCriteria(id);
        // build select
        const query = this.metadata.createQuery(criteria);
        this.loggerOracle.logStatement(query);
        // open connection
        const { success, connection, errorCode, message } =
            await OracleConnectionFactory.getConnection(
                this.metadata.databaseName,
            );
        if (!success) return { success, data: null, errorCode, message };
        // get results

        let drop = false;

        try {
            const result = await connection.execute<T>(
                query.sql,
                query.bindParams,
                { maxRows: 1, outFormat: OUT_FORMAT_OBJECT, ...query.options },
            );

            this.loggerOracle.logFind(result);

            let data: any;
            if (result && result.rows && result.rows.length > 0) {
                [data] = result.rows;
            }

            data = this.mapData(data);

            return { success: true, data };
        } catch (error: any) {
            drop = true;
            this.logger.error(error);
            return {
                success: false,
                data: null,
                errorCode: error.code,
                message: error.message,
            };
        } finally {
            if (connection) {
                try {
                    await connection.close({ drop });
                } catch (err: any) {
                    this.logger.error(
                        `error in close connection ${err.message}`,
                    );
                }
            }
        }
    }

    /**
     * Find one row by
     *
     * Criteria always use operator AND
     */
    async findOneBy(criteria: FindOptionsWhere<T>): Promise<{
        success: boolean;
        data: T | null;
        errorCode?: string;
        message?: string;
    }> {
        this.log('findOneBy');
        const query = this.metadata.createQuery(criteria);
        this.loggerOracle.logStatement(query);
        // open connection
        const { success, connection, errorCode, message } =
            await OracleConnectionFactory.getConnection(
                this.metadata.databaseName,
            );
        if (!success) return { success, data: null, errorCode, message };
        // get results

        let drop = false;

        try {
            const result = await connection.execute(
                query.sql,
                query.bindParams,
                { maxRows: 1, outFormat: OUT_FORMAT_OBJECT, ...query.options },
            );

            this.loggerOracle.logFind(result);

            let data: any = null;
            if (result && result.rows && result.rows.length > 0) {
                [data] = result.rows;
            }

            data = this.mapData(data);

            return { success: true, data };
        } catch (error: any) {
            this.logger.error(error);
            drop = true;
            return {
                success: false,
                data: null,
                errorCode: error.code,
                message: error.message,
            };
        } finally {
            if (connection) {
                try {
                    await connection.close({ drop });
                } catch (err: any) {
                    this.logger.error(
                        `error in close connection ${err.message}`,
                    );
                }
            }
        }
    }

    /**
     * Find rows by criteria/parameters
     *
     * Object 'criteria' always use operator AND
     *
     * To use other operator use {@link OracleParameter}
     */
    async find(
        criteria:
            | FindOptionsWhere<T>
            | { where: FindOptionsWhere<T>; op?: OracleWhereOprators }
            | {
                  where: FindOptionsWhere<T>;
                  op?: OracleWhereOprators;
              }[],
        options?: {
            fields?: Array<string>;
            order?: IOracleOrderBy;
            limit?: OracleLimitRow;
        },
    ): Promise<{
        success: boolean;
        data?: T[] | null;
        errorCode?: string;
        message?: string;
    }> {
        this.log('find');
        let actualCriteria: any = null;

        if (Array.isArray(criteria)) {
            actualCriteria = new OracleWhereParameters(
                this.metadata.columnMapper,
                criteria,
            );
        } else {
            if (Object.keys(criteria).find((key) => key === 'where')) {
                const { where, op } = criteria as {
                    where: FindOptionsWhere<T>;
                    op?: OracleWhereOprators;
                };

                actualCriteria = new OracleWhereParameter(
                    this.metadata.columnMapper,
                    where,
                    op,
                );
            } else actualCriteria = criteria;
        }
        const query = this.metadata.createQuery(
            actualCriteria,
            options?.fields,
            options?.limit,
            options?.order,
        );

        this.loggerOracle.logStatement(query);

        // open connection
        const { success, connection, errorCode, message } =
            await OracleConnectionFactory.getConnection(
                this.metadata.databaseName,
            );
        if (!success) return { success, data: null, errorCode, message };
        // get results

        let drop = false;

        try {
            const result = await connection.execute<T>(
                query.sql,
                query.bindParams,
                { outFormat: OUT_FORMAT_OBJECT, ...query.options },
            );

            this.loggerOracle.logFind(result);

            let data: T[] = [];
            if (result && result.rows && result.rows.length > 0) {
                data = result.rows ?? null;
            }

            data = this.mapArrayData(data, options?.fields) as T[];

            return { success: true, data };
        } catch (error: any) {
            this.logger.error(error);
            drop = true;
            return {
                success: false,
                data: null,
                errorCode: error.code,
                message: error.message,
            };
        } finally {
            if (connection) {
                try {
                    await connection.close({ drop });
                } catch (err: any) {
                    this.logger.error(
                        `error in close connection ${err.message}`,
                    );
                }
            }
        }
    }

    /**
     * Find rows by criteria/parameters
     *
     * Object 'criteria' always use operator AND
     *
     * To use other operator use {@link OracleParameter}
     */
    async findWithPagination(
        // criteria:
        //     | FindOptionsWhere<T>
        //     | OracleParameter<T>
        //     | OracleParameters<T>,

        whereOptions:
            | FindOptionsWhere<T>
            | { where: FindOptionsWhere<T>; op?: OracleWhereOprators }
            | {
                  where: FindOptionsWhere<T>;
                  op?: OracleWhereOprators;
              }[],
        pagination: OraclePaginationType,
        options?: {
            fields?: Array<string>;
            order?: IOracleOrderBy;
        },
    ): Promise<{
        success: boolean;
        data?: IOracleResults<T>;
        errorCode?: string;
        message?: string;
    }> {
        this.log('find');
        if (!pagination || Object.keys(pagination).length === 0) {
            throw new Error('pagination is required');
        }

        let criteria: any = null;

        if (Array.isArray(whereOptions)) {
            criteria = new OracleWhereParameters(
                this.metadata.columnMapper,
                whereOptions,
            );
        } else {
            if (Object.keys(whereOptions).find((key) => key === 'where')) {
                const { where, op } = whereOptions as {
                    where: FindOptionsWhere<T>;
                    op?: OracleWhereOprators;
                };

                criteria = new OracleWhereParameter(
                    this.metadata.columnMapper,
                    where,
                    op,
                );
            } else criteria = whereOptions;
        }
        // build query pagination
        const query = this.metadata.createCriteriaOffset(
            criteria,
            pagination,
            options?.fields,
            options?.order,
        );
        this.loggerOracle.logStatement(query);

        // open connection
        const { success, connection, errorCode, message } =
            await OracleConnectionFactory.getConnection(
                this.metadata.databaseName,
            );
        if (!success) return { success, errorCode, message };
        // get results

        let drop = false;

        try {
            const result = await connection.execute(
                query.sql,
                query.bindParams,
                { outFormat: OUT_FORMAT_OBJECT, ...query.options },
            );

            const rows: any = result.rows ?? [];

            const total = rows.length > 0 ? rows[0].TOTAL ?? 0 : 0;

            const list = this.mapArrayData(rows, options?.fields);

            // console.log(query);

            this.loggerOracle.logFind(result);

            const data: any = {
                list,
                count: list.length,
                total,
            };

            return { success: true, data };
        } catch (error: any) {
            this.logger.error(error);
            drop = true;
            return {
                success: false,
                errorCode: error.code,
                message: error.message,
            };
        } finally {
            if (connection) {
                try {
                    await connection.close({ drop });
                } catch (err: any) {
                    this.logger.error(
                        `error in close connection ${err.message}`,
                    );
                }
            }
        }
    }

    /**
     * Save row
     */
    async save(entity: Partial<T>): Promise<{
        success: boolean;
        data?: T;
        errorCode?: string;
        message?: string;
        result?: OracleDB.Result<any>;
    }> {
        this.log('save');
        const returnEntity = entity;
        const query = this.metadata.createInsertCommand(entity);
        this.loggerOracle.logStatement(query);

        // open connection
        const { success, connection, errorCode, message } =
            await OracleConnectionFactory.getConnection(
                this.metadata.databaseName,
            );
        if (!success) return { success, errorCode, message };

        // execute insert
        let drop = false;
        try {
            const result = await connection.execute<any>(
                query.sql,
                query.bindParams,
                {
                    autoCommit: this.autoCommit,
                    ...query.options,
                },
            );

            const pk = this.metadata.primaryKey.key ?? null;
            const pkValue = result.outBinds.id[0] ?? null;

            if (pk && pkValue) (returnEntity as any)[pk] = pkValue;
            (returnEntity as any).id = pkValue;

            this.loggerOracle.logFind(result);

            const data: T = returnEntity as any;

            return { success: true, data, result };
        } catch (error: any) {
            this.logger.error(error);
            drop = true;
            return {
                success: false,
                errorCode: error.code,
                message: error.message,
            };
        } finally {
            if (connection) {
                try {
                    await connection.close({ drop });
                } catch (err: any) {
                    this.logger.error(
                        `error in close connection ${err.message}`,
                    );
                }
            }
        }
    }

    /**
     * Save many
     *
     */
    async saveMany(entities: Partial<T>[]): Promise<{
        success: boolean;
        data?: T[];
        errorCode?: string;
        message?: string;
        result?: OracleDB.Result<any>;
    }> {
        this.log('saveMany');
        const returnEntities: any[] = [];
        const query = this.metadata.createBatchInsertCommand(entities);
        this.loggerOracle.logStatement(query);

        // open connection
        const { success, connection, errorCode, message } =
            await OracleConnectionFactory.getConnection(
                this.metadata.databaseName,
            );
        if (!success) return { success, errorCode, message };

        // execute insert
        let drop = false;
        try {
            const result = await connection.executeMany<any>(
                query.sql,
                query.bindParams,
                {
                    autoCommit: this.autoCommit,
                    ...query.options,
                },
            );

            const pk = this.metadata.primaryKey.key ?? null;
            console.log(pk);
            if (result.outBinds)
                for (const i in entities) {
                    const pkValue = result.outBinds[i].id[0] ?? null;
                    const returnEntity = entities[i];
                    if (pk && pkValue) (returnEntity as any)[pk] = pkValue;
                    (returnEntity as any).id = pkValue;
                    returnEntities[i] = returnEntity;
                }

            this.loggerOracle.logFind(result);

            return { success: true, data: returnEntities, result };
        } catch (error: any) {
            this.logger.error(error);
            drop = true;
            return {
                success: false,
                errorCode: error.code,
                message: error.message,
            };
        } finally {
            if (connection) {
                try {
                    await connection.close({ drop });
                } catch (err: any) {
                    this.logger.error(
                        `error in close connection ${err.message}`,
                    );
                }
            }
        }
    }

    /**
     * Update row
     */
    async update(
        id: number | string,
        data: Partial<T>,
    ): Promise<{
        success: boolean;
        errorCode?: string;
        message?: string;
        result?: OracleDB.Result<any>;
    }> {
        this.log('update');
        const criteria: any = { id };
        // criteria[this.primaryKeyName] = id;
        console.log(criteria);
        const query = this.metadata.createUpdateCommand(data, criteria);
        this.loggerOracle.logStatement(query);

        // open connection
        const { success, connection, errorCode, message } =
            await OracleConnectionFactory.getConnection(
                this.metadata.databaseName,
            );
        if (!success) return { success, errorCode, message };

        // execute update
        let drop = false;
        try {
            const result = await connection.execute(
                query.sql,
                query.bindParams,
                {
                    autoCommit: this.autoCommit,
                },
            );

            this.loggerOracle.logUpdate(result);

            return { success: true, result };
        } catch (error: any) {
            this.logger.error(error);
            drop = true;
            return {
                success: false,
                errorCode: error.code,
                message: error.message,
            };
        } finally {
            if (connection) {
                try {
                    await connection.close({ drop });
                } catch (err: any) {
                    this.logger.error(
                        `error in close connection ${err.message}`,
                    );
                }
            }
        }
    }

    /**
     * Update many
     *
     */
    async updateMany(
        entities: Partial<T>[],
        by: string[],
    ): Promise<{
        success: boolean;
        errorCode?: string;
        message?: string;
        result?: OracleDB.Result<any>;
    }> {
        this.log('updateMany');
        const returnEntity = entities;
        const query = this.metadata.createUpdateManyCommand(entities, by);
        this.loggerOracle.logStatement(query);

        // open connection
        const { success, connection, errorCode, message } =
            await OracleConnectionFactory.getConnection(
                this.metadata.databaseName,
            );
        if (!success) return { success, errorCode, message };

        // execute insert
        let drop = false;
        try {
            const result = await connection.executeMany<any>(
                query.sql,
                query.bindParams,
                {
                    autoCommit: true,
                    ...query.options,
                    batchErrors: false,
                },
            );

            const pk = this.metadata.primaryKey.key ?? null;
            if (result.outBinds)
                for (let i = 0; i++; i < entities.length) {
                    const pkValue = result.outBinds[i][pk][i] ?? null;
                    if (pk && pkValue) (returnEntity[i] as any)[pk] = pkValue;
                }

            this.loggerOracle.logFind(result);

            return { success: true, result };
        } catch (error: any) {
            this.logger.error(error);
            drop = true;
            return {
                success: false,
                errorCode: error.code,
                message: error.message,
            };
        } finally {
            if (connection) {
                try {
                    await connection.close({ drop });
                } catch (err: any) {
                    this.logger.error(
                        `error in close connection ${err.message}`,
                    );
                }
            }
        }
    }

    /**
     * Delete row
     */
    async deleteById(id: string | number): Promise<{
        success: boolean;
        errorCode?: string;
        message?: string;
        result?: OracleDB.Result<any>;
    }> {
        this.log('deleteById');
        // create criteria
        const criteria = this.createPkCriteria(id);
        // build delete from criteriaia
        const query = this.metadata.createDeleteCommand(criteria);
        this.loggerOracle.logStatement(query);
        // open connection
        const { success, connection, errorCode, message } =
            await OracleConnectionFactory.getConnection(
                this.metadata.databaseName,
            );
        if (!success) return { success, errorCode, message };

        // execute update
        let drop = false;
        try {
            const result = await connection.execute(
                query.sql,
                query.bindParams,
                {
                    autoCommit: this.autoCommit,
                },
            );

            this.loggerOracle.logDelete(result);

            return { success: true, result };
        } catch (error: any) {
            this.logger.error(error);
            drop = true;
            return {
                success: false,
                errorCode: error.code,
                message: error.message,
            };
        } finally {
            if (connection) {
                try {
                    await connection.close({ drop });
                } catch (err: any) {
                    this.logger.error(
                        `error in close connection ${err.message}`,
                    );
                }
            }
        }
    }

    /**
     * Delete row by criteria
     */
    async delete(criteria: FindOptionsWhere<T>): Promise<{
        success: boolean;
        errorCode?: string;
        message?: string;
        result?: OracleDB.Result<any>;
    }> {
        this.log('delete');
        // build delete from criteria
        const query = this.metadata.createDeleteCommand(criteria);
        this.loggerOracle.logStatement(query);
        // open connection
        const { success, connection, errorCode, message } =
            await OracleConnectionFactory.getConnection(
                this.metadata.databaseName,
            );
        if (!success) return { success, errorCode, message };

        // execute delete
        let drop = false;
        try {
            const result = await connection.execute(
                query.sql,
                query.bindParams,
                {
                    autoCommit: this.autoCommit,
                },
            );

            this.loggerOracle.logDelete(result);

            return { success: true, result };
        } catch (error: any) {
            this.logger.error(error);
            drop = true;
            return {
                success: false,
                errorCode: error.code,
                message: error.message,
            };
        } finally {
            if (connection) {
                try {
                    await connection.close({ drop });
                } catch (err: any) {
                    this.logger.error(
                        `error in close connection ${err.message}`,
                    );
                }
            }
        }
    }

    /**
     * Execute SQL statement SELECT
     */
    async query(
        sqlText: string,
        params?: OracleWhereParameter<any> | OracleWhereParameters<T>,
        orderBy?: IOracleOrderBy,
    ): Promise<{
        success: boolean;
        data?: any[];
        errorCode?: string;
        message?: string;
    }> {
        const query = this.metadata.injectParams(sqlText, params, orderBy);
        this.loggerOracle.logStatement(query);
        // open connection
        const { success, connection, errorCode, message } =
            await OracleConnectionFactory.getConnection(
                this.metadata.databaseName,
            );
        if (!success) return { success, errorCode, message };
        // get results

        let drop = false;

        try {
            const result = await connection.execute(
                query.sql,
                {},
                { outFormat: OUT_FORMAT_OBJECT, ...query.options },
            );

            this.loggerOracle.logFind(result);

            let data: any = null;
            if (result && result.rows && result.rows.length > 0) {
                data = result.rows ?? [];
            }

            return { success: true, data };
        } catch (error: any) {
            this.logger.error(error);
            drop = true;
            return {
                success: false,
                errorCode: error.code,
                message: error.message,
            };
        } finally {
            if (connection) {
                try {
                    await connection.close({ drop });
                } catch (err: any) {
                    this.logger.error(
                        `error in close connection ${err.message}`,
                    );
                }
            }
        }
    }

    /**
     * Update row
     */
    async updateCriteria(
        criteria: FindOptionsWhere<T>,
        data: Partial<T>,
    ): Promise<{
        success: boolean;
        errorCode?: string;
        message?: string;
        result?: OracleDB.Result<T>;
    }> {
        this.log('updateCriteria');

        const sqlCommand = this.metadata.createUpdateCommand(data, criteria);
        // open connection
        this.loggerOracle.logStatement(sqlCommand);
        const { success, connection, errorCode, message } =
            await OracleConnectionFactory.getConnection(
                this.metadata.databaseName,
            );
        if (!success) return { success, errorCode, message };

        // execute update
        let drop = false;
        try {
            const result = await connection.execute<T>(
                sqlCommand.sql,
                sqlCommand.bindParams,
                {
                    autoCommit: this.autoCommit,
                },
            );

            this.loggerOracle.logUpdate(result);

            return { success: true, result };
        } catch (error: any) {
            this.logger.error(error);
            drop = true;
            return {
                success: false,
                errorCode: error.code,
                message: error.message,
            };
        } finally {
            if (connection) {
                try {
                    await connection.close({ drop });
                } catch (err: any) {
                    this.logger.error(
                        `error in close connection ${err.message}`,
                    );
                }
            }
        }
    }

    /**
     * Commit transaction
     */
    protected async commit(connection: OracleDB.Connection): Promise<void> {
        try {
            await connection?.commit();
        } catch (error: any) {
            this.handleError(error, 'commit');
        }
    }

    /**
     * Rollback files
     */
    protected async rollback(connection: OracleDB.Connection): Promise<void> {
        try {
            await connection?.commit();
        } catch (error: any) {
            this.handleError(error, 'rollback');
        }
    }

    /**
     * Check rows affected
     */
    protected hasAffected(result: OracleDB.Result<any>): boolean {
        return (result?.rowsAffected ?? 0) > 0;
    }

    /**
     * Handle error
     */
    protected handleError(error: Error, funcName: string) {
        const message = error instanceof Error ? error.message : error;
        this.logger.error(`${funcName ?? ''} ${message}`);
        throw error;
    }

    /**
     * Creta criteria using primary key name
     */
    private createPkCriteria(id: string | number) {
        // create param
        const criteria: any = {};

        const { key: pk, dbTypeName: typeName } = this.metadata.primaryKey;

        // console.log('!!!');

        // set value on primary key name
        if (typeName && typeName === 'NUMBER') {
            criteria[this.metadata.primaryKey.key] = parseInt(
                id.toString(),
                10,
            );
        } else {
            if (pk) criteria[this.metadata.primaryKey.key] = id.toString();
            else criteria.rowid = id.toString();
        }
        return criteria;
    }

    /**
     * Print logs
     */
    protected log(message: any) {
        if (this._showLog) {
            this.logger.log(
                message instanceof Error ? message.message : message,
            );
        }
    }

    /**
     * Show logs
     */
    public showLog(enable: boolean) {
        this._showLog = enable ?? false;
    }
}
