import { Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import OracleDB from 'oracledb';

import { executeProcedure } from '@/infra/database/oracle/utils/ora-util';

import { ProfileRepository } from '@/modules/basic-data/common/db/entities/profile/profile.repository';
import { PROCESS_STATUS } from '@/modules/basic-data/constants/process-status';
import { RcvHisRepository } from '@/modules/basic-data/srm2/srm2-rcv/db/entities/rcv-his.repository';
import { STMT_MARK_RCV_UPDATES } from '@/modules/basic-data/srm2/srm2-rcv/db/stmts';

@Injectable()
export class Srm2RcvDbDBActions {
    constructor(
        private readonly config: ConfigService,
        private readonly profileRrepository: ProfileRepository,
        private readonly rcvHisRepository: RcvHisRepository,
    ) {}

    async markUpdate(params: {
        lookbackDays: number;
        dateFrom: string;
        dateTo: string;
        maxRowNumber: number;
    }) {
        const { lookbackDays, dateFrom, dateTo, maxRowNumber } = params;
        const procedureResult = await executeProcedure('ERP', {
            statement: STMT_MARK_RCV_UPDATES,
            binds: {
                lookbackDays: { dir: OracleDB.BIND_INOUT, val: lookbackDays },
                dateFrom: { dir: OracleDB.BIND_INOUT, val: dateFrom },
                dateTo: { dir: OracleDB.BIND_INOUT, val: dateTo },
                maxRowNumber: {
                    dir: OracleDB.BIND_INOUT,
                    val: maxRowNumber,
                },
                batchNumber: { dir: OracleDB.BIND_OUT },
                rowsUpdated: { dir: OracleDB.BIND_OUT },
            },
        });

        return procedureResult;
    }

    async queryPendingTransport(transportRowLimit: number) {
        const { success, data, errorCode, message } =
            await this.rcvHisRepository.find(
                {
                    processStatus: PROCESS_STATUS.PENDING,
                },

                { limit: { top: transportRowLimit } },
            );

        // console.log(expandedRows);

        return { success, data, errorCode, message };
    }

    async getJobProfile() {
        const env = String(this.config.get('PROFILE_ENV')).toUpperCase();

        const result = await this.profileRrepository.findOneBy({
            env,
            interfaceName: 'srm2-rcv',
        });

        return result.data;
    }

    async updateJobProfile(profile: any) {
        const env = String(this.config.get('PROFILE_ENV')).toUpperCase();
        const interfaceName = 'srm2-rcv';
        const profileJson = JSON.stringify(profile);

        return this.profileRrepository.updateCriteria(
            { env, interfaceName },
            { profileJson },
        );
    }

    async asignRunning(
        params: { transactionId: number; transportBatch: number }[],
    ) {
        const realBinds = params.map((r) => {
            return {
                ...r,
                processStatus: PROCESS_STATUS.RUNNING,
                processMessage: null,
            };
        });

        const result = await this.rcvHisRepository.updateMany(realBinds, [
            'transactionId',
        ]);

        return result;
    }

    async asignError(
        params: {
            transactionId: number;
            transportBatch: number;
            processMessage: string;
        }[],
    ) {
        const realBinds = params.map((r) => {
            return {
                ...r,
                processStatus: PROCESS_STATUS.ERROR,
            };
        });

        const result = await this.rcvHisRepository.updateMany(realBinds, [
            'transactionId',
        ]);

        return result;
    }

    async asignSuccess(
        params: {
            transactionId: number;
            transportBatch: number;
            processMessage: string;
        }[],
    ) {
        const realBinds = params.map((r) => {
            // console.log(r.processMessage);
            return {
                transactionId: r.transactionId,
                transportBatch: r.transportBatch,
                processStatus: PROCESS_STATUS.SUCCESS,
                processMessage: r.processMessage,
            };
        });

        const result = await this.rcvHisRepository.updateMany(realBinds, [
            'transactionId',
        ]);

        return result;
    }

    async asignPending(
        params: {
            transactionId: number;
            transportBatch: number;
            processMessage: string;
        }[],
    ) {
        const realBinds = params.map((r) => {
            return {
                ...r,
                processStatus: PROCESS_STATUS.PENDING,
            };
        });

        const result = await this.rcvHisRepository.updateMany(realBinds, [
            'transactionId',
        ]);
        return result;
    }
}
