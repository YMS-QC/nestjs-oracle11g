import { Controller, Post } from '@nestjs/common';

import { Srm2BankBranchService } from '@/modules/basic-data/srm2/srm2-bankbranch/services';

@Controller('basic-data/srm2-bankbranch')
export class Srm2BankBranchController {
    constructor(private readonly service: Srm2BankBranchService) {}

    @Post('/start')
    startJob() {
        return this.service.startJob();
    }

    @Post('/list')
    listJob() {
        return this.service.listJob();
    }
}
