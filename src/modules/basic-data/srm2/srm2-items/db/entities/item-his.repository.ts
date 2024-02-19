import { Injectable } from '@nestjs/common';

import { TableEntity } from '@/infra/database/oracle/data/table/table.entity';
import { TableMetadata } from '@/infra/database/oracle/data/table/table.metadata';
import { TableRepository } from '@/infra/database/oracle/data/table/table.repository';

export class ItemHisEntity extends TableEntity {
    queueId: number;

    updateBatch: number;

    updateDate: string;

    transportBatch: number;

    processStatus: string;

    processMessage: string;

    inventoryItemId: number;

    lastUpdatedBy: number;

    lastUpdateDate: string;

    materialNumber: string;

    materialName: string;

    materialGroup: string;

    materialGroupName: string;

    minOrderQuantity: number;

    minPackQuantity: number;

    minDeliveryQuantity: number;

    baseUnit: string;

    materialModel: string;

    materialSpec: string;

    checkQuality: number;

    freeze: number;

    materialLength: number;

    materialWide: number;

    materialHigh: number;

    oldMaterialNumber: string;

    oldMaterialRemark: string;

    remark: string;

    quotaStrategy: number;

    quotaWay: number;

    woodSpecies: string;

    series: string;

    craft: string;

    applicant: string;

    applicationTime: string;

    modificationTime: string;
}

export class ItemHisMetadata extends TableMetadata<ItemHisEntity> {
    databaseName = 'ERP';

    schema = 'CUX';

    tableName = 'CUX_SRM2_ITEMS_HIS';

    primaryKey = { key: 'queueId', column: 'QUEUE_ID', dbTypeName: 'NUMBER' };

    columnMapper = {
        queueId: { name: 'QUEUE_ID', dbTypeName: 'NUMBER' },
        updateBatch: { name: 'UPDATE_BATCH', dbTypeName: 'NUMBER' },
        updateDate: { name: 'UPDATE_DATE', dbTypeName: 'DATE' },
        transportBatch: { name: 'TRANSPORT_BATCH', dbTypeName: 'NUMBER' },
        processStatus: { name: 'PROCESS_STATUS', dbTypeName: 'VARCHAR2' },
        processMessage: { name: 'PROCESS_MESSAGE', dbTypeName: 'VARCHAR2' },
        inventoryItemId: { name: 'INVENTORY_ITEM_ID', dbTypeName: 'NUMBER' },
        lastUpdatedBy: { name: 'LAST_UPDATED_BY', dbTypeName: 'NUMBER' },
        lastUpdateDate: { name: 'LAST_UPDATE_DATE', dbTypeName: 'DATE' },
        materialNumber: { name: 'MATERIAL_NUMBER', dbTypeName: 'VARCHAR2' },
        materialName: { name: 'MATERIAL_NAME', dbTypeName: 'VARCHAR2' },
        materialGroup: { name: 'MATERIAL_GROUP', dbTypeName: 'VARCHAR2' },
        materialGroupName: {
            name: 'MATERIAL_GROUP_NAME',
            dbTypeName: 'VARCHAR2',
        },
        minOrderQuantity: { name: 'MIN_ORDER_QUANTITY', dbTypeName: 'NUMBER' },
        minPackQuantity: { name: 'MIN_PACK_QUANTITY', dbTypeName: 'NUMBER' },
        minDeliveryQuantity: {
            name: 'MIN_DELIVERY_QUANTITY',
            dbTypeName: 'NUMBER',
        },
        baseUnit: { name: 'BASE_UNIT', dbTypeName: 'VARCHAR2' },
        materialModel: { name: 'MATERIAL_MODEL', dbTypeName: 'VARCHAR2' },
        materialSpec: { name: 'MATERIAL_SPEC', dbTypeName: 'VARCHAR2' },
        checkQuality: { name: 'CHECK_QUALITY', dbTypeName: 'NUMBER' },
        freeze: { name: 'FREEZE', dbTypeName: 'NUMBER' },
        materialLength: { name: 'MATERIAL_LENGTH', dbTypeName: 'NUMBER' },
        materialWide: { name: 'MATERIAL_WIDE', dbTypeName: 'NUMBER' },
        materialHigh: { name: 'MATERIAL_HIGH', dbTypeName: 'NUMBER' },
        oldMaterialNumber: {
            name: 'OLD_MATERIAL_NUMBER',
            dbTypeName: 'VARCHAR2',
        },
        oldMaterialRemark: {
            name: 'OLD_MATERIAL_REMARK',
            dbTypeName: 'VARCHAR2',
        },
        remark: { name: 'REMARK', dbTypeName: 'VARCHAR2' },
        quotaStrategy: { name: 'QUOTA_STRATEGY', dbTypeName: 'NUMBER' },
        quotaWay: { name: 'QUOTA_WAY', dbTypeName: 'NUMBER' },
        woodSpecies: { name: 'WOOD_SPECIES', dbTypeName: 'VARCHAR2' },
        series: { name: 'SERIES', dbTypeName: 'VARCHAR2' },
        craft: { name: 'CRAFT', dbTypeName: 'VARCHAR2' },
        applicant: { name: 'APPLICANT', dbTypeName: 'VARCHAR2' },
        applicationTime: { name: 'APPLICATION_TIME', dbTypeName: 'VARCHAR2' },
        modificationTime: { name: 'MODIFICATION_TIME', dbTypeName: 'VARCHAR2' },
    };
}

@Injectable()
export class ItemHisRepository extends TableRepository<ItemHisEntity> {
    constructor() {
        super(new ItemHisMetadata());
    }
}
