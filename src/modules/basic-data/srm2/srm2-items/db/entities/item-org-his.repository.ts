import { Injectable } from '@nestjs/common';

import { TableEntity } from '@/infra/database/oracle/data/table/table.entity';
import { TableMetadata } from '@/infra/database/oracle/data/table/table.metadata';
import { TableRepository } from '@/infra/database/oracle/data/table/table.repository';

export class ItemOrgHisEntity extends TableEntity {
    queueId: number;

    inventoryItemId: number;

    materialNumber: string;

    company: number;

    factory: string;

    inventoryItemStatusCode: string;

    purchasingEnabledFlag: string;

    invalidFlag: number;

    purchaseFlag: number;
}

export class ItemOrgHisMetadata extends TableMetadata<ItemOrgHisEntity> {
    databaseName = 'ERP';

    schema = 'CUX';

    tableName = 'CUX_SRM2_BASIC_ITEM_ORG_HIS';

    primaryKey = {};

    columnMapper = {
        queueId: { name: 'QUEUE_ID', dbTypeName: 'NUMBER' },
        inventoryItemId: { name: 'INVENTORY_ITEM_ID', dbTypeName: 'NUMBER' },
        materialNumber: { name: 'MATERIAL_NUMBER', dbTypeName: 'VARCHAR2' },
        company: { name: 'COMPANY', dbTypeName: 'NUMBER' },
        factory: { name: 'FACTORY', dbTypeName: 'VARCHAR2' },
        inventoryItemStatusCode: {
            name: 'INVENTORY_ITEM_STATUS_CODE',
            dbTypeName: 'VARCHAR2',
        },
        purchasingEnabledFlag: {
            name: 'PURCHASING_ENABLED_FLAG',
            dbTypeName: 'VARCHAR2',
        },
        invalidFlag: { name: 'INVALID_FLAG', dbTypeName: 'NUMBER' },
        purchaseFlag: { name: 'PURCHASE_FLAG', dbTypeName: 'NUMBER' },
    };
}

@Injectable()
export class ItemOrgHisRepository extends TableRepository<ItemOrgHisEntity> {
    constructor() {
        super(new ItemOrgHisMetadata());
    }
}
