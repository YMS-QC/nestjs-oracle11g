/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import OracleDB from 'oracledb';

import {
    ExcludeObjectLiteral,
    ColumnMapper,
    PlainClass,
} from '@/infra/database/oracle/data/interfaces/column-mapper';

import { TableEntity } from '@/infra/database/oracle/data/table/table.entity';

import { ViewEntity } from '@/infra/database/oracle/data/view/view.entity';

import { FindOptionsWhere } from '../interfaces/find-options-where';
import { IOracleWhere, OracleStatement } from '../interfaces/ioracle.parameter';

import { OracleDBTypes } from '../table/table.metadata';

export type OracleWhereOprators =
    | 'AND'
    | 'OR'
    | '<'
    | '>'
    | '<>'
    | '<='
    | '>='
    | 'LIKE'
    | '%LIKE%'
    | 'LIKE%'
    | '%LIKE'
    | 'OR <'
    | 'OR >'
    | 'OR <>'
    | 'OR <='
    | 'OR >='
    | 'IN'
    | 'NOT IN'
    | 'EXISTS'
    | 'NOT EXISTS';

/**
 * Oracle parameter
 */
export class OracleWhereParameter<T extends TableEntity | ViewEntity>
    implements IOracleWhere
{
    private sql: string = '';

    private top: string = `WHERE 1=1\n`;

    private bindParams: OracleDB.BindParameters & any = {};

    constructor(
        columnMapper: ColumnMapper<T>,
        where: FindOptionsWhere<T> | ExcludeObjectLiteral<T, PlainClass>,
        op: OracleWhereOprators = 'AND',
        private readonly bindPrefix: string = 'p_',
    ) {
        const keys = Object.keys(where ?? {});

        if (keys.length > 1)
            throw new Error('InValid Where parameter , just support one key!');

        // 循环where中的key， 找到对应的列，加上前缀作为绑定变量

        for (const key of keys) {
            const column = columnMapper[key]?.name ?? key;
            const dbTypeName = columnMapper[key]?.dbTypeName ?? null;
            const toColumn = columnMapper[key]?.toColumn;
            const type = (OracleDBTypes as any)[dbTypeName] ?? undefined;

            const rawValue = (where as any)[key];

            const valueIsArray = Array.isArray(rawValue);

            const bindKey = `${this.bindPrefix}${key}`;
            let sqlLine;
            if (!valueIsArray) {
                // 当传入的绑定值不是队列
                const value = toColumn ? toColumn(rawValue) : rawValue;
                // 处理操作符
                switch (op) {
                    case 'AND':
                        sqlLine = `AND ${column} = :${bindKey} `;

                        break;
                    case 'OR':
                        sqlLine = `OR  ${column} = :${bindKey} `;
                        break;
                    case '<':
                    case '>':
                    case '<>':
                    case '<=':
                    case '>=':
                        sqlLine = `AND ${column} ${op} :${bindKey} `;
                        break;
                    case 'LIKE':
                        sqlLine = `AND nvl(${column},'') LIKE ''||:${bindKey}||'' `;
                        break;
                    case 'LIKE%':
                        sqlLine = `AND nvl(${column},'') LIKE ''||:${bindKey}||'%' `;
                        break;
                    case '%LIKE':
                        sqlLine = `AND nvl(${column},'') LIKE '%'||:${bindKey}||'%' `;
                        break;
                    case '%LIKE%':
                        sqlLine = `AND nvl(${column},'') LIKE '%'||:${bindKey}||'%' `;
                        break;
                    case 'OR <':
                        sqlLine = `OR ${column} < :${bindKey} `;
                        break;
                    case 'OR >':
                        sqlLine = `OR ${column} > :${bindKey} `;
                        break;
                    case 'OR <>':
                        sqlLine = `OR ${column} <> :${bindKey} `;
                        break;
                    case 'OR <=':
                        sqlLine = `OR ${column} >= :${bindKey} `;
                        break;
                    case 'OR >=':
                        sqlLine = `OR ${column} <= :${bindKey} `;
                        break;
                    case 'IN':
                    case 'NOT IN':
                        if (!Object.hasOwn(rawValue, 'sql')) {
                            throw new Error(
                                `Must use sql or array when using ${op}`,
                            );
                        }

                        sqlLine = `AND ${column} ${op} (${rawValue.sql}) `;

                        if (Object.hasOwn(rawValue, 'bindParams')) {
                            for (const subKey of Object.keys(
                                rawValue.bindParams,
                            )) {
                                switch (type) {
                                    case OracleDB.STRING:
                                        this.bindParams[subKey] = {
                                            dir: OracleDB.BIND_IN,
                                            val: value,
                                            type,
                                            maxSize: 50000,
                                        };
                                        break;

                                    default:
                                        this.bindParams[subKey] = {
                                            dir: OracleDB.BIND_IN,
                                            val: value,
                                            type,
                                        };
                                        break;
                                }
                            }
                        }
                        break;
                    case 'EXISTS':
                    case 'NOT EXISTS':
                        if (!Object.hasOwn(rawValue, 'sql')) {
                            throw new Error(`Must use sql when using ${op}`);
                        }
                        sqlLine = `AND ${op} (${rawValue.sql}) `;

                        if (Object.hasOwn(rawValue, 'bindParams')) {
                            for (const subKey of Object.keys(
                                rawValue.bindParams,
                            )) {
                                switch (type) {
                                    case OracleDB.STRING:
                                        this.bindParams[subKey] = {
                                            dir: OracleDB.BIND_IN,
                                            val: value,
                                            type,
                                            maxSize: 50000,
                                        };
                                        break;

                                    default:
                                        this.bindParams[subKey] = {
                                            dir: OracleDB.BIND_IN,
                                            val: value,
                                            type,
                                        };
                                        break;
                                }
                            }
                        }
                        break;
                    default:
                        sqlLine = `AND ${column} = :${bindKey} `;
                        break;
                }
                // 处理绑定变量
                if (!Object.hasOwn(rawValue, 'sql')) {
                    switch (type) {
                        case OracleDB.STRING:
                            this.bindParams[bindKey] = {
                                dir: OracleDB.BIND_IN,
                                val: value,
                                type,
                                maxSize: 50000,
                            };
                            break;

                        default:
                            this.bindParams[bindKey] = {
                                dir: OracleDB.BIND_IN,
                                val: value,
                                type,
                            };
                            break;
                    }
                }
            } else {
                let allBidKeys = ``;

                switch (op) {
                    case 'IN':
                    case 'NOT IN':
                        for (let i = 0; i < rawValue.length; i++) {
                            const arrayBindKey = `:${bindKey}_${i}`;
                            allBidKeys += `:${bindKey}_${i}`;
                            if (i < rawValue.length - 1) allBidKeys += ',';

                            // 处理绑定变量 和 语句

                            const value = toColumn
                                ? toColumn(rawValue[i])
                                : rawValue[i];

                            switch (type) {
                                case OracleDB.STRING:
                                    this.bindParams[arrayBindKey] = {
                                        dir: OracleDB.BIND_IN,
                                        val: value,
                                        type,
                                        maxSize: 50000,
                                    };
                                    break;

                                default:
                                    this.bindParams[arrayBindKey] = {
                                        dir: OracleDB.BIND_IN,
                                        val: value,
                                        type,
                                    };
                                    break;
                            }
                        }

                        sqlLine = `AND ${column} ${op} (${allBidKeys}) `;

                        break;
                    default:
                        throw new Error(
                            'Must use Array data when using IN or NOT IN op!',
                        );
                }
            }

            this.sql += `${sqlLine}\n`;
        }
    }

    get _IOracleWhere(): boolean {
        return true;
    }

    value(withWhere: boolean = true): OracleStatement {
        return {
            sql: withWhere ? `${this.top}\n${this.sql}` : this.sql,
            bindParams: this.bindParams,
            options: {},
        };
    }
}

/**
 * Oracle parameter array
 */
export class OracleWhereParameters<T extends TableEntity | ViewEntity>
    implements IOracleWhere
{
    get _IOracleWhere(): boolean {
        return true;
    }

    private sql: string = '';

    private top: string = `WHERE 1=1\n`;

    private bindParams: OracleDB.BindParameters & any;

    constructor(
        columnMapper: ColumnMapper<T>,
        wheres: {
            where: FindOptionsWhere<T> | ExcludeObjectLiteral<T, PlainClass>;
            op?: OracleWhereOprators;
        }[],
        bindPrefix: string = 'p',
    ) {
        for (let i = 0; i < wheres.length; i++) {
            const param = new OracleWhereParameter(
                columnMapper,
                wheres[i].where,
                wheres[i].op,
                `${bindPrefix}${i}_`,
            );

            const { sql: valSql, bindParams: valBindParams } =
                param.value(false);
            this.sql += valSql;
            this.bindParams = { ...this.bindParams, ...valBindParams };

            // console.log(valBindParams);
        }

        // console.log(this.sql);
    }

    value(withWhere: boolean = true): OracleStatement {
        return {
            sql: withWhere ? `${this.top}\n${this.sql}` : this.sql,
            bindParams: this.bindParams,
            options: {},
        };
    }
}

/**
 * Check weather object implements {@link IOracleParameter}
 */
export function instanceOfParameter(
    object: any,
): object is OracleWhereParameter<any> | OracleWhereParameters<any> {
    // console.log(object);
    return Boolean(object._IOracleWhere);
}
