import { Controller, Post } from '@nestjs/common';

import { Srm2CashPrjService } from '@/modules/basic-data/srm2/srm2-cashprj/services';

@Controller('basic-data/srm2-cashprj')
export class Srm2CashPrjController {
    constructor(private readonly service: Srm2CashPrjService) {}

    @Post('/start')
    startJob() {
        return this.service.startJob();
    }

    @Post('/list')
    stopJob() {
        return this.service.listJob();
    }
}
