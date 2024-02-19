import { Injectable } from '@nestjs/common';

import { TableEntity } from '@/infra/database/oracle/data/table/table.entity';
import { TableMetadata } from '@/infra/database/oracle/data/table/table.metadata';
import { TableRepository } from '@/infra/database/oracle/data/table/table.repository';

export class RcvHisEntity extends TableEntity {
    orgId: number;

    organizationCode: string;

    organizationId: number;

    storageLocation: string;

    quantity: number;

    receiveTime: string;

    qualityCheckId: number;

    exchange: string;

    materialNumber: string;

    purchaseUnit: string;

    transactionType: string;

    taxRate: string;

    taxCode: string;

    currency: string;

    netPrice: number;

    price: number;

    voucherQuantity: number;

    voucherDate: string;

    deliveryItemNumber: string;

    deliveryNumber: string;

    orderItemNumber: string;

    orderNumber: string;

    supplierCode: string;

    factory: string;

    company: string;

    processMessage: string;

    processStatus: string;

    transportBatch: number;

    updateDate: string;

    updateBatch: string;

    transactionId: number;
}

export class RcvHisMetadata extends TableMetadata<RcvHisEntity> {
    databaseName = 'ERP';

    schema = 'CUX';

    tableName = 'CUX_SRM2_RCV_HIS';

    primaryKey = {
        key: 'transactionId',
        column: 'TRANSACTION_ID',
        dbTypeName: 'NUMBER',
    };

    columnMapper = {
        orgId: { name: 'ORG_ID', dbTypeName: 'NUMBER' },
        organizationCode: { name: 'ORGANIZATION_CODE', dbTypeName: 'VARCHAR2' },
        organizationId: { name: 'ORGANIZATION_ID', dbTypeName: 'NUMBER' },
        storageLocation: { name: 'STORAGE_LOCATION', dbTypeName: 'VARCHAR2' },
        quantity: { name: 'QUANTITY', dbTypeName: 'NUMBER' },
        receiveTime: { name: 'RECEIVE_TIME', dbTypeName: 'VARCHAR2' },
        qualityCheckId: { name: 'QUALITY_CHECK_ID', dbTypeName: 'NUMBER' },
        exchange: { name: 'EXCHANGE', dbTypeName: 'NUMBER' },
        materialNumber: { name: 'MATERIAL_NUMBER', dbTypeName: 'VARCHAR2' },
        purchaseUnit: { name: 'PURCHASE_UNIT', dbTypeName: 'VARCHAR2' },
        transactionType: { name: 'TRANSACTION_TYPE', dbTypeName: 'VARCHAR2' },
        taxRate: { name: 'TAX_RATE', dbTypeName: 'NUMBER' },
        taxCode: { name: 'TAX_CODE', dbTypeName: 'VARCHAR2' },
        currency: { name: 'CURRENCY', dbTypeName: 'VARCHAR2' },
        netPrice: { name: 'NET_PRICE', dbTypeName: 'NUMBER' },
        price: { name: 'PRICE', dbTypeName: 'NUMBER' },
        voucherQuantity: { name: 'VOUCHER_QUANTITY', dbTypeName: 'NUMBER' },
        voucherDate: { name: 'VOUCHER_DATE', dbTypeName: 'VARCHAR2' },
        deliveryItemNumber: {
            name: 'DELIVERY_ITEM_NUMBER',
            dbTypeName: 'VARCHAR2',
        },
        deliveryNumber: { name: 'DELIVERY_NUMBER', dbTypeName: 'VARCHAR2' },
        orderItemNumber: { name: 'ORDER_ITEM_NUMBER', dbTypeName: 'NUMBER' },
        orderNumber: { name: 'ORDER_NUMBER', dbTypeName: 'VARCHAR2' },
        supplierCode: { name: 'SUPPLIER_CODE', dbTypeName: 'VARCHAR2' },
        factory: { name: 'FACTORY', dbTypeName: 'VARCHAR2' },
        company: { name: 'COMPANY', dbTypeName: 'VARCHAR2' },
        processMessage: { name: 'PROCESS_MESSAGE', dbTypeName: 'VARCHAR2' },
        processStatus: { name: 'PROCESS_STATUS', dbTypeName: 'VARCHAR2' },
        transportBatch: { name: 'TRANSPORT_BATCH', dbTypeName: 'NUMBER' },
        updateDate: { name: 'UPDATE_DATE', dbTypeName: 'DATE' },
        updateBatch: { name: 'UPDATE_BATCH', dbTypeName: 'NUMBER' },
        transactionId: { name: 'TRANSACTION_ID', dbTypeName: 'NUMBER' },
    };
}

@Injectable()
export class RcvHisRepository extends TableRepository<RcvHisEntity> {
    constructor() {
        super(new RcvHisMetadata());
    }
}
