import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ProfileRepository } from '@/modules/basic-data/common/db/entities/profile/profile.repository';
import { SRM2_ACCTORG_TRANSPORT } from '@/modules/basic-data/srm2/srm2-acctorg/constants';
import { Srm2AcctOrgController } from '@/modules/basic-data/srm2/srm2-acctorg/controllers';
import { Srm2AcctOrgDbActions } from '@/modules/basic-data/srm2/srm2-acctorg/db/db-actions';
import { Srm2AcctOrgService } from '@/modules/basic-data/srm2/srm2-acctorg/services';
import { UpdateAcctOrgConsumer } from '@/modules/basic-data/srm2/srm2-acctorg/workers/update';

@Module({
    imports: [
        BullModule.registerQueue({
            name: SRM2_ACCTORG_TRANSPORT,
        }),
        // Register each queue using the `forFeature` method.
        BullBoardModule.forFeature({
            name: SRM2_ACCTORG_TRANSPORT,
            adapter: BullMQAdapter,
        }),
        HttpModule,
    ],

    providers: [
        Srm2AcctOrgDbActions,
        Srm2AcctOrgService,
        ProfileRepository,
        UpdateAcctOrgConsumer,
    ],
    controllers: [Srm2AcctOrgController],
})
export class Srm2AcctOrgModule {}
