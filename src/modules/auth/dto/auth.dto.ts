import { ApiProperty } from '@nestjs/swagger';

export class AuthDto {
    @ApiProperty({ description: '工号', required: true })
    account!: string;

    @ApiProperty({ description: '密码', required: true })
    password!: string;
}
