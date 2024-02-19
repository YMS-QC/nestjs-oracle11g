import { Injectable } from '@nestjs/common';

import { executeQuery } from '@/infra/database/oracle/utils/ora-util';
import { AuthQuery } from '@/modules/auth/db/stmts';
import { ValidateUserResult } from '@/modules/auth/db/stmts/querys';
import { AuthDto } from '@/modules/auth/dto/auth.dto';

@Injectable()
export class AuthDBActions {
    async validateUser(payload: AuthDto) {
        const { account } = payload;

        const userInfo = await executeQuery<ValidateUserResult>(
            'ERP',
            AuthQuery.validateUser(account),
        ).then((result) => {
            if (!result.success) {
                return null;
            }

            return result.data[0] ?? null;
        });

        return userInfo;
    }
}
