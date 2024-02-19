import dayjs from 'dayjs';
import OracleDB from 'oracledb';

import { IResponse } from '@/common/Iresponse/Iresponse';
import { OracleConnectionFactory } from '@/infra/database/oracle/connections/oracle-connnection.factory';

import {
    INSERT,
    PROCEDURE,
    QUERY,
    UPDATEMANY,
} from '../../../../common/ora/interface/OraTypes';

function toHump(name: string) {
    return name.replace(/_(\w)/g, (all, letter) => {
        return letter.toUpperCase();
    });
}

export function getUpperCasedObj(data: any) {
    const myObj: any = {};

    function innerFunc() {
        Object.keys(data).forEach((key) => {
            if (data[key]) {
                const val: any = data[key];
                switch (typeof val) {
                    case 'object':
                        if (Array.isArray(val)) {
                            let eles: Array<any> = [];
                            (val as Array<any>).forEach((element) => {
                                eles = eles.concat(getUpperCasedObj(element));
                            });
                            myObj[key.toUpperCase()] = eles;
                        } else {
                            myObj[key.toUpperCase()] = getUpperCasedObj(val);
                        }
                        break;
                    // case 'number':
                    // case 'string':
                    //     myObj[key.toUpperCase()] = myObj[key];
                    //     if (key.toUpperCase() !== key) delete myObj[key];
                    //     break;

                    default:
                        if (key.toUpperCase() === 'REQUESTTIME') {
                            myObj[key.toUpperCase()] = dayjs(data[key]).format(
                                'YYYY-MM-DD HH:mm:ss.SSS',
                            );
                        } else {
                            myObj[key.toUpperCase()] = data[key];
                        }

                        break;
                }
            } else {
                const val: any = data[key] === undefined ? null : null;
                myObj[key.toUpperCase()] = val;
            }
        });
    }

    innerFunc();

    return myObj;
}

function getHumpRows(result: OracleDB.Result<unknown>): Array<any> {
    if (result.metaData && result.rows) {
        const resultRows: Array<any> = ((metaData, rows) => {
            const val: Array<any> = new Array<any>();

            for (let index = 0; index < rows.length; index++) {
                const row = [].concat(rows[index] as any); // 必须要这么做，不然类型判断有问题
                const newRow: any = {};
                for (
                    let innerIndex = 0;
                    innerIndex < row.length;
                    innerIndex++
                ) {
                    const columnVal = row[innerIndex];
                    const conlumnName = toHump(
                        String(metaData[innerIndex].name).toLocaleLowerCase(),
                    );
                    newRow[conlumnName] = columnVal;
                }
                val.push(newRow);
            }
            return val;
        })(result.metaData, result.rows);

        return resultRows;
    }

    return [];
}

export async function executeQuery<T>(
    poolAlias: string,
    params: QUERY,
    camelResult: boolean = true,
): Promise<IResponse> {
    const { statement, binds, opts } = params;
    const { success, connection, errorCode, message } =
        await OracleConnectionFactory.getConnection(poolAlias);

    if (!success) return { success, data: [], errorCode, message };

    const options: OracleDB.ExecuteOptions = camelResult
        ? { ...opts }
        : { ...opts, outFormat: OracleDB.OUT_FORMAT_OBJECT };

    const result = await connection
        .execute<T>(statement, binds || [], options)
        .then((dbResult) => {
            return {
                success: true,
                data: camelResult
                    ? getHumpRows(dbResult as any)
                    : dbResult.rows,
            };
        })
        .catch((err) => {
            return {
                success: false,
                errorCode: String(err.errorNum),
                errorMessage: String(err.message),
            };
        })
        .finally(async () => {
            if (connection) {
                await connection
                    .close()
                    .catch((err) => console.error(err.message));
            }
        });

    return result;
}

export async function executeProcedure(
    poolAlias: string,
    params: PROCEDURE,
): Promise<IResponse> {
    const { statement, binds, opts } = params;
    const { success, connection, errorCode, message } =
        await OracleConnectionFactory.getConnection(poolAlias);

    if (!success) return { success, data: null, errorCode, message };
    const result = await connection
        .execute(statement, binds || [], { autoCommit: true, ...opts })
        .then((dbResult) => {
            return {
                success: true,
                data: dbResult.outBinds,
            };
        })
        .catch((err: any) => {
            console.log(err);
            return {
                success: false,
                errorCode: String(err.errorNum),
                errorMessage: String(err.stack.split('\n').slice(0, 2)),
            };
        })
        .finally(async () => {
            if (connection) {
                await connection
                    .close()
                    .catch((err) => console.error(err.message));
            }
        });

    return result;
}

export async function executeUpdateMany(
    poolAlias: string,
    params: UPDATEMANY,
): Promise<IResponse> {
    const { statement, binds, opts } = params;

    const { success, connection, errorCode, message } =
        await OracleConnectionFactory.getConnection(poolAlias);

    if (!success) return { success, data: null, errorCode, message };
    const result = await connection
        .executeMany(statement, binds || [], {
            autoCommit: true,
            dmlRowCounts: true,
            ...opts,
        })
        .then((dbResult) => {
            return {
                success: true,
                data: dbResult,
            };
        })
        .catch((err) => {
            console.log(err);
            return {
                success: false,
                data: null,
                errorCode: String(err.errorNum),
                errorMessage: String(err.stack.split('\n').slice(0, 2)),
            };
        })
        .finally(async () => {
            if (connection) {
                await connection
                    .close()
                    .catch((err) => console.error(err.message));
            }
        });

    return result;
}

export async function executeInsert(
    poolAlias: string,
    params: INSERT,
): Promise<IResponse> {
    const { statement, binds, opts } = params;

    const { success, connection, errorCode, message } =
        await OracleConnectionFactory.getConnection(poolAlias);
    if (!success) return { success, data: null, errorCode, message };

    const result = await connection
        .executeMany(statement, binds || [], {
            autoCommit: true,
            dmlRowCounts: true,
            ...opts,
        })
        .then((dbResult) => {
            return {
                success: true,
                data: dbResult,
            };
        })
        .catch((err) => {
            console.log(err);
            return {
                success: false,
                data: null,
                errorCode: String(err.errorNum),
                errorMessage: String(err.stack.split('\n').slice(0, 2)),
            };
        })
        .finally(async () => {
            if (connection) {
                await connection
                    .close()
                    .catch((err) => console.error(err.message));
            }
        });

    return result;
}

export async function execute(
    poolAlias: string,
    params: {
        statement: string;
        binds?: OracleDB.BindParameters;
        opts?: OracleDB.ExecuteOptions;
        name?: string;
    },
): Promise<IResponse> {
    let drop = false;
    const { statement, binds, opts } = params;
    const { success, connection, errorCode, message } =
        await OracleConnectionFactory.getConnection(poolAlias);
    if (!success) return { success, data: null, errorCode, message };
    try {
        const dbResult = await connection.execute(statement, binds || [], {
            autoCommit: true,
            ...opts,
        });
        return {
            success: true,
            data: dbResult,
        };
    } catch (error: any) {
        drop = true;
        return {
            success: false,
            data: null,
            errorCode: String(error.errorNum),
            message: error.message,
        };
    } finally {
        if (connection) {
            try {
                await connection.close({ drop });
            } catch (err) {
                console.log(err);
            }
        }
    }
}
