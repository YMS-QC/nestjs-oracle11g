import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { BasicDataRequestActions } from '@/modules/basic-data/common/db/action';
import { ProfileRepository } from '@/modules/basic-data/common/db/entities/profile/profile.repository';
import {
    SRM2_RCV_TRANSPORT,
    SRM2_RCV_UPDATE,
} from '@/modules/basic-data/srm2/srm2-rcv/constants';
import { SrmRcvController } from '@/modules/basic-data/srm2/srm2-rcv/controllers';
import { Srm2RcvDbDBActions } from '@/modules/basic-data/srm2/srm2-rcv/db/actions';
import { RcvHisRepository } from '@/modules/basic-data/srm2/srm2-rcv/db/entities/rcv-his.repository';
import { Srm2RcvService } from '@/modules/basic-data/srm2/srm2-rcv/services';
import {
    UpdateRcvConsumer,
    TransportRcvConsumer,
} from '@/modules/basic-data/srm2/srm2-rcv/workers';

@Module({
    imports: [
        BullModule.registerQueue({
            name: SRM2_RCV_UPDATE,
        }),
        // Register each queue using the `forFeature` method.
        BullBoardModule.forFeature({
            name: SRM2_RCV_UPDATE,
            adapter: BullMQAdapter,
        }),

        BullModule.registerQueue({
            name: SRM2_RCV_TRANSPORT,
        }),
        // Register each queue using the `forFeature` method.
        BullBoardModule.forFeature({
            name: SRM2_RCV_TRANSPORT,
            adapter: BullMQAdapter,
        }),
        HttpModule,
    ],
    controllers: [SrmRcvController],
    providers: [
        UpdateRcvConsumer,
        TransportRcvConsumer,
        Srm2RcvDbDBActions,
        Srm2RcvService,
        BasicDataRequestActions,
        ProfileRepository,
        RcvHisRepository,
    ],
})
export class Srm2BasicRcvDataModule {}
