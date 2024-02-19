import { Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { executeQuery } from '@/infra/database/oracle/utils/ora-util';
import { ProfileRepository } from '@/modules/basic-data/common/db/entities/profile/profile.repository';

@Injectable()
export class Srm2BankDbActions {
    constructor(
        private readonly config: ConfigService,
        private readonly profileRepository: ProfileRepository,
    ) {}

    async query() {
        return executeQuery(
            'TGS',
            {
                statement: `
         Select a.Zjbzyhlb_Ek_Bh Bank_Id,
                a.Zjbzyhlb_Ek_Bh Bank_Code,
                a.Zjbzyhlb_Ek_Mc Bank_Name,
                'Y' As ENABLED_FLAG
           From Lc0019999.Zjbzyhlb_Ek a
     `,
            },
            false,
        );
    }

    async getJobProfile() {
        const env = String(this.config.get('PROFILE_ENV')).toUpperCase();

        const result = await this.profileRepository.findOneBy({
            env,
            interfaceName: 'srm2-bank',
        });

        return result;
    }
}
