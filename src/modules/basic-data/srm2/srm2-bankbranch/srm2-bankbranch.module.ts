import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ProfileRepository } from '@/modules/basic-data/common/db/entities/profile/profile.repository';
import { SRM2_BANKBRANCH_TRANSPORT } from '@/modules/basic-data/srm2/srm2-bankbranch/constants';
import { Srm2BankBranchController } from '@/modules/basic-data/srm2/srm2-bankbranch/controllers';
import { Srm2BankBranchDbActions } from '@/modules/basic-data/srm2/srm2-bankbranch/db/db-actions';
import { Srm2BankBranchService } from '@/modules/basic-data/srm2/srm2-bankbranch/services';
import { UpdateBankBranchConsumer } from '@/modules/basic-data/srm2/srm2-bankbranch/workers/update';

@Module({
    imports: [
        BullModule.registerQueue({
            name: SRM2_BANKBRANCH_TRANSPORT,
        }),
        // Register each queue using the `forFeature` method.
        BullBoardModule.forFeature({
            name: SRM2_BANKBRANCH_TRANSPORT,
            adapter: BullMQAdapter,
        }),
        HttpModule,
    ],
    providers: [
        Srm2BankBranchDbActions,
        ProfileRepository,
        Srm2BankBranchService,
        Srm2BankBranchController,
        UpdateBankBranchConsumer,
    ],
    controllers: [Srm2BankBranchController],
})
export class Srm2BankBranchModule {}
