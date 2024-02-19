import { Injectable } from '@nestjs/common';

import { executeQuery } from '@/infra/database/oracle/utils/ora-util';
import { SEQUENCE } from '@/modules/basic-data/common/db/stmts';

@Injectable()
export class BasicDataRequestActions {
    async sequence(): Promise<number> {
        const result = await executeQuery<{ sequence: number }>('ERP', {
            statement: SEQUENCE,
        });

        if (!result.success) throw Error(result.message);
        return result.data[0].sequence;
    }
}
