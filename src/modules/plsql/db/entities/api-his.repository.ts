import { Injectable } from '@nestjs/common';

import dayjs from 'dayjs';

import { ViewEntity } from '@/infra/database/oracle/data/view/view.entity';
import { ViewMetadata } from '@/infra/database/oracle/data/view/view.metadata';
import { ViewRepository } from '@/infra/database/oracle/data/view/view.repository';

export class ApiHisEntity extends ViewEntity {
    messageId!: string;

    requestTimestamp!: string;

    interfaceName!: string;

    procedureName!: string;

    packageName!: string;

    requestStatus!: string;

    responseStatus!: string;

    requestResponded!: string;

    bizName!: string;

    requestBody!: string;

    responseBody!: string;
}

export class ApiHisMetadata extends ViewMetadata<ApiHisEntity> {
    databaseName = 'ERP_PLSQL';

    schema = 'CUX';

    baseSQL = `
    Select 
    r.Message_Id,
    r.Request_Timestamp,
    r.Interface_Name,
    r.Procedure_Name,
    r.Package_Name,
    r.Request_Status,
    r.Response_Status,
    r.Request_Responded,    
    t.Biz_Name,
    Request_Body.Body  As Request_Body,
    Response_Body.Body As Response_Body
From Cux.Cux_Plsql_Rest_Api_Requests r,
    Cux.Cux_Plsql_Rest_Api_Top_t    t,
    Cux.Cux_Plsql_Rest_Api_Body     Request_Body,
    Cux.Cux_Plsql_Rest_Api_Body     Response_Body
Where r.Interface_Name = t.Orig_Name
And r.Message_Id = Request_Body.Message_Id(+)
And 'REQUEST' = Request_Body.Belongs_To(+)
And r.Message_Id = Response_Body.Message_Id(+)
And 'RESPONSE' = Response_Body.Belongs_To(+)

`;

    viewName = '';

    tableName = 'CUX_PLSQL_REST_API_REQUESTS';

    primaryKey = {
        key: 'messageId',
        column: 'MESSAGE_ID',
        dbTypeName: 'NUMBER',
        sequence: { schema: 'APPS', name: 'CUX_PLSQL_REST_API_REQUESTS_S' },
    };

    columnMapper = {
        messageId: { name: 'MESSAGE_ID', dbTypeName: 'NUMBER' },
        requestTimestamp: {
            name: 'REQUEST_TIMESTAMP',
            dbTypeName: 'DATE',
            toEntity: (data: any) => dayjs(data).format('YYYY-MM-DD HH:mm:ss'),
            toColumn: (data: any) => dayjs(data).toDate(),
        },
        interfaceName: { name: 'INTERFACE_NAME', dbTypeName: 'VARCHAR2' },
        procedureName: { name: 'PROCEDURE_NAME', dbTypeName: 'VARCHAR2' },
        packageName: { name: 'PACKAGE_NAME', dbTypeName: 'VARCHAR2' },
        requestStatus: { name: 'REQUEST_STATUS', dbTypeName: 'VARCHAR2' },
        responseStatus: { name: 'RESPONSE_STATUS', dbTypeName: 'VARCHAR2' },
        requestResponded: {
            name: 'REQUEST_RESPONDED',
            dbTypeName: 'DATE',
            toEntity: (data: any) => dayjs(data).format('YYYY-MM-DD HH:mm:ss'),
            toColumn: (data: any) => dayjs(data).toDate(),
        },

        bizName: {
            name: 'BIZ_NAME',
            dbTypeName: 'VARCHAR2',
            updatable: false,
            insertable: false,
        },
        requestBody: {
            name: 'REQUEST_BODY',
            dbTypeName: 'CLOB',
            updatable: false,
            insertable: false,
        },
        responseBody: {
            name: 'RESPONSE_BODY',
            dbTypeName: 'CLOB',
            updatable: false,
            insertable: false,
        },
    };
}

@Injectable()
export class ApiHisRepository extends ViewRepository<ApiHisEntity> {
    protected metadata: ViewMetadata<ApiHisEntity> = new ApiHisMetadata();
}
