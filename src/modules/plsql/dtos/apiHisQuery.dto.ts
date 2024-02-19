import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ApiHisQueryDto {
    @IsString()
    @IsOptional()
    interfaceName!: string;

    @IsString()
    @IsOptional()
    bizName!: string;

    @IsNumber()
    @IsOptional()
    dateFrom!: number;

    @IsNumber()
    @IsOptional()
    dateTo!: number;

    @IsNumber()
    @IsOptional()
    page!: number;

    @IsNumber()
    @IsOptional()
    size!: number;

    @IsString()
    @IsOptional()
    requestStatus!: string;

    @IsString()
    @IsOptional()
    requestBody!: string;

    @IsString()
    @IsOptional()
    responseBody!: string;
}
