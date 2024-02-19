import { Injectable } from '@nestjs/common';

import OracleDB from 'oracledb';

import { IResponse } from '@/common/Iresponse/Iresponse';
import { OracleConnectionFactory } from '@/infra/database/oracle/connections/oracle-connnection.factory';
import { OraUtil } from '@/infra/database/oracle/utils';
import {
    ERP_PLSQL_POOL_NAME,
    ERP_PLSQL_POOL_NAME as POOL_NAME,
    REQUEST_STATUS,
} from '@/modules/plsql/constants';

@Injectable()
export class PlsqlDbactions {
    // private logger = new Logger(PlsqlDbactions.name);

    async getConnection() {
        const result = await OracleConnectionFactory.getConnection(POOL_NAME);
        if (result.success) return result.connection;
        throw new Error(result.message);
    }

    /**
     * @description 生成并且执行11gPLSQLapi的包裹程序，并执行
     */
    async genAndExcuteDDL(params: {
        packageName: string;
        procedureName: string;
    }): Promise<IResponse> {
        const { packageName, procedureName } = params;

        const GEN_DDL = `
Begin
  apps.Cux_11gapi_Wrapper_Pkg.Gen_Wrap_Package
                                         (p_Package_Name => :p_Package_Name,
                                          p_Object_Name  => :p_Object_Name,
                                         -- p_Overload     => :p_Overload,
                                          x_Return_Code  => :x_Return_Code,
                                          x_Return_Msg   => :x_Return_Msg,
                                          p_Drop_Script  => :p_Drop_Script,
                                          p_Obj_Ddl      => :p_Obj_Ddl,
                                          p_Spc_Ddl      => :p_Spc_Ddl,
                                          p_Bdy_Ddl      => :p_Bdy_Ddl);
End;
`;

        const { success, data, errorCode, message } =
            await OraUtil.executeProcedure(POOL_NAME, {
                statement: GEN_DDL,
                binds: {
                    p_Package_Name: packageName,
                    p_Object_Name: procedureName,
                    x_Return_Code: {
                        type: OracleDB.STRING,
                        dir: OracleDB.BIND_OUT,
                        maxSize: 500000,
                        val: undefined,
                    },
                    x_Return_Msg: {
                        type: OracleDB.STRING,
                        dir: OracleDB.BIND_OUT,
                        maxSize: 500000,
                        val: undefined,
                    },
                    p_Drop_Script: {
                        type: OracleDB.STRING,
                        dir: OracleDB.BIND_OUT,
                        maxSize: 500000,
                        val: undefined,
                    },
                    p_Obj_Ddl: {
                        type: OracleDB.STRING,
                        dir: OracleDB.BIND_OUT,
                        maxSize: 500000,
                        val: undefined,
                    },
                    p_Spc_Ddl: {
                        type: OracleDB.STRING,
                        dir: OracleDB.BIND_OUT,
                        maxSize: 500000,
                        val: undefined,
                    },
                    p_Bdy_Ddl: {
                        type: OracleDB.STRING,
                        dir: OracleDB.BIND_OUT,
                        maxSize: 500000,
                        val: undefined,
                    },
                },
            });

        // step1 处理运行结果

        const step1 = '运行 Cux_11gapi_Wrapper_Pkg.Gen_Wrap_Package 发生错误：';

        if (!success) return { success, errorCode, message: step1 + message };

        if ((data.x_Return_Code ?? 'E') !== 'S') {
            return {
                success,
                errorCode: data.x_Return_Code,
                message: step1 + data.x_Return_Msg,
            };
        }

        // step2 drop所有相关对象

        const step2 = '删除对象发生错误：';

        // 执行drop语句 data.p_Drop_Script
        // 通过 / 截取ddl语句并执行，汇总所有错误消息
        // 由于Oracle 11g 没有drop when exist 语法
        // 通过Ora-4043报错判断对象不存在，不算drop失败
        // 最后，通过reduce聚合所有报错信息

        const dropErrors =
            (
                await Promise.all(
                    String(data.p_Drop_Script)
                        .split('/')
                        .map(async (dropStmt) => {
                            const dropResult = await OraUtil.execute(
                                POOL_NAME,
                                {
                                    statement: dropStmt,
                                },
                            );

                            // console.log({ dropStmt, dropResult });

                            return (dropResult.errorCode ?? '') === '4043'
                                ? null
                                : dropResult.message ?? null;
                        }),
                )
            ).reduce((pre, curr) => pre && pre.concat(curr ?? '')) ?? '';

        if (dropErrors?.length > 0)
            return {
                success: false,
                errorCode: 'DROP OBJECT ERROR',
                message: step2 + dropErrors,
            };

        // step3 执行编译语句 编译数据库type类型
        const step3 = '编译数据库对象失败：';

        // 通过 / 截取ddl语句并执行，汇总所有错误消息
        // ddl语句需要依次执行，不能同时并行
        let objDdlErrors: string = ``;
        String(data.p_Obj_Ddl)
            .split('/')
            .forEach(async (dropStmt) => {
                const ddlResult = await OraUtil.execute(POOL_NAME, {
                    statement: dropStmt,
                });

                if (!ddlResult.success)
                    objDdlErrors = objDdlErrors
                        .concat('\n')
                        .concat(ddlResult.message ?? '');
            });

        if (objDdlErrors)
            return {
                success: false,
                errorCode: 'COMPILE DB TYPES',
                message: step3 + objDdlErrors,
            };

        // step4 执行 package special 编译语句 编译包裹包的包申明对象
        const step4 = '编译 package special 失败：';
        const plsDdlError =
            (
                await OraUtil.execute(POOL_NAME, {
                    statement: data.p_Spc_Ddl,
                })
            ).message ?? null;

        if (plsDdlError)
            return {
                success: false,
                errorCode: 'COMPILE PACKAGE SPECIAL',
                message: step4 + plsDdlError,
            };

        // step5 执行 package body 编译语句 编译包体

        const step5 = '编译 package body 失败';

        const bodyDdlError =
            (
                await OraUtil.execute(POOL_NAME, {
                    statement: data.p_Bdy_Ddl,
                })
            ).message ?? null;

        if (bodyDdlError)
            return {
                success: false,
                errorCode: 'COMPILE PACKAGE BODY',
                message: step5 + bodyDdlError,
            };

        // finally

        return {
            success: true,
        };
    }

    async updateStatus(params: {
        packageName: string;
        procedureName: string;
        status: 'VALID' | 'INVALID' | 'REGISTING';
    }): Promise<IResponse> {
        const statement = `
 update cux.Cux_Plsql_Rest_Api_Top_t t
    set t.status = :status
  where 1=1
    and t.orig_name = :packageName ||'.'|| :procedureName`;

        const result = await OraUtil.execute(POOL_NAME, {
            statement,
            binds: { ...params },
        });

        return result;
    }

    async regist(params: {
        packageName: string;
        procedureName: string;
        bizName: string;
        remark: string;
        lastUpdatedBy: string;
    }): Promise<IResponse> {
        const statement = `
Begin
  Cux_11gapi_Wrapper_Pkg.Regist(p_Package_Name    => :p_Package_Name,
                                p_Object_Name     => :p_Object_Name,
                                p_Biz_Name        => :p_Biz_Name,
                                p_Remark          => :p_Remark,
                                p_Last_Updated_By => :p_Last_Updated_By,
                                x_Wraped_Name     => :x_Wraped_Name,
                                x_Return_Code     => :x_Return_Code,
                                x_Return_Msg      => :x_Return_Msg);
End;
`;

        const { success, data, errorCode, message } =
            await OraUtil.executeProcedure(POOL_NAME, {
                statement,
                binds: {
                    p_Package_Name: params.packageName,
                    p_Object_Name: params.procedureName,
                    p_Biz_Name: params.bizName,
                    p_remark: params.remark,
                    p_Last_Updated_By: params.lastUpdatedBy,
                    x_Wraped_Name: {
                        type: OracleDB.STRING,
                        dir: OracleDB.BIND_OUT,
                        maxSize: 50000,
                        val: undefined,
                    },
                    x_Return_Code: {
                        type: OracleDB.STRING,
                        dir: OracleDB.BIND_OUT,
                        maxSize: 50000,
                        val: undefined,
                    },
                    x_Return_Msg: {
                        type: OracleDB.STRING,
                        dir: OracleDB.BIND_OUT,
                        maxSize: 50000,
                        val: undefined,
                    },
                },
            });

        if (!success) return { success, errorCode, message };

        if (data.x_Return_Code !== 'S')
            return { success: false, data, errorCode, message };

        return { success, data, errorCode, message };
    }

    async findOneRestApi(params: {
        packageName: string;
        procedureName: string;
    }) {
        const statement = `
 Select Id,
        Status,
        Orig_Name,
        Wrap_Name,
        p_In,
        p_Out,
        Orig_Package_Name,
        Orig_Object_Name,
        Wrap_Package_Name,
        Biz_Name,
        Remark,
        Created_By,
        Creation_Date,
        Last_Updated_By,
        Last_Update_Date
   From Cux.Cux_Plsql_Rest_Api_Top_t t
  Where 1 = 1
    And orig_name = :packageName || '.' || :procedureName     
        `;
        // console.log(params);

        return OraUtil.executeQuery<{
            id: number;
            status: string;
            origName: string;
            wrapName: string;
            pIn: string;
            pOut: string;
            origPackageName: string;
            origObjectName: string;
            wrapPackageName: string;
            bizName: string;
            remark: string;
            createdBy: string;
            creationDate: Date;
            lastUpdatedBy: string;
            lastuUpdateDate: Date;
        }>(POOL_NAME, { statement, binds: { ...params } });
    }

    async invokePlsqlRegistedApi(
        params: {
            wrapName: string;
            pInType: string;
            pOutType: string;
        },
        bodyData: any,
    ): Promise<{
        success: boolean;
        message?: string;
        error?: any;
        result?: any;
        dbmsOutput?: any;
    }> {
        const { dbmsOutputFlag } = bodyData;
        const { pInType, pOutType, wrapName } = params;

        // 将数据对象 data 的所有key 转成对应的大写文本，供 plsql 调用
        const mutatedData = OraUtil.getUpperCasedObj(bodyData);

        console.log(JSON.stringify(mutatedData, null, '  '));
        const statement = `
    BEGIN
    ${
        dbmsOutputFlag
            ? `DBMS_OUTPUT.ENABLE(NULL);
               DBMS_OUTPUT.PUT_LINE('DBMS_OUTPUT_ENABLED');`
            : ''
    }
    ${wrapName}(P_IN => :P_IN,P_OUT => :P_OUT);
    COMMIT;
    EXCEPTION
      WHEN OTHERS THEN
      COMMIT;
        :sqlErrm  := SQLERRM;
        :errTrace := Dbms_Utility.format_error_backtrace();
    END;`;

        const dbmsOutputStmt = `
        SELECT * FROM TABLE(mydofetch())
                `;

        // 执行plsql存储过程,并获取 dbms_output 结果 需要同一个connection

        let connection;
        let dropFlag: boolean = false;
        try {
            connection = await this.getConnection();

            // 获取出入参封装的数据库对象

            const PinType = await connection.getDbObjectClass(
                String(pInType.toUpperCase()).toUpperCase(),
            );

            const PoutType = await connection.getDbObjectClass(
                String(pOutType.toUpperCase()).toUpperCase(),
            );

            const pInData = new PinType(mutatedData);
            const pOutData = new PoutType({});

            // console.log(statement);

            const { success, result, message } = await connection
                .execute(
                    statement,
                    {
                        P_IN: {
                            dir: OracleDB.BIND_IN,
                            val: pInData,
                        },
                        P_OUT: {
                            dir: OracleDB.BIND_INOUT,
                            val: pOutData,
                        },
                        sqlErrm: {
                            dir: OracleDB.BIND_OUT,
                            type: OracleDB.STRING,
                            maxSize: 4000,
                            val: undefined,
                        },
                        errTrace: {
                            dir: OracleDB.BIND_OUT,
                            type: OracleDB.STRING,
                            maxSize: 4000,
                            val: undefined,
                        },
                    },
                    { autoCommit: true },
                )
                .then((dbResult: any) => {
                    return {
                        success: !dbResult.outBinds.sqlErrm,
                        result: JSON.parse(
                            JSON.stringify(dbResult.outBinds.P_OUT),
                        ),
                        message: dbResult.outBinds.sqlErrm
                            ? `${dbResult.outBinds.sqlErrm}\n${dbResult.outBinds.errTrace}`
                            : undefined,
                    };
                });

            const dbmsOutput =
                dbmsOutputFlag &&
                (await connection
                    .execute(dbmsOutputStmt)
                    .then((output) => {
                        return output.rows;
                    })
                    .catch((error) => console.log(error)));

            // sql运行报错，丢掉此链接
            dropFlag = !success;

            if (dbmsOutput) {
                return {
                    success,
                    result,
                    dbmsOutput,
                    message,
                };
            }
            return {
                success,
                result,
                message,
            };
        } catch (error: any) {
            // njs 运行报错，丢掉此链接
            dropFlag = true;
            return {
                success: false,
                result: null,
                error,
                message:
                    error.message ??
                    JSON.stringify(error.stack.split('\n').slice(0, 2)),
            };
        } finally {
            if (connection) {
                try {
                    await connection.close({ drop: dropFlag });
                    // console.log('connection closed!');
                } catch (error: any) {
                    console.log(error);
                }
            }
        }
    }

    async getRequestSequence(): Promise<number | null> {
        const stmtGetRequestId = `select nodejs.CUX_PLSQL_REST_API_REQUESTS_s.Nextval as seq from dual`;

        try {
            if (
                OracleConnectionFactory.getStaticConnection(ERP_PLSQL_POOL_NAME)
            ) {
                const result =
                    await OracleConnectionFactory.getStaticConnection(
                        ERP_PLSQL_POOL_NAME,
                    ).execute<number[]>(stmtGetRequestId);

                if (result.rows) {
                    const id = result.rows[0][0] ?? null;
                    return id;
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async getCallBackSequence(): Promise<number | null> {
        const stmtGetRequestId = `select cux.cux_plsql_rest_callback_seq.Nextval as seq from dual`;

        try {
            if (
                OracleConnectionFactory.getStaticConnection(ERP_PLSQL_POOL_NAME)
            ) {
                const result =
                    await OracleConnectionFactory.getStaticConnection(
                        ERP_PLSQL_POOL_NAME,
                    ).execute<number[]>(stmtGetRequestId);

                if (result.rows) {
                    const id = result.rows[0][0] ?? null;
                    return id;
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async insertRequest(
        packageName: string,
        procedureName: string,
        data: any,
        messageId?: number,
    ): Promise<number | null> {
        let connection;
        let s;
        try {
            connection =
                OracleConnectionFactory.getStaticConnection(
                    ERP_PLSQL_POOL_NAME,
                );

            const id = messageId || (await this.getRequestSequence());

            // console.log(id);

            const stmt1 = `Insert Into Cux_Plsql_Rest_Api_Requests
          (Message_Id,
           Request_Timestamp,
           Interface_Name,
           Procedure_Name,
           Package_Name,
           Request_Status)
        Values
          (${id},
           Sysdate,
           '${packageName}.${procedureName}',
           '${procedureName}',
           '${packageName}',
           '${REQUEST_STATUS.RUNNING}')`;

            await connection.execute(stmt1, {}, { autoCommit: true });

            const stmt2 = `Insert Into Cux_Plsql_Rest_Api_Body
          (Message_Id,
           Belongs_To,
           Body)
        Values
          (${id},
           'REQUEST',
           
            :DATA
           )`;

            await connection.execute(
                stmt2,
                {
                    DATA: {
                        val: JSON.stringify(data),
                        dir: OracleDB.BIND_IN,
                        type: OracleDB.CLOB,
                    },
                },
                { autoCommit: true },
            );
            // JSON.stringify(data)

            return id;
        } catch (err) {
            console.log(s);
            console.log(err);
            return null;
        }
    }

    async updateResponse(
        messageId: number,
        data: { returnCode: string; returnMsg: string; returnVal: any },
    ) {
        let connection;
        try {
            connection =
                OracleConnectionFactory.getStaticConnection(
                    ERP_PLSQL_POOL_NAME,
                );
            const stmt1 = `Update Cux_Plsql_Rest_Api_Requests r
            Set r.Request_Status    ='${data.returnCode}',
                r.Response_Status   ='${data.returnCode}',
                r.Request_Responded = Sysdate
          Where r.Message_Id = '${messageId}'`;
            const stmt2 = `Insert Into Cux_Plsql_Rest_Api_Body
           (Message_Id,
            Belongs_To,
            Body)
         Values
           ('${messageId}',
            'RESPONSE',
            :DATA)`;
            // console.log(stmt);
            await connection.execute(stmt1, {}, { autoCommit: true });

            await connection.execute(
                stmt2,
                {
                    DATA: {
                        val: JSON.stringify(data.returnVal ?? data),
                        dir: OracleDB.BIND_IN,
                        type: OracleDB.CLOB,
                    },
                },
                { autoCommit: true },
            );
        } catch (err) {
            console.log(err);
        }
    }

    async insertCallbackRequest(
        requestInfo: {
            messageId: number;
            queueName: string;
            jobId: string;
            callbackUrl: string;
        },

        requestId?: number,
    ): Promise<number | null> {
        let connection;
        try {
            connection =
                OracleConnectionFactory.getStaticConnection(
                    ERP_PLSQL_POOL_NAME,
                );

            const id = requestId || (await this.getCallBackSequence());

            // console.log(id);

            const stmt1 = `
 Insert Into Cux.Cux_Plsql_Rest_Callbacks
   (request_id,
    Status,
    Message_Id,
    Queue_Name,
    Redis_Job_Id,
    Callback_Url
    
    )
 
 Values
   (:id,'${REQUEST_STATUS.RUNNING}', :messageId ,:queueName, :jobId, :callbackUrl)
 `;

            await connection.execute(
                stmt1,
                { id, ...requestInfo },
                { autoCommit: true },
            );

            return id;
        } catch (err) {
            console.log(err);
            return null;
        }
    }

    async updateCallbackRequest(requestId: number, data: any): Promise<void> {
        let connection;
        try {
            connection =
                OracleConnectionFactory.getStaticConnection(
                    ERP_PLSQL_POOL_NAME,
                );

            const stmt2 = `
Insert Into cux.cux_plsql_rest_callback_body
  (request_id,
   Belongs_To,
   Body)
Values
  (:requestId,
   'REQUEST',           
    :DATA
   )`;
            await connection.execute(
                stmt2,
                {
                    requestId,
                    DATA: {
                        val: JSON.stringify(data),
                        dir: OracleDB.BIND_IN,
                        type: OracleDB.CLOB,
                    },
                },
                { autoCommit: true },
            );
        } catch (err) {
            console.log(err);
        }
    }

    async updateCallbackResponse(
        requestId: number,
        returnStatus: string,
        returnCode: string,
        returnMsg: string,
        body: any,
    ) {
        let connection;
        try {
            connection =
                OracleConnectionFactory.getStaticConnection(
                    ERP_PLSQL_POOL_NAME,
                );

            const stmt1 = `
 Update cux.cux_plsql_rest_callbacks  r
    Set r.return_status = :returnStatus,
        r.return_code   = :returnCode,
        r.responed_date = Sysdate,
        r.Return_Msg    = :returnMsg,
        r.Status        = :status
  Where r.request_id = :requestId`;

            const stmt2 = `
 Insert Into cux.cux_plsql_rest_callback_body
   (request_id,
    Belongs_To,
    Body)
 Values
   (:requestId,
    'RESPONSE',
    :DATA)`;
            await connection.execute(
                stmt1,
                {
                    returnStatus,
                    returnCode,
                    returnMsg,
                    requestId,
                    status: returnStatus,
                },
                { autoCommit: true },
            );

            await connection.execute(
                stmt2,
                {
                    requestId,
                    DATA: {
                        val: JSON.stringify(body),
                        dir: OracleDB.BIND_IN,
                        type: OracleDB.CLOB,
                    },
                },
                { autoCommit: true },
            );
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * 检查程序包是否存在，是否有效；之后检查存储过程是否存在；最后检查是否有可执行权限。
     *
     */
    async checkPackageProcedure(
        packageName: string,
        procedureName: string,
    ): Promise<IResponse> {
        // 校验程序包
        const result = await OraUtil.executeQuery<{ sequence: number }>(
            ERP_PLSQL_POOL_NAME,
            {
                statement: `SELECT STATUS FROM all_objects al WHERE object_type = 'PACKAGE BODY' AND al.object_name = :packageName and rownum = 1`,
                binds: { packageName },
            },
        );

        console.log(result);

        if (!result.success) return result;

        const row = result.data;

        if (row.length < 1)
            return {
                success: false,
                errorCode: 'PACKAGE NOT FOUND',
                message: '没有找到对应的程序包',
            };

        const { status } = result.data[0] ?? {};

        if (String(status) !== 'VALID')
            return {
                success: false,
                errorCode: 'PACKAGE NOT VALID',
                message: '程序包不是有效状态',
            };

        // 校验存储过程
        const procedureQueryResult = await OraUtil.executeQuery<{
            sequence: number;
        }>(ERP_PLSQL_POOL_NAME, {
            statement: `
              Select Object_Name, Package_Name, Object_Id, Overload
                From All_Arguments s
               Where s.Package_Name = :packageName
                 And s.Object_Name  = :procedureName
                 And Data_Level = 0
                 And rownum = 1`,
            binds: { packageName, procedureName },
        });

        console.log(procedureQueryResult);

        // 处理结果

        if (!procedureQueryResult.success) return result;

        if (procedureQueryResult.data.length < 1)
            return {
                success: false,
                errorCode: 'PROCEDURE NOT FOUND',
                message: '没有找到对应的存储过程',
            };

        if (procedureQueryResult.data[0].overload ?? false)
            return {
                success: false,
                errorCode: 'PROCEDURE OVERLOADED',
                message: '存储过程存在同名重载，无法注册',
            };

        return { success: true };
    }
}
