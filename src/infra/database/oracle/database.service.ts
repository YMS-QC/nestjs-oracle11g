import { Injectable, OnApplicationShutdown } from '@nestjs/common';

import { OracleConnectionFactory } from './connections/oracle-connnection.factory';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
    // private logger = new Logger(DatabaseService.name);

    async onApplicationShutdown(signal?: string) {
        await OracleConnectionFactory.onApplicationShutdown(signal);
    }
}
