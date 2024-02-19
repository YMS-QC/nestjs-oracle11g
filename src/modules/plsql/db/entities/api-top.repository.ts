import { Injectable } from '@nestjs/common';

import dayjs from 'dayjs';

import { TableEntity } from '@/infra/database/oracle/data/table/table.entity';
import { TableMetadata } from '@/infra/database/oracle/data/table/table.metadata';
import { TableRepository } from '@/infra/database/oracle/data/table/table.repository';

export class ApiTopEntity extends TableEntity {
    status!: string;

    origName!: string;

    wrapName!: string;

    pIn!: string;

    pOut!: string;

    origPackageName!: string;

    origObjectName!: string;

    wrapPackageName!: string;

    bizName!: string;

    remark!: string;

    createdBy!: string;

    creationDate!: string;

    lastUpdatedBy!: string;

    lastUpdateDate!: string;
}

export class ApiTopMetadata extends TableMetadata<ApiTopEntity> {
    databaseName = 'ERP_PLSQL';

    schema = 'CUX';

    tableName = 'CUX_PLSQL_REST_API_TOP_T';

    primaryKey = {
        key: 'id',
        column: 'ID',
        dbTypeName: 'NUMBER',
        sequence: { schema: 'APPS', name: 'CUX_PLSQL_REST_API_TOP_S' },
    };

    columnMapper = {
        id: { name: 'ID', dbTypeName: 'NUMBER' },
        status: { name: 'STATUS', dbTypeName: 'VARCHAR2' },
        origName: { name: 'ORIG_NAME', dbTypeName: 'VARCHAR2' },
        wrapName: { name: 'WRAP_NAME', dbTypeName: 'VARCHAR2' },
        pIn: { name: 'P_IN', dbTypeName: 'VARCHAR2' },
        pOut: { name: 'P_OUT', dbTypeName: 'VARCHAR2' },
        origPackageName: { name: 'ORIG_PACKAGE_NAME', dbTypeName: 'VARCHAR2' },
        origObjectName: { name: 'ORIG_OBJECT_NAME', dbTypeName: 'VARCHAR2' },
        wrapPackageName: { name: 'WRAP_PACKAGE_NAME', dbTypeName: 'VARCHAR2' },
        bizName: { name: 'BIZ_NAME', dbTypeName: 'VARCHAR2' },
        remark: { name: 'REMARK', dbTypeName: 'VARCHAR2' },
        createdBy: { name: 'CREATED_BY', dbTypeName: 'VARCHAR2' },
        creationDate: {
            name: 'CREATION_DATE',
            dbTypeName: 'DATE',
            toEntity: (data: string) =>
                dayjs(data).format('YYYY-MM-DD HH:mm:ss'),
            toColumn: (data: string) => dayjs(data).toDate(),
        },
        lastUpdatedBy: { name: 'LAST_UPDATED_BY', dbTypeName: 'VARCHAR2' },
        lastUpdateDate: {
            name: 'LAST_UPDATE_DATE',
            dbTypeName: 'DATE',
            toEntity: (data: string) =>
                dayjs(data).format('YYYY-MM-DD HH:mm:ss'),
            toColumn: (data: string) => dayjs(data).toDate(),
        },
    };
}

@Injectable()
export class ApiTopRepository extends TableRepository<ApiTopEntity> {
    protected metadata: TableMetadata<ApiTopEntity> = new ApiTopMetadata();
}
