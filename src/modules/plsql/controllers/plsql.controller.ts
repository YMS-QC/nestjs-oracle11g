import {
    Controller,
    Post,
    Body,
    Param,
    UseGuards,
    Get,
    Query,
    Request,
    HttpCode,
} from '@nestjs/common';

import { Public } from '@/common/decorators/public.decorator';
import { ApiRegistDto } from '@/modules/plsql/dtos';
import { ApiHisQueryDto } from '@/modules/plsql/dtos/apiHisQuery.dto';
import { AppKeyGuard } from '@/modules/plsql/guards/appKey.guard';
import { PlsqlService } from '@/modules/plsql/services';
import { ApiHisService } from '@/modules/plsql/services/api-his.service';

@Controller('plsql')
export class PlsqlController {
    constructor(
        private readonly service: PlsqlService,
        private readonly hisService: ApiHisService,
    ) {}

    @Post('registRestful')
    registRestful(@Body() data: ApiRegistDto, @Request() req: any): any {
        const { user } = req;
        console.log(user);
        return this.service.submitRegistPlsqlApiJob({
            ...data,
            lastUpdatedBy: user.username,
        });
    }

    @HttpCode(200)
    @UseGuards(AppKeyGuard)
    @Public()
    @Post('restful/:packageName/:procedureName')
    async restful(
        @Body() data: any,
        @Param('packageName') packageName: string,
        @Param('procedureName') procedureName: string,
    ) {
        return this.service.invokePlsqlApi(
            { packageName, procedureName },
            data,
        );
    }

    @Post('info/:packageName/:procedureName')
    info(
        @Param('packageName') packageName: string,
        @Param('procedureName') procedureName: string,
    ): any {
        return this.service.info({
            packageName: packageName.toUpperCase(),
            procedureName: procedureName.toUpperCase(),
        });
    }

    @Get('list')
    list(@Query() data: any): any {
        return this.service.list(data);
    }

    @Get('detail')
    detail(@Query('id') id: number): any {
        return this.service.detail(id);
    }

    @Post('edit')
    edit(@Body() data: any): any {
        return this.service.edit(data);
    }

    @Get('regist')
    regist(@Query('id') id: number, @Request() req: any) {
        return this.service.regist(id, req.user);
    }

    @Get('invalid')
    invalid(@Query('id') id: number, @Request() req: any) {
        console.log('entered invalid!!!');
        return this.service.invalid(id, req.user);
    }

    @Post('listJob')
    listJob() {
        return this.service.listJob();
    }

    @Post('resumeQueue')
    startQueue() {
        return this.service.resumeQueue();
    }

    @Post('pauseQueue')
    stopQueue() {
        return this.service.pauseQueue();
    }

    @Post('queueStatus')
    queueStatus() {
        return this.service.queueStatus();
    }

    @Get('getJobLogs')
    jobLog(@Query('id') id: string) {
        return this.service.getJobLogs(id);
    }

    @Get('listHis')
    listHis(@Query() data: ApiHisQueryDto) {
        return this.hisService.list(data);
    }

    @Get('requestInfo')
    requestInfo(@Query('id') id: number) {
        return this.hisService.requestInfo(id);
    }
}
