import { Controller, Post } from '@nestjs/common';

import { Srm2AcctOrgService } from '@/modules/basic-data/srm2/srm2-acctorg/services';

@Controller('basic-data/srm2-acctorg')
export class Srm2AcctOrgController {
    constructor(private readonly service: Srm2AcctOrgService) {}

    @Post('/start')
    startJob() {
        return this.service.startJob();
    }

    @Post('/stop')
    stopJob() {
        return this.service.stopJob();
    }
}
