import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { BasicDataRequestActions } from '@/modules/basic-data/common/db/action/basic-data-request.action';
import { ProfileRepository } from '@/modules/basic-data/common/db/entities/profile/profile.repository';
import {
    SRM2_ITEM_TRANSPORT,
    SRM2_ITEM_UPDATE,
} from '@/modules/basic-data/srm2/srm2-items/constants/queues.constants';
import { SrmItemsController } from '@/modules/basic-data/srm2/srm2-items/controllers';
import { Srm2ItemDbDBActions } from '@/modules/basic-data/srm2/srm2-items/db/actions';
import { ItemHisRepository } from '@/modules/basic-data/srm2/srm2-items/db/entities/item-his.repository';
import { ItemOrgHisRepository } from '@/modules/basic-data/srm2/srm2-items/db/entities/item-org-his.repository';
import { Srm2ItemService } from '@/modules/basic-data/srm2/srm2-items/services';
import {
    UpdateItemConsumer,
    TransportItemConsumer,
} from '@/modules/basic-data/srm2/srm2-items/workers';

@Module({
    imports: [
        BullModule.registerQueue({
            name: SRM2_ITEM_UPDATE,
        }),
        // Register each queue using the `forFeature` method.
        BullBoardModule.forFeature({
            name: SRM2_ITEM_UPDATE,
            adapter: BullMQAdapter,
        }),

        BullModule.registerQueue({
            name: SRM2_ITEM_TRANSPORT,
        }),
        // Register each queue using the `forFeature` method.
        BullBoardModule.forFeature({
            name: SRM2_ITEM_TRANSPORT,
            adapter: BullMQAdapter,
        }),
        HttpModule,
    ],
    controllers: [SrmItemsController],
    providers: [
        UpdateItemConsumer,
        TransportItemConsumer,
        Srm2ItemDbDBActions,
        Srm2ItemService,
        BasicDataRequestActions,
        ProfileRepository,
        ItemHisRepository,
        ItemOrgHisRepository,
    ],
})
export class Srm2BasicItemDataModule {}
