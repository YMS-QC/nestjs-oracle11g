import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ProfileRepository } from '@/modules/basic-data/common/db/entities/profile/profile.repository';
import { SRM2_CASHPRJ_TRANSPORT } from '@/modules/basic-data/srm2/srm2-cashprj/constants';
import { Srm2CashPrjController } from '@/modules/basic-data/srm2/srm2-cashprj/controllers';
import { Srm2CashPrjDbActions } from '@/modules/basic-data/srm2/srm2-cashprj/db/db-actions';
import { Srm2CashPrjService } from '@/modules/basic-data/srm2/srm2-cashprj/services';
import { UpdateCashPrjConsumer } from '@/modules/basic-data/srm2/srm2-cashprj/workers/update';

@Module({
    imports: [
        BullModule.registerQueue({
            name: SRM2_CASHPRJ_TRANSPORT,
        }),
        // Register each queue using the `forFeature` method.
        BullBoardModule.forFeature({
            name: SRM2_CASHPRJ_TRANSPORT,
            adapter: BullMQAdapter,
        }),
        HttpModule,
    ],

    providers: [
        Srm2CashPrjDbActions,
        ProfileRepository,
        Srm2CashPrjService,
        UpdateCashPrjConsumer,
    ],
    controllers: [Srm2CashPrjController],
})
export class Srm2CashPrjModule {}
