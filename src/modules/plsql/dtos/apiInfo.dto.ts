import { IsString } from 'class-validator';

export class ApiUniqueRefDto {
    @IsString()
    packageName!: string;

    @IsString()
    procedureName!: string;
}
