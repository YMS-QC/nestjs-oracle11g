import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import * as nestjs from '@bull-board/nestjs';

import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker as MqWorker, ConnectionOptions } from 'bullmq';

import dayjs from 'dayjs';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { IResponse } from '@/common/Iresponse/Iresponse';
import { OraUtil } from '@/infra/database/oracle/utils';
import {
    EsbResponseType,
    getEsbResponse,
} from '@/modules/plsql/common/esb/esbResponse';
import { API_REGIST_QUEUE, REQUEST_STATUS } from '@/modules/plsql/constants';
import { PlsqlDbactions } from '@/modules/plsql/db/dbActions/plsql.dbactions';
import {
    ApiTopEntity,
    ApiTopRepository,
} from '@/modules/plsql/db/entities/api-top.repository';
import { ApiRegistDto, ApiUniqueRefDto } from '@/modules/plsql/dtos';
import { ApiData } from '@/modules/plsql/types';

@Injectable()
export class PlsqlService implements OnModuleInit {
    private _callbackQueues = new Map<
        string,
        { queue: Queue; worker: MqWorker }
    >();

    private getCallbackQueue(name: string) {
        if (this._callbackQueues.has(name))
            return this._callbackQueues.get(name);

        const { queue, worker } = this.createQueueWorker(name, {
            host: this.configService.get<string>('REDIS_HOST') || 'localhost',
            port: this.configService.get<number>('REDIS_PORT') || 6379,
            password: this.configService.get<string>('REDIS_PASSWORD'),
        });

        // worker.run();

        this.bullBoardInstance.addQueue(new BullMQAdapter(queue));

        this._callbackQueues.set(name, { queue, worker });

        return { queue, worker };
    }

    constructor(
        @InjectQueue(API_REGIST_QUEUE)
        private readonly apiRegistQueue: Queue,
        @nestjs.InjectBullBoard()
        private readonly bullBoardInstance: nestjs.BullBoardInstance,
        private readonly dbAction: PlsqlDbactions,
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
        private readonly apiRepository: ApiTopRepository,
    ) {}

    async onModuleInit() {
        // 模块初始化，清理注册队列连接
        await this.apiRegistQueue.drain();
    }

    /** *
     * @description 提交接口注册任务 使用 packageName + procedureName 作为jobName,提交到队列中
     *
     */
    async submitRegistPlsqlApiJob(params: ApiRegistDto): Promise<IResponse> {
        // 校验提交的包和存储过程是否实际存在，不存在则报错

        // 提交任务

        const jobName = `${params.packageName}.${params.procedureName}`;

        const activeJobs = await this.apiRegistQueue.getActive();
        const delayedJobs = await this.apiRegistQueue.getDelayed();
        const waitingJobs = await this.apiRegistQueue.getWaiting();
        if (
            activeJobs.find((activeJob: Job) => jobName === activeJob.name) ||
            delayedJobs.find((delayJob: Job) => jobName === delayJob.name) ||
            waitingJobs.find((waitingJob: Job) => jobName === waitingJob.name)
        ) {
            return {
                success: false,
                errorCode: 'E0001',
                message: '当前接口的注册正在进行中，请稍后再试！',
            };
        }

        await this.apiRegistQueue.add(
            `${params.packageName}.${params.procedureName}`,
            params,
        );

        return { success: true };
    }

    /**
     * @description 接口注册函数 ，时间较长
     *
     */
    async registPlsqlApi(params: ApiRegistDto): Promise<IResponse> {
        const {
            packageName,
            procedureName,
            bizName,
            remark = '',
            lastUpdatedBy = 'SYSADMIN',
        } = params;

        try {
            // try 任意过程存在ERROR throw
            // registStep1 注册到基表中
            let result = await this.dbAction.regist({
                packageName,
                procedureName,
                bizName,
                remark,
                lastUpdatedBy,
            });

            // console.log(registError);

            if (!result.success) throw new Error(result.message);

            //  registStep2 将状态改成 registing
            result = await this.dbAction.updateStatus({
                packageName,
                procedureName,
                status: 'REGISTING',
            });

            // console.log(updateRegistingError);
            if (!result.success) throw new Error(result.message);

            // registStep3 执行ddl,编译数据库对象
            result = await this.dbAction.genAndExcuteDDL({
                packageName,
                procedureName,
            });

            // console.log(ddlError);

            if (!result.success) throw new Error(result.message);

            // registStep4 将状态改成 valid
            result = await this.dbAction.updateStatus({
                packageName,
                procedureName,
                status: 'VALID',
            });

            // console.log(updateValidError);

            if (!result.success) throw new Error(result.message);

            return { success: true };
        } catch (error: any) {
            // catch 解析Error信息，将状态改成 invalid

            const updateResult = await this.dbAction.updateStatus({
                packageName,
                procedureName,
                status: 'INVALID',
            });

            return updateResult;
        }
    }

    /**
     * @description 使用包名 + 存储过程名查询是否有已经注册的接口
     *
     */
    async info(params: { packageName: string; procedureName: string }) {
        return this.dbAction.findOneRestApi(params);
    }

    async invokePlsqlApi(
        params: ApiUniqueRefDto,
        data: any,
    ): Promise<EsbResponseType> {
        const { packageName, procedureName } = params;
        const apiQueryResult = await this.info({ packageName, procedureName });

        // console.log(apiQueryResult);

        const apiInfo = apiQueryResult.data ? apiQueryResult.data[0] : null;

        const result: EsbResponseType = getEsbResponse();
        result.esbInfo.instId = data?.esbInfo?.instId;
        result.esbInfo.requestTime =
            data?.esbInfo?.requestTime ||
            dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');
        result.esbInfo.responseTime = dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');

        // 前置判断
        if (!apiQueryResult.success || !apiInfo) {
            result.esbInfo.returnCode = 'E9999';
            result.esbInfo.returnMsg = `api ${packageName}/${procedureName} 注册信息发生错误,没有对应的api`;
            return result;
        }

        if (apiInfo.status === 'INVALID') {
            result.esbInfo.returnCode = 'E9999';
            result.esbInfo.returnMsg = `api ${packageName}/${procedureName} 已失效，拒绝调用`;
            return result;
        }
        if (apiInfo.status === 'REGISTING') {
            result.esbInfo.returnCode = 'E9999';
            result.esbInfo.returnMsg = `api ${packageName}/${procedureName} 正在注册中`;
            return result;
        }

        const messageId = await this.dbAction.getRequestSequence();

        const callbackUrl = data?.callbackInfo?.URL;

        // 直接运行
        if (!callbackUrl && messageId)
            return this.invokePlsqlApiDirectly({
                packageName,
                procedureName,
                data,
                messageId,
                apiInfo,
            });

        // 异步回调

        const upperData = OraUtil.getUpperCasedObj(data);

        const sourceSysCode =
            upperData?.REQUESTINFO?.SOURCE_CODE ||
            upperData?.REQUESTINFO?.HEADER?.SOURCE_CODE ||
            upperData?.REQUESTINFO?.HEADER?.SCUX_SOURCE_CODE ||
            upperData?.REQUESTINFO?.HEADER_TBL?.SOURCE_CODE ||
            upperData?.REQUESTINFO?.HEADER_TBL?.SCUX_SOURCE_CODE ||
            upperData?.REQUESTINFO?.HEAD_TBL?.SOURCE_CODE ||
            upperData?.REQUESTINFO?.HEAD_TBL?.SCUX_SOURCE_CODE ||
            '默认统一';

        const queueName = `${sourceSysCode}回调队列`;

        // 检查队列，active状态的job数量是否等于worker设置的并行度,目前不能超过
        const { queue, worker } = this.getCallbackQueue(queueName);

        if ((await queue.getActiveCount()) >= worker.concurrency) {
            result.esbInfo.returnCode = 'E9999';
            result.esbInfo.returnMsg = `${queueName}已满，请稍后再试！`;

            return result;
        }

        this.getCallbackQueue(queueName).queue.add(
            messageId.toString(),
            {
                packageName,
                procedureName,
                data,
                messageId,
                apiInfo,
                callbackUrl,
            },
            { jobId: `${sourceSysCode}-${messageId.toString()}` },
        );

        result.esbInfo.returnStatus = 'S';
        result.esbInfo.returnMsg = `成功提交任务 messageId:${messageId},请等待接口回调`;
        result.resultInfo = { messageId };

        return result;
    }

    async invokePlsqlApiDirectly(params: ApiData): Promise<EsbResponseType> {
        const { packageName, procedureName, data, messageId, apiInfo } = params;

        const result: EsbResponseType = getEsbResponse();
        result.esbInfo.instId = data?.esbInfo?.instId;
        result.esbInfo.requestTime =
            data?.esbInfo?.requestTime ||
            dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');
        result.esbInfo.responseTime = dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');
        // 插入请求

        const id = await this.dbAction.insertRequest(
            packageName,
            procedureName,
            data,
            messageId,
        );

        // 运行
        const {
            result: plsqlResult,
            message,
            success,
            error,
            dbmsOutput,
        } = await this.dbAction.invokePlsqlRegistedApi(
            {
                wrapName: apiInfo.wrapName,
                pInType: apiInfo.pIn,
                pOutType: apiInfo.pOut,
            },
            data,
        );

        // 置换值，让返回值适应esb格式

        if (!success) {
            result.esbInfo.returnStatus =
                plsqlResult?.ESBINFO_O?.RETURNSTATUS || 'E';
            result.esbInfo.returnCode =
                plsqlResult?.ESBINFO_O?.RETURNCODE || 'E9999';
            result.esbInfo.returnMsg =
                plsqlResult?.ESBINFO_O?.RETURNMSG || message;
            result.resultInfo = plsqlResult?.RESULTINFO || error;
        } else {
            result.esbInfo.returnStatus =
                plsqlResult?.ESBINFO_O?.RETURNSTATUS || 'S';
            result.esbInfo.returnCode =
                plsqlResult?.ESBINFO_O?.RETURNCODE || 'A9999';
            result.esbInfo.returnMsg =
                plsqlResult?.ESBINFO_O?.RETURNMSG || message;
            result.resultInfo = plsqlResult?.RESULTINFO || error;
        }

        result.esbInfo.attr1 = plsqlResult?.ESBINFO_O?.ATTR1
            ? plsqlResult?.ESBINFO_O?.ATTR1
            : null;
        result.esbInfo.attr2 = plsqlResult?.ESBINFO_O?.ATTR2
            ? plsqlResult?.ESBINFO_O?.ATTR1
            : null;
        result.esbInfo.attr3 = plsqlResult?.ESBINFO_O?.ATTR3
            ? plsqlResult?.ESBINFO_O?.ATTR1
            : null;
        // 调试输出
        if (dbmsOutput) result.dbmsOutput = dbmsOutput;

        // 插入结果
        await this.dbAction.updateResponse(id, {
            returnCode: result.esbInfo.returnCode,
            returnMsg: result.esbInfo.returnMsg,
            returnVal: result,
        });

        return result;
    }

    async processCallBackJob(job: Job<ApiData, any, any>): Promise<any> {
        job.log('====================异步执行开始！======================');

        const { callbackUrl } = job.data;

        const requestId = await this.dbAction.insertCallbackRequest({
            messageId: job.data.messageId,
            queueName: job.queueName,
            jobId: job.id,
            callbackUrl,
        });

        const invokeResult = await this.invokePlsqlApiDirectly(job.data);

        job.log('异步执行结果：');
        job.log(JSON.stringify(invokeResult));

        job.log('====================异步执行完成！======================');

        job.log('======================回调开始===========================');

        job.log('开始调用回调api');
        job.log(callbackUrl);

        const callbackBody = {
            esbInfo: {
                instId: invokeResult?.esbInfo?.instId || '',
                requestTime: dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
                responseTime: dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
                returnCode: invokeResult?.esbInfo?.returnCode || 'A0001',
                returnStatus: invokeResult?.esbInfo?.returnStatus || 'S',
                returnMsg: invokeResult?.esbInfo?.returnMsg || '',
            },
            requestInfo: {
                jobId: job.id,
                messageId: job.data.messageId,
                ...invokeResult?.resultInfo,
            },
        };

        job.log('请求报文:');
        job.log(JSON.stringify(callbackBody));

        await this.dbAction.updateCallbackRequest(requestId, callbackBody);

        const callbackAuth = {
            username: this.configService.get('ESB_USERNAME'),
            password: this.configService.get('ESB_PASSWORD'),
        };

        const headers = {
            auth: callbackAuth,
        };

        callbackBody.esbInfo = invokeResult.esbInfo;

        const result = await firstValueFrom(
            this.httpService
                .post(callbackUrl, callbackBody, headers)
                .pipe(map((response) => response.data)),
        )
            .then((data) => {
                return { data, success: true, message: null, error: null };
            })
            .catch((error) => {
                return {
                    data: null,
                    success: false,
                    message: error.message,
                    error,
                };
            });

        if (result.success) {
            job.log('响应报文:');
            job.log(JSON.stringify(result.data));
        } else {
            job.log('错误信息:');
            job.log(JSON.stringify(result.error));
        }

        const returnStatus = result.success
            ? REQUEST_STATUS.SUCCESS
            : REQUEST_STATUS.ERROR;
        const returnCode = result.data?.esbInfo?.returnCode ?? returnStatus;
        const returnMsg = result.success
            ? result.data?.esbInfo?.returnMsg ?? ''
            : result.message;

        await this.dbAction.updateCallbackResponse(
            requestId,
            returnStatus,
            returnCode,
            returnMsg,
            result.data,
        );

        job.log('======================回调完成===========================');
    }

    createQueueWorker(name: string, connection: ConnectionOptions) {
        const queue = new Queue(name, {
            connection,
        });

        const worker = new MqWorker(
            name,
            async (job: Job<ApiData, any, any>) => {
                this.processCallBackJob(job);
            },
            {
                concurrency: 30,
                removeOnComplete: {
                    age: 3600 * 24, // keep up to 1 * 24 hour
                    count: 10000, // keep up to 1000 jobs
                },
                removeOnFail: {
                    age: 24 * 3600, // keep up to 24 hours
                },
                connection,
            },
        );

        return { queue, worker };
    }

    /**
     * CURD 开始
     *
     *
     */

    /**
     * list 分页查询
     */
    list(param: any): any {
        const { origName = '' } = param;
        return this.apiRepository.findWithPagination(
            { where: { origName }, op: '%LIKE%' },
            { page: param.page ?? 1, size: param.size ?? 10 },
        );
    }

    /**
     * detail 查询某个接口
     *
     */
    detail(id: number): any {
        return this.apiRepository.findById(id);
    }

    /**
     * edit 编辑某个接口
     *
     */
    edit(data: Partial<ApiTopEntity>): any {
        return this.apiRepository.update(data.id, {
            bizName: data.bizName,
            remark: data.remark,
        });
    }

    /**
     * invalid 失效某个接口
     *
     */
    async invalid(id: number, user: any) {
        const result = await this.apiRepository.update(id, {
            status: 'INVALID',
            lastUpdatedBy: user.username,
            lastUpdateDate: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        });

        if (!result.success) return result;

        if ((result.result.rowsAffected ?? 0) < 1) {
            return {
                success: false,
                errorCode: 'NO DATA UPDATED',
                message: '没有对应的接口数据',
            };
        }
        return { success: true, message: '成功失效接口' };
    }

    /**
     * regist 重新注册接口
     *
     */
    async regist(id: number, user: any) {
        // 查询这个接口数据

        const result = await this.apiRepository.findById(id);

        if (!result.success) return result;

        const { data } = result;

        if (!result.data.id)
            return {
                success: false,
                errorCode: 'NO DATA FOUND',
                message: '没有找到对应的接口数据',
            };

        // 重新注册某个接口
        return this.submitRegistPlsqlApiJob({
            packageName: data.origPackageName,
            procedureName: data.origObjectName,
            bizName: data.bizName,
            remark: data.remark,
            lastUpdatedBy: user.username ?? null,
        });
    }

    async listJob() {
        const jobList = await this.apiRegistQueue.getJobs(null, 0, 100);

        const data = await Promise.all(
            jobList.map(async (job) => {
                const status = await job.getState();

                return {
                    id: job.id,
                    name: job.name,
                    status,
                };
            }),
        );

        data.sort((pre, curr) => (Number(pre.id) > Number(curr.id) ? -1 : 1));

        return { success: true, data };
    }

    async queueStatus() {
        const isPaused = await this.apiRegistQueue.isPaused();

        return { success: true, data: { isPaused } };
    }

    async resumeQueue() {
        try {
            await this.apiRegistQueue.resume();
            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                errorCode: 'RESUME_QUEUE_ERR',
                message: error.message,
            };
        }
    }

    async pauseQueue() {
        try {
            await this.apiRegistQueue.pause();
            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                errorCode: 'PAUSE_QUEUE_ERR',
                message: error.message,
            };
        }
    }

    async getJobLogs(id: string): Promise<IResponse> {
        try {
            const data = await this.apiRegistQueue.getJobLogs(id);
            return { success: true, data };
        } catch (error: any) {
            return {
                success: false,
                errorCode: 'GET_LOG_ERROR',
                message: error.message,
            };
        }
    }
}
