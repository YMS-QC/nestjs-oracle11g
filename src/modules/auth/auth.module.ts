import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt';

import { PassportModule } from '@nestjs/passport';

import { AuthController } from '@/modules/auth/controllers/auth.controller';
import { AuthDBActions } from '@/modules/auth/db/actions/auth-dbActions';
import { AuthService } from '@/modules/auth/services/auth.service';
import {
    RefreshTokenStrategy,
    AccessTokenStrategy,
} from '@/modules/auth/strategies';

@Module({
    imports: [PassportModule, JwtModule.register({})],
    controllers: [AuthController],
    providers: [
        AuthService,
        AuthDBActions,
        AccessTokenStrategy,
        RefreshTokenStrategy,
    ],
    exports: [AuthService],
})
export class AuthModule {}
