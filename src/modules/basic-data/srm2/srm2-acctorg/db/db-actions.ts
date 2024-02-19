import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { executeQuery } from '@/infra/database/oracle/utils/ora-util';
import { ProfileRepository } from '@/modules/basic-data/common/db/entities/profile/profile.repository';

@Injectable()
export class Srm2AcctOrgDbActions {
    constructor(
        private readonly config: ConfigService,
        private readonly profileRepository: ProfileRepository,
    ) {}

    async query() {
        return executeQuery(
            'TGS',
            {
                statement: `
     Select Lsbzdw_Dwbh As Tgs_Budget_Code,
            Lsbzdw_Dwmc As Tgs_Budget_Name,
            Lsbzdw_Sjgs As Parent_Code,
            'N' As Is_Sbu,
            Null As Sbu_Code,
            'N' as is_invalid
       From Lc0019999.Lsbzdw`,
            },
            false,
        );
    }

    async getJobProfile() {
        const env = String(this.config.get('PROFILE_ENV')).toUpperCase();

        const result = await this.profileRepository.findOneBy({
            env,
            interfaceName: 'srm2-acctorg',
        });

        return result;
    }
}
