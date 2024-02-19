import { Controller, Post } from '@nestjs/common';

import { Srm2BudgetOrgService } from '@/modules/basic-data/srm2/srm2-bdgorg/services';

@Controller('basic-data/srm2-bdgorg')
export class Srm2BdgOrgController {
    constructor(private readonly service: Srm2BudgetOrgService) {}

    @Post('/start')
    startJob() {
        return this.service.startJob();
    }

    @Post('/list')
    listJob() {
        return this.service.listJob();
    }
}
