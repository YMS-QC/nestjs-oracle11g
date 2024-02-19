import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { Public } from '@/common/decorators/public.decorator';
import { AuthDto } from '@/modules/auth/dto/auth.dto';
import { RefreshTokenGuard } from '@/modules/auth/guards';
import { AuthService } from '@/modules/auth/services/auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly service: AuthService) {}

    @Public()
    @Post('login')
    async login(@Body() data: AuthDto) {
        return this.service.login(data);
    }

    @UseGuards(RefreshTokenGuard)
    @Public()
    @Post('refresh')
    refresh(@Request() req: any) {
        console.log('entered refresh');
        return this.service.getTokens(req.user.sub, req.user.username);
    }
}
