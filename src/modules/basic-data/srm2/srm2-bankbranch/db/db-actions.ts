import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OracleDB from 'oracledb';

import { executeQuery } from '@/infra/database/oracle/utils/ora-util';
import { ProfileRepository } from '@/modules/basic-data/common/db/entities/profile/profile.repository';

@Injectable()
export class Srm2BankBranchDbActions {
    constructor(
        private readonly config: ConfigService,
        private readonly profileRepository: ProfileRepository,
    ) {}

    async query(cursor: string, pageSize: number) {
        const queryResult = await executeQuery(
            'TGS',
            {
                statement: `
         Select distinct 
                Bank_Branch_Code,
                Bank_Branch_Id,
                Bank_Branch_Name,
                Bank_Code,
                Bank_Name,
                Endable_Flag,
                Max(Bank_Branch_Code) Over() As next_cursor
           From (Select a.Zjbzyh_Bh As Bank_Branch_Code,
                        a.Zjbzyh_Bh As Bank_Branch_Id,
                        a.Zjbzyh_Mc As Bank_Branch_Name,
                        a.Zjbzyhlb_Ek_Bh As Bank_Code,
                        a.Zjbzyhlb_Ek_Mc As Bank_Name,
                        'Y' As Endable_Flag
                   From (Select a.Zjbzyh_Bh,
                                a.Zjbzyh_Mc,
                                b.Zjbzyhlb_Ek_Bh,
                                b.Zjbzyhlb_Ek_Mc
                           From Lc0019999.Zjbzyh a, Lc0019999.Zjbzyhlb_Ek b, Lc0019999.Zjbzyhlbgx_Ek c
                          Where a.Zjbzyh_Bh = c.Zjbzyh_Bh
                            And b.Zjbzyhlb_Ek_Bh = c.Zjbzyhlb_Ek_Bh) a
                  Where 1 = 1
                   And Zjbzyh_Bh > Nvl(:value,(Select Min(Zjbzyh_Bh) From Lc0019999.Zjbzyh z))
                   Order By Zjbzyh_Bh
                  )
            Where Rownum <= :pageSize
     `,
                binds: {
                    value: { val: cursor, type: OracleDB.STRING },
                    pageSize,
                },
            },
            false,
        );

        if (queryResult.success) {
            let nextCursor = null;
            let list: Array<any> = [];
            let hasNext = true;
            for (const e of queryResult.data) {
                nextCursor = e.NEXT_CURSOR;
                delete e.NEXT_CURSOR;
                list = list.concat(e);
                if (nextCursor <= cursor) hasNext = false;
            }
            if (!queryResult.data.length) hasNext = false;

            return {
                success: true,
                data: {
                    list,
                    hasNext,
                    cursor,
                    nextCursor,
                    pageSize: queryResult.data.length ?? 0,
                },
            };
        }

        console.log(JSON.stringify(queryResult));

        return {
            success: false,
            errorCode: queryResult.errorCode,
            message: queryResult.message,
        };
    }

    async getJobProfile() {
        const env = String(this.config.get('PROFILE_ENV')).toUpperCase();

        const result = await this.profileRepository.findOneBy({
            env,
            interfaceName: 'srm2-bankbranch',
        });

        return result;
    }
}
