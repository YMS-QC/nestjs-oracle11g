import { IsInt, IsOptional, Max, Min } from 'class-validator';

// const inValidDateStringMessage = (e: ValidationArguments) => {
//     return `${e.property} 日期格式不符合 YYYY-MM-DD HH:mm:ss `;
// };

export class UpdateProfileDto {
    @IsOptional()
    enableDateRange?: boolean;

    @Min(30, {
        message: (e) => {
            return `${e.property} 更新间隔时间最小为30秒`;
        },
    })
    @IsInt()
    @IsOptional()
    sleepSeconds?: number;

    @IsOptional()
    dateFrom?: string;

    @IsOptional()
    dateTo?: string;

    @IsInt()
    @IsOptional()
    maxRowNumber?: number;

    @Max(100, {
        message: (e) => {
            return `${e.property} 单次传输批次最大为100行`;
        },
    })
    @IsInt()
    @IsOptional()
    transportRowLimit?: number;

    @IsInt()
    @IsOptional()
    lookbackDays?: number;
}
