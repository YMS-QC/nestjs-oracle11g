import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Module, ModuleMetadata } from '@nestjs/common';

import { API_REGIST_QUEUE } from '@/modules/plsql/constants';
import { PlsqlController } from '@/modules/plsql/controllers/plsql.controller';
import { PlsqlDbactions } from '@/modules/plsql/db/dbActions/plsql.dbactions';
import { ApiHisRepository } from '@/modules/plsql/db/entities';
import { ApiTopRepository } from '@/modules/plsql/db/entities/api-top.repository';
import { PlsqlService } from '@/modules/plsql/services';
import { ApiHisService } from '@/modules/plsql/services/api-his.service';
import { ApiRegistWorker } from '@/modules/plsql/workers';

@Module({})
export class PlsqlModule {
    static forRoot(): DynamicModule {
        // const providers = {
        //     ...Object.values(services),
        //     // ...Object.values(dbActions),
        //     // ...Object.values(workers),
        // };

        const providers: ModuleMetadata['providers'] = [
            // ApiEntity,
            ApiHisService,
            PlsqlService,
            PlsqlDbactions,
            ApiRegistWorker,
            ApiTopRepository,
            ApiHisRepository,
        ];

        return {
            module: PlsqlModule,
            imports: [
                BullModule.registerQueue({
                    name: API_REGIST_QUEUE,
                }),
                // Register each queue using the `forFeature` method.
                BullBoardModule.forFeature({
                    name: API_REGIST_QUEUE,
                    adapter: BullMQAdapter,
                }),
                HttpModule,
            ],
            controllers: [PlsqlController],
            providers,
        };
    }
}
