import { Controller, Post } from '@nestjs/common';

import { Srm2BankService } from '@/modules/basic-data/srm2/srm2-bank/services';

@Controller('basic-data/srm2-bank')
export class Srm2BankController {
    constructor(private readonly service: Srm2BankService) {}

    @Post('/start')
    startJob() {
        return this.service.startJob();
    }

    @Post('/list')
    listJob() {
        return this.service.listJob();
    }
}
