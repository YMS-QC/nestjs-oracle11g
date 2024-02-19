import { Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
    executeProcedure,
    executeQuery,
} from '@/infra/database/oracle/utils/ora-util';
import { ProfileRepository } from '@/modules/basic-data/common/db/entities/profile/profile.repository';
import { UPDATE_ORG } from '@/modules/basic-data/srm2/srm2-bdgorg/db/stmts';

@Injectable()
export class Srm2BudgetOrgDbDBActions {
    constructor(
        private readonly profileRrepository: ProfileRepository,
        private readonly config: ConfigService,
    ) {}

    async update() {
        return executeProcedure('C1_DW', { statement: UPDATE_ORG });
    }

    async query() {
        return executeQuery(
            'C1_DW',
            {
                statement: `
     Select BUSIORGCODE As BUDGET_ORG_CODE,
            ORGNAME As BUDGET_ORG_NAME,
            PARENTCODE As PARENT_CODE,
            NVL(ISSBU,'N') As Is_Sbu,
            case when NVL(ENABLE,'Y') = 'N' then 'Y' else 'N' end  AS Is_inValid,
            SBUCODE As Sbu_Code
       From DW.C1_YS_BUDGET_ORGANIZE`,
            },
            false,
        );
    }

    async getJobProfile() {
        const env = String(this.config.get('PROFILE_ENV')).toUpperCase();

        const result = await this.profileRrepository.findOneBy({
            env,
            interfaceName: 'srm2-bdgorg',
        });

        return result;
    }
}
