import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ProfileRepository } from '@/modules/basic-data/common/db/entities/profile/profile.repository';
import { SRM2_BANK_TRANSPORT } from '@/modules/basic-data/srm2/srm2-bank/constants';
import { Srm2BankController } from '@/modules/basic-data/srm2/srm2-bank/controllers';
import { Srm2BankDbActions } from '@/modules/basic-data/srm2/srm2-bank/db/db-actions';
import { Srm2BankService } from '@/modules/basic-data/srm2/srm2-bank/services';
import { UpdateBankConsumer } from '@/modules/basic-data/srm2/srm2-bank/workers/update';

@Module({
    imports: [
        BullModule.registerQueue({
            name: SRM2_BANK_TRANSPORT,
        }),
        // Register each queue using the `forFeature` method.
        BullBoardModule.forFeature({
            name: SRM2_BANK_TRANSPORT,
            adapter: BullMQAdapter,
        }),
        HttpModule,
    ],

    providers: [
        Srm2BankDbActions,
        ProfileRepository,
        Srm2BankService,
        UpdateBankConsumer,
    ],
    controllers: [Srm2BankController],
})
export class Srm2BankModule {}
