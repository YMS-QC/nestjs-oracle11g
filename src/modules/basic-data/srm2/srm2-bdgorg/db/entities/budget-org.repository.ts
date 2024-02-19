import { Injectable } from '@nestjs/common';

import dayjs from 'dayjs';

import { TableEntity } from '@/infra/database/oracle/data/table/table.entity';
import { TableMetadata } from '@/infra/database/oracle/data/table/table.metadata';
import { TableRepository } from '@/infra/database/oracle/data/table/table.repository';

export class BudgetOrgEntity extends TableEntity {
    BUSIORGCODE: string;

    ORGNAME: string;

    PARENTCODE: string;

    DEFAULTORGCODE: string;

    FOCUSORGCODE: string;

    SBUCODE: string;

    ENABLE: string;

    ISSBU: string;

    ATTRIBUTE1: string;

    ATTRIBUTE2: string;

    ATTRIBUTE3: string;

    ATTRIBUTE4: string;

    ATTRIBUTE5: string;

    IS_TGS_BU: string;

    ATTRIBUTE6: string;

    ATTRIBUTE7: string;

    ATTRIBUTE8: string;

    ATTRIBUTE9: string;

    ATTRIBUTE10: string;

    ATTRIBUTE11: string;

    ATTRIBUTE12: string;

    ATTRIBUTE13: string;

    ATTRIBUTE14: string;

    ATTRIBUTE15: string;

    TIME_STAMP: string;
}

export class BudgetOrgMetadata extends TableMetadata<BudgetOrgEntity> {
    databaseName: string = 'C1_DW';

    schema = 'DW';

    tableName = 'C1_YS_BUDGET_ORGANIZE';

    primaryKey = {
        key: 'BUSIORGCODE',
        column: 'BUSIORGCODE',
        dbTypeName: 'VARCHAR2',
    };

    columnMapper = {
        BUSIORGCODE: { name: 'BUSIORGCODE', dbTypeName: 'VARCHAR2' },
        ORGNAME: { name: 'ORGNAME', dbTypeName: 'VARCHAR2' },
        PARENTCODE: { name: 'PARENTCODE', dbTypeName: 'VARCHAR2' },
        DEFAULTORGCODE: { name: 'DEFAULTORGCODE', dbTypeName: 'VARCHAR2' },
        FOCUSORGCODE: { name: 'FOCUSORGCODE', dbTypeName: 'VARCHAR2' },
        SBUCODE: { name: 'SBUCODE', dbTypeName: 'VARCHAR2' },
        ENABLE: { name: 'ENABLE', dbTypeName: 'VARCHAR2' },
        ISSBU: { name: 'ISSBU', dbTypeName: 'VARCHAR2' },
        ATTRIBUTE1: { name: 'ATTRIBUTE1', dbTypeName: 'VARCHAR2' },
        ATTRIBUTE2: { name: 'ATTRIBUTE2', dbTypeName: 'VARCHAR2' },
        ATTRIBUTE3: { name: 'ATTRIBUTE3', dbTypeName: 'VARCHAR2' },
        ATTRIBUTE4: { name: 'ATTRIBUTE4', dbTypeName: 'VARCHAR2' },
        ATTRIBUTE5: { name: 'ATTRIBUTE5', dbTypeName: 'VARCHAR2' },
        IS_TGS_BU: { name: 'IS_TGS_BU', dbTypeName: 'VARCHAR2' },
        ATTRIBUTE6: { name: 'ATTRIBUTE6', dbTypeName: 'VARCHAR2' },
        ATTRIBUTE7: { name: 'ATTRIBUTE7', dbTypeName: 'VARCHAR2' },
        ATTRIBUTE8: { name: 'ATTRIBUTE8', dbTypeName: 'VARCHAR2' },
        ATTRIBUTE9: { name: 'ATTRIBUTE9', dbTypeName: 'VARCHAR2' },
        ATTRIBUTE10: { name: 'ATTRIBUTE10', dbTypeName: 'VARCHAR2' },
        ATTRIBUTE11: { name: 'ATTRIBUTE11', dbTypeName: 'VARCHAR2' },
        ATTRIBUTE12: { name: 'ATTRIBUTE12', dbTypeName: 'VARCHAR2' },
        ATTRIBUTE13: { name: 'ATTRIBUTE13', dbTypeName: 'VARCHAR2' },
        ATTRIBUTE14: { name: 'ATTRIBUTE14', dbTypeName: 'VARCHAR2' },
        ATTRIBUTE15: { name: 'ATTRIBUTE15', dbTypeName: 'VARCHAR2' },
        TIME_STAMP: {
            name: 'TIME_STAMP',
            dbTypeName: 'DATE',
            toEntity: (data: any) => dayjs(data).format('YYYY-MM-DD HH:mm:ss'),
            toColumn: (data: any) => dayjs(data).toDate(),
        },
    };
}

@Injectable()
export class BudgetOrgRepository extends TableRepository<BudgetOrgEntity> {
    constructor() {
        super(new BudgetOrgMetadata());
    }
}
