import OracleDB from 'oracledb';

import { DEFAULT_POOL_NAME } from '@/infra/database/oracle/connections/oracle-connnection.factory';

import {
    OracleWhereParameter,
    OracleWhereParameters,
    instanceOfParameter,
} from '@/infra/database/oracle/data/base/oracle.parameter';
import { OracleDBTypes } from '@/infra/database/oracle/data/base/oracledb-types';

import { ViewEntity } from '@/infra/database/oracle/data/view/view.entity';

import { ColumnMapper } from '../interfaces/column-mapper';
import { FindOptionsWhere } from '../interfaces/find-options-where';
import {
    IOracleOrderBy,
    OracleExcuteManyStatement,
    OracleLimitRow,
    OraclePaginationType,
    OracleStatement,
} from '../interfaces/ioracle.parameter';
import { ObjectUtil } from '../utils/object.util';

/**
 * Base Oracle Metadata
 */
export abstract class ViewMetadata<T extends ViewEntity> {
    /**
     * PoolAilas
     *
     */
    databaseName: string = DEFAULT_POOL_NAME;
    /**
     * Schema name
     *
     */
    abstract get schema(): string;

    /**
     * view name and base query
     */
    abstract get baseSQL(): string;

    /**
     * table name
     */
    abstract get viewName(): string | null | undefined;
    /**
     * table name
     */
    abstract get tableName(): string | null | undefined;

    get selectFrom(): string {
        if (this.baseSQL) return `(${this.baseSQL})`;
        if (this.viewName) return `${this.schema}.${this.tableName}`;
        throw new Error('ViewEntity must have valid base SQL or View');
    }

    /**
     * Primary key name
     */

    abstract get primaryKey():
        | {
              key: string;
              column: string;
              dbTypeName: string;
              sequence?: { schema: string; name: string };
          }
        | Record<string, never>;

    /**
     * Metadata array of fields from table
     */
    abstract columnMapper: ColumnMapper<T>;

    get pkNextValSql(): string {
        const { sequence } = this.primaryKey;
        if (sequence) return `${sequence.schema}.${sequence.name}.NEXTVAL`;
        return '';
    }

    /**
     * Fields for quert
     */
    get fields(): string[] {
        const fields: string[] = [];
        for (const i of Object.keys(this.columnMapper)) {
            fields.push(i);
        }
        return fields;
    }

    get columns(): string[] {
        const fields: string[] = [];
        for (const i of Object.entries(this.columnMapper)) {
            fields.push(i[1].name);
        }
        return fields;
    }

    /**
     * Create SELECT from oracle parameters
     */
    createQuery(
        params:
            | FindOptionsWhere<T>
            | OracleWhereParameter<T>
            | OracleWhereParameters<T>,
        fields?: string[],
        limit?: OracleLimitRow,
        orderBy?: IOracleOrderBy,
    ): OracleStatement {
        let top = '';
        if (limit) {
            if (limit.top > 1) {
                top = ` AND ROWNUM <= ${limit.top}`;
            } else if (limit.top === 1) {
                top = ` AND ROWNUM = ${limit.top}`;
            }
        }
        let fieldsName: string[];
        const columnFieldsBindArray: string[] = [];

        if (fields && fields.length > 0) {
            for (const f of fields) {
                if (!this.fields.includes(f)) {
                    throw new Error(`field name is invalid ${f}`);
                }
            }

            // 这里至少需要id
            fieldsName = fields.concat('id');
        } else {
            fieldsName = this.fields;
        }

        // fetchInfo 用于处理clob类型
        const fetchInfo: any = {};

        for (const entry of Object.entries(this.columnMapper)) {
            if (fieldsName.find((filed) => filed === entry[0])) {
                columnFieldsBindArray.push(`${entry[1].name}`);
                if (entry[1].dbTypeName === 'CLOB') {
                    fetchInfo[entry[1].name] = { type: OracleDB.STRING };
                }
            }
        }

        // 如果有没有pk 则需要rowId 否则可以不需要

        const { key: pk, column } = this.primaryKey ?? {};

        // 视图查询必须有主键
        if (!pk) throw new Error('ViewEntity must have primary key!');

        const baseSql = `SELECT ${column}, ${columnFieldsBindArray} \nFROM ${this.selectFrom}`;

        const paramsRecord = params?.value ? params.value : params;
        if (ObjectUtil.isEmpty(paramsRecord)) {
            const sql = `${baseSql} ${top.replace('AND ', '')}`;

            return { sql, bindParams: {}, options: {} };
        }

        if (instanceOfParameter(params)) {
            const whereParams = params.value(false);
            const sql = `${baseSql} \nWHERE ${whereParams.sql}${top}`;
            return { sql, bindParams: whereParams.bindParams, options: {} };
        }
        // 如果是简单的FindOptions
        const { whereOptions, bindParams } = this.extractCriteriaNative(params);

        let order = '';
        if (orderBy) {
            order = `\nORDER BY ${orderBy.field} ${orderBy.direction ?? ''}`;
        } else {
            order = '';
        }

        const sql = `${baseSql} \nWHERE ${whereOptions}${top}\n${order}`;

        return { sql, bindParams, options: { fetchInfo } };
    }

    /**
     * Inject parameters on statement
     */
    injectParams(
        sqlText: string,
        params?:
            | OracleWhereParameter<any>
            | OracleWhereParameters<any>
            | FindOptionsWhere<any>,
        orderBy?: IOracleOrderBy,
    ): OracleStatement {
        let bindParams: any = {};
        let whereOptions = '';

        if (!params) return { sql: sqlText, bindParams: {}, options: {} };
        if (instanceOfParameter(params)) {
            const whereParams = params.value(false);
            whereOptions = whereParams.sql;
            bindParams = params.value;
        } else {
            const result = this.extractCriteriaNative(params);
            whereOptions = result.whereOptions;
            bindParams = result.bindParams;
        }
        let order = '';
        if (orderBy) {
            order = `\nORDER BY ${orderBy.field} ${orderBy.direction ?? ''}`;
        } else {
            order = '';
        }
        let sql = '';
        if (sqlText.includes('WHERE')) {
            sql = `${sqlText} \n ${whereOptions} \n${order}`;
        } else {
            sql = `${sqlText} \nWHERE ${whereOptions} \n${order}`;
        }
        return { sql, bindParams, options: {} };
    }

    /**
     * Get sql text SELECT from criteria native
     */
    extractCriteriaNative(
        criteria: FindOptionsWhere<T>,
        paramPrefix: string = 'p_',
    ): { whereOptions: string; bindParams: OracleDB.BindParameters } {
        //
        if (!this.tableName) throw new Error('Entities has no table name!');
        if (!criteria) throw new Error('criteria is not provided');
        const keys = Object.keys(criteria);
        const bindParams: OracleDB.BindParameters = {};
        const { key: pk, column: pkColumn } = this.primaryKey ?? {};

        // 视图查询必须有主键
        if (!pk || !pkColumn)
            throw new Error('ViewEntity must have primary key!');

        let whereOptions = '';
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            let column = ``;

            if (key === 'id') {
                column = pkColumn;
            } else {
                column = this.columnMapper[key]?.name ?? key;
            }

            const bindKey = paramPrefix + key;

            const value = (criteria as any)[key];

            (bindParams as any)[bindKey] = {
                dir: OracleDB.BIND_IN,
                val: value,
            };

            if (i === 0) {
                whereOptions += `${column} = :${bindKey}\n`;
            } else if (i < keys.length - 1) {
                whereOptions += `AND ${column} = :${bindKey}\n`;
            } else {
                whereOptions += `AND ${column} = :${bindKey}`;
            }
        }
        return { whereOptions, bindParams };
    }

    /**
     * Generate where clause by keys
     *
     */
    generateWhereClause(
        keys: string[],
        paramPrefix: string = 'p_',
    ): { whereClause: string; bindKeys: string[] } {
        let whereClause = `WHERE `;
        const bindKeys: string[] = [];
        // const origKeys: string[] = [];
        for (const key of keys) {
            const column = this.columnMapper[key].name ?? null;

            if (!column)
                throw new Error(`Cannot find key${key} in column mapper`);

            const bindKey = paramPrefix + key;

            whereClause += `${column} = :${bindKey}\n`;

            bindKeys.push(bindKey);
        }

        return { whereClause, bindKeys };
    }

    /**
     * Create insert command Oracle
     */
    createInsertCommand(entity: Partial<T>): OracleStatement {
        const keys: Array<string> = Object.keys(entity);
        const keysBinds = [];
        const bindParams: any = {};
        const columns = [];
        const { key: pk } = this.primaryKey ?? {};
        const ownPkValue = pk ? Object.hasOwn(entity, pk) : false;

        if (!this.tableName) {
            throw new Error('Entities must have valid table name!');
        }

        if (pk && ownPkValue)
            throw new Error(
                'Entities has primary key should be returned by insert result!',
            );

        // if has primaryKey then return pk as id else return rowid as id

        let sqlText = ``;
        if (pk) {
            columns.push(this.columnMapper[pk].name);
            sqlText = `INSERT INTO ${this.schema}.${this.tableName} \n  (@columns) \n VALUES \n  (${this.pkNextValSql}@keysBind) \nRETURNING ${this.columnMapper[pk].name} INTO :id`;
            bindParams.id = { dir: OracleDB.BIND_OUT };
        } else {
            sqlText = `INSERT INTO ${this.schema}.${this.tableName} \n  (@columns) \n VALUES \n  (@keysBind) \nRETURNING rowid INTO :id`;
            bindParams.id = { dir: OracleDB.BIND_OUT };
        }

        for (let i = 0; i < keys.length; i++) {
            const key: string = keys[i];
            if (key !== pk) {
                columns.push(this.columnMapper[key].name);
                keysBinds.push(`:${key.toLowerCase()}`);
                const value = (entity as any)[key];
                if (value === undefined) {
                    throw new Error(
                        `createInsertCommand invalid key ${key} value ${value}`,
                    );
                }
                bindParams[key] = { dir: OracleDB.BIND_IN, val: value };
            }
        }
        const keyBindsText = keysBinds.toString();

        sqlText = sqlText.replace('@columns', columns.toString());
        sqlText = sqlText.replace(
            '@keysBind',
            pk && keyBindsText ? `,${keyBindsText}` : keyBindsText,
        );
        return {
            sql: sqlText,
            bindParams,
            options: {},
        };
    }

    /**
     * Create batch insert command and bind data to batch
     */
    createBatchInsertCommand(
        entities: Partial<T>[],
    ): OracleExcuteManyStatement {
        if (entities.length < 1)
            throw new Error(
                'Cannot create batch inset with empty entity array!',
            );

        const entity = entities[0];
        const bindDefs: any = {};

        const keys: Array<string> = Object.keys(entity);
        const firstKeyString = keys.toString();

        const keysBinds = [];
        const bindParams: any[] = [];
        const columns = [];
        const { key: pk } = this.primaryKey ?? {};
        const ownPkValue = pk ? Object.hasOwn(entity, pk) : false;

        if (!this.tableName)
            throw new Error('Entities must have valid table name!');

        if (pk && ownPkValue)
            throw new Error(
                'Entities has primary key should be returned by insert result!',
            );

        let sqlText = ``;
        if (pk) {
            columns.push(this.columnMapper[pk].name);
            sqlText = `INSERT INTO ${this.schema}.${this.tableName} \n  (@columns) \n VALUES \n  (${this.pkNextValSql}@keysBind) \nRETURNING ${this.columnMapper[pk].name} INTO :id`;
        } else {
            sqlText = `INSERT INTO ${this.schema}.${this.tableName} \n  (@columns) \n VALUES \n  (@keysBind) \nRETURNING rowid INTO :id`;
        }

        for (let i = 0; i < keys.length; i++) {
            const key: string = keys[i];

            if (key !== pk) {
                columns.push(this.columnMapper[key].name);
                keysBinds.push(`:${key}`);
                bindDefs[key] = {
                    dir: OracleDB.BIND_IN,
                    type: OracleDB.STRING,
                    maxSize: 4000,
                };
            }
        }

        bindDefs.id = {
            dir: OracleDB.BIND_OUT,
            type: OracleDB.STRING,
            maxSize: 4000,
        };

        for (const e of entities) {
            const keyString = Object.keys(e).toString();
            const bind: any = {};
            if (firstKeyString !== keyString)
                throw new Error('Entities dont have same keys');
            for (const key of keys) {
                bind[key] = e[key];
            }

            // set pk returning binds

            // push
            bindParams.push(bind);
        }

        const keyBindsText = keysBinds.toString();

        sqlText = sqlText.replace('@columns', columns.toString());
        sqlText = sqlText.replace(
            '@keysBind',
            pk && keyBindsText ? `,${keyBindsText}` : keyBindsText,
        );
        return {
            sql: sqlText,
            bindParams,
            options: { bindDefs },
        };
    }

    /**
     * Create update command Oracle
     */

    createUpdateCommand(
        entity: Partial<T>,
        criteria: FindOptionsWhere<T>,
    ): OracleStatement {
        let setSql = '';
        const { whereOptions, bindParams: bindParamsInWhereClause } =
            this.extractCriteriaNative(criteria);

        const keys: any = Object.keys(entity);
        const values: any = Object.values(entity);
        const bindParams: OracleDB.BindParameter = {};

        for (let i = 0; i < keys.length; i++) {
            const key: string = keys[i];
            const column = (this.columnMapper as any)[key].name;
            const entryValue = `${column} = :${key}`;
            const dbTypeNameStr = (this.columnMapper as any)[key].dbTypeName;
            const type = (OracleDBTypes as any)[dbTypeNameStr];
            const toColumnFunc = (this.columnMapper as any)[key].toColumn;
            const val = toColumnFunc ? toColumnFunc(values[i]) : values[i];
            // format sql
            if (i < keys.length - 1) {
                setSql += `${entryValue},`;
            } else {
                setSql += `${entryValue}`;
            }

            // console.log(values[i]);
            // bind value
            (bindParams as any)[key] = {
                dir: OracleDB.BIND_IN,
                val,
                type,
            };
        }
        const sqlText = `UPDATE ${this.schema}.${this.tableName} \nSET ${setSql} \nWHERE ${whereOptions}`;
        return {
            sql: sqlText,
            bindParams: { ...bindParams, ...bindParamsInWhereClause },
            options: {},
        };
    }

    /**
     * Create update many command
     */

    createUpdateManyCommand(
        entities: Partial<T>[],
        by: string[],
    ): OracleExcuteManyStatement {
        if (entities.length < 1)
            throw new Error(
                'Cannot create batch inset with empty entity array!',
            );

        const entity = entities[0];

        const { key: pk } = this.primaryKey ?? {};
        const ownPkValue = pk ? Object.hasOwn(entity, pk) : false;

        if (!ownPkValue)
            throw new Error('Cannot create batch update with out primary key!');

        // sql
        let setSql = '';
        // bindDefs
        const bindDefs: any = {};

        const keys: any = Object.keys(entity);
        const firstKeyString = keys.toString();

        for (let i = 0; i < keys.length; i++) {
            const key: string = keys[i];
            if (!by.find((byKey) => key === byKey)) {
                const column = (this.columnMapper as any)[key].name;
                const entryValue = `${column} = :${key}`;
                // format sql
                if (i < keys.length - 1) {
                    setSql += `${entryValue},`;
                } else {
                    setSql += `${entryValue}`;
                }

                const typeName =
                    (this.columnMapper as any)[key].dbTypeName ?? 'VARCHAR2';

                const type =
                    (OracleDBTypes as any)[typeName] ?? OracleDB.STRING;

                if (type === OracleDB.STRING)
                    bindDefs[key] = {
                        dir: OracleDB.BIND_IN,
                        type,
                        maxSize: 4000,
                    };
                else
                    bindDefs[key] = {
                        dir: OracleDB.BIND_IN,
                        type,
                    };
            }
        }

        // where clause
        // perfix
        const perfix = 'p_';
        const { whereClause, bindKeys } = this.generateWhereClause(by, perfix);
        for (let i = 0; i < bindKeys.length; i++) {
            const bindKey = bindKeys[i];
            const key = by[i];

            const typeName =
                (this.columnMapper as any)[key].dbTypeName ?? 'VARCHAR2';

            const type = (OracleDBTypes as any)[typeName] ?? OracleDB.STRING;

            if (type === OracleDB.STRING)
                bindDefs[bindKey] = {
                    dir: OracleDB.BIND_IN,
                    type,
                    maxSize: 4000,
                };
            else
                bindDefs[bindKey] = {
                    dir: OracleDB.BIND_IN,
                    type,
                };
        }

        const sql = `UPDATE ${this.schema}.${this.tableName} \nSET ${setSql} \n ${whereClause}`;

        const bindParams: any[] = [];
        for (const e of entities) {
            const keyString = Object.keys(e).toString();
            const bind: any = {};
            if (firstKeyString !== keyString)
                throw new Error('Entities don not have same keys');
            for (const key of keys) {
                if (by.find((k) => k === key)) bind[perfix + key] = e[key];
                else bind[key] = e[key];
            }

            // set pk returning binds

            // push
            bindParams.push(bind);
        }

        return { sql, bindParams, options: { bindDefs } };
    }

    /**
     * Create delete command Oracle
     */
    createDeleteCommand(criteria: FindOptionsWhere<any>): OracleStatement {
        const { whereOptions, bindParams } =
            this.extractCriteriaNative(criteria);
        const sql = `DELETE FROM ${this.schema}.${this.tableName} WHERE ${whereOptions}`;
        return { sql, bindParams, options: {} };
    }

    /**
     * Create query with pagination
     */
    createCriteriaOffset(
        params:
            | FindOptionsWhere<any>
            | OracleWhereParameter<any>
            | OracleWhereParameters<any>,
        pagination: OraclePaginationType,
        fields?: Array<string>,
        orderBy?: IOracleOrderBy,
    ): OracleStatement {
        // binds
        const binds = {
            bindParams: {},
            options: {},
        } as OracleStatement;
        // pagination options
        const { page } = pagination;
        const { size } = pagination;

        let fieldsName: string[] = [];

        const columnFieldsBindArray: string[] = [];

        if (fields && fields.length > 0) {
            for (const f of fields) {
                if (!this.fields.includes(f)) {
                    throw new Error(`field name is invalid ${f}`);
                }
            }
            fieldsName = fields;
        } else {
            fieldsName = this.fields;
        }

        // fetchInfo 用于处理clob类型
        const fetchInfo: any = {};

        for (const entry of Object.entries(this.columnMapper)) {
            if (fieldsName.find((filed) => filed === entry[0])) {
                columnFieldsBindArray.push(`${entry[1].name}`);
                if (entry[1].dbTypeName === 'CLOB') {
                    fetchInfo[entry[1].name] = { type: OracleDB.STRING };
                }
            }
        }

        binds.options = { fetchInfo };

        // calculate total pages
        // const totalPagesField = `COUNT(*) OVER () / ${limit} TOTAL_COUNT`;
        const totalCountField = `\nCOUNT(*) OVER () total`;

        // check has parameters
        const paramsRecord = params?.value ? params.value : params;
        if (ObjectUtil.isEmpty(paramsRecord)) {
            const sql = `SELECT ${columnFieldsBindArray}, ${totalCountField} FROM ${this.tableName}`;
            binds.sql = sql;
        }
        // oracle parameters
        else if (instanceOfParameter(params)) {
            console.log('instanceOfParameters');

            const whereParams = params.value(true);

            const sql = `SELECT ${columnFieldsBindArray}, ${totalCountField} FROM ${this.selectFrom} \n ${whereParams.sql}`;
            // set statement
            binds.sql = sql;
            binds.bindParams = whereParams.bindParams;
        } else {
            // sql native
            const { whereOptions, bindParams } =
                this.extractCriteriaNative(params);
            const sql = `SELECT ${columnFieldsBindArray}, ${totalCountField} FROM ${this.selectFrom} \nWHERE ${whereOptions}`;
            // set statement
            // console.log(whereOptions);
            binds.sql = sql;
            binds.bindParams = bindParams;
        }
        // set order
        const order = `ORDER BY ${orderBy?.field ?? 1} ${
            orderBy?.direction ?? 'ASC'
        }`;
        // set offset (this option not working with page not exists)
        // Example
        // total = 2
        // page = 3
        // results = true
        // const offset = `OFFSET ${page} ROWS FETCH NEXT ${limit} ROWS ONLY`;
        // build offset
        // binds.sql = `${binds.sql}\n${order}\n${offset}`;
        const sqlPagination = `
SELECT ${columnFieldsBindArray},TOTAL,ROWNUMID FROM
(
SELECT ${columnFieldsBindArray},
TOTAL,ROWNUM AS ROWNUMID
FROM
(
${binds.sql}
${order}
) t
WHERE ROWNUM < ((${page} * ${size}) + 1 )
)
WHERE rownumid >= (((${page}-1) * ${size}) + 1)`;
        // build pagination statement
        binds.sql = sqlPagination;

        return binds;
    }
}
export { OracleDBTypes };
