import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ProfileRepository } from '@/modules/basic-data/common/db/entities/profile/profile.repository';
import { SRM2_BDGORG_TRANSPORT } from '@/modules/basic-data/srm2/srm2-bdgorg/constants';
import { Srm2BdgOrgController } from '@/modules/basic-data/srm2/srm2-bdgorg/controllers/srm2-bdgorg.controller';
import { Srm2BudgetOrgDbDBActions } from '@/modules/basic-data/srm2/srm2-bdgorg/db/actions';
import { BudgetOrgRepository } from '@/modules/basic-data/srm2/srm2-bdgorg/db/entities';
import { Srm2BudgetOrgService } from '@/modules/basic-data/srm2/srm2-bdgorg/services';
import { UpdateBdgOrgConsumer } from '@/modules/basic-data/srm2/srm2-bdgorg/workers/update';

@Module({
    imports: [
        BullModule.registerQueue({
            name: SRM2_BDGORG_TRANSPORT,
        }),
        // Register each queue using the `forFeature` method.
        BullBoardModule.forFeature({
            name: SRM2_BDGORG_TRANSPORT,
            adapter: BullMQAdapter,
        }),
        HttpModule,
    ],

    providers: [
        BudgetOrgRepository,
        Srm2BudgetOrgDbDBActions,
        Srm2BudgetOrgService,
        ProfileRepository,
        UpdateBdgOrgConsumer,
    ],

    controllers: [Srm2BdgOrgController],
})
export class Srm2BdgOrgModule {}
