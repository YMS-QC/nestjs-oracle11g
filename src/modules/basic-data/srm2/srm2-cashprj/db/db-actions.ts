import { Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { executeQuery } from '@/infra/database/oracle/utils/ora-util';
import { ProfileRepository } from '@/modules/basic-data/common/db/entities/profile/profile.repository';

@Injectable()
export class Srm2CashPrjDbActions {
    constructor(
        private readonly config: ConfigService,
        private readonly profileRepository: ProfileRepository,
    ) {}

    async query() {
        return executeQuery(
            'TGS',
            {
                statement: `
     Select Ysysxm_Xmuid As Cashflow_Id,
            Ysysxm_Xmbh As Cashflow_Code,
            Ysysxm_Mc As Cashflow_Name,
            Ysysxm_Level As Cashflow_Level,
            y.Ysysxm_Inout As Cashflow_Type,
            y.Ysysxm_Fjnm As Cashflow_Fjnm,
            case when y.Ysysxm_Zfbj > 0 then 'Y' else 'N' end  As Cashflow_Zfbj,
            y.Ysysxm_Note As Flow_Type,
            (Select b.Ysysxm_Xmbh
               From Lc0019999.Ysysxm b
              Where b.Ysysxm_Fjnm =
              Substr(y.Ysysxm_Fjnm, 0, Length(y.Ysysxm_Fjnm) - 4)
              And rownum = 1) As Parent_Code,
            y.Ysysxm_Mx As Cashflow_Mx
     
       From Lc0019999.Ysysxm y
     `,
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
