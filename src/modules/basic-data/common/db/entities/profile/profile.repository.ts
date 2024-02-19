import { Injectable } from '@nestjs/common';

import { TableEntity } from '@/infra/database/oracle/data/table/table.entity';
import { TableMetadata } from '@/infra/database/oracle/data/table/table.metadata';
import { TableRepository } from '@/infra/database/oracle/data/table/table.repository';

export class ProfileEntity extends TableEntity {
    env: string;

    interfaceName: string;

    auth: string;

    url: string;

    profileJson: string;
}

export class ProfileMetadata extends TableMetadata<ProfileEntity> {
    databaseName = 'ERP';

    schema = 'CUX';

    tableName = 'CUX_BASIC_DATA_PROFILE';

    primaryKey = {
        key: 'id',
        column: 'ID',
        dbTypeName: 'NUMBER',
        sequence: { schema: 'CUX', name: 'CUX_BASIC_DATA_PROFILE_S' },
    };

    columnMapper = {
        id: { name: 'ID', dbTypeName: 'NUMBER' },
        env: { name: 'ENV', dbTypeName: 'VARCHAR2' },
        interfaceName: { name: 'INTERFACE_NAME', dbTypeName: 'VARCHAR2' },
        auth: { name: 'AUTH', dbTypeName: 'VARCHAR2' },
        url: { name: 'URL', dbTypeName: 'VARCHAR2' },
        profileJson: { name: 'PROFILE_JSON', dbTypeName: 'VARCHAR2' },
    };
}

@Injectable()
export class ProfileRepository extends TableRepository<ProfileEntity> {
    protected metadata: TableMetadata<ProfileEntity> = new ProfileMetadata();
}
