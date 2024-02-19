import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import ms from 'ms';

import {
    JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET,
    jwtConstantsTemplateValue,
} from '@/modules/auth/constants';
import { AuthDBActions } from '@/modules/auth/db/actions/auth-dbActions';
import { ValidateUserResult } from '@/modules/auth/db/stmts/querys';
import { AuthDto } from '@/modules/auth/dto/auth.dto';

const ACCESS_TOKEN_EXPIRE_IN = `30m`;
const REFRESH_TOKEN_EXPIRE_IN = `7d`;

@Injectable()
export class AuthService {
    constructor(
        private readonly authActions: AuthDBActions,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async validateUser(payload: AuthDto): Promise<ValidateUserResult> {
        const user = await this.authActions.validateUser(payload);
        return user;
    }

    /**
     * @description 登录，使用local策略，需要用户名和密码
     */
    async login(req: AuthDto) {
        const user = await this.validateUser(req);

        if (!user) {
            return {
                success: false,
                errorCode: '401',
                errorMessage: '用户名密码错误',
            };
        }

        const { userId, username } = user;

        const { token, refreshToken, expiresAt, refreshToneExpiresAt } =
            await this.getTokens(userId, username);

        return {
            success: true,
            data: {
                userId,
                account: username,
                token,
                refreshToken,
                expiresAt,
                refreshToneExpiresAt,
            },
        };
    }

    async getTokens(sub: string, username: string) {
        const now = new Date().getTime();

        const expiresAt = now + ms(ACCESS_TOKEN_EXPIRE_IN) - 1000; // 提前一秒
        const refreshToneExpiresAt = now + ms(REFRESH_TOKEN_EXPIRE_IN);

        // console.log(now);
        // console.log(ms(ACCESS_TOKEN_EXPIRE_IN));
        // console.log(expiresIn);

        const [token, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                {
                    sub,
                    username,
                },
                {
                    secret:
                        this.configService.get<string>(JWT_ACCESS_SECRET) ||
                        jwtConstantsTemplateValue[JWT_ACCESS_SECRET],
                    expiresIn: ACCESS_TOKEN_EXPIRE_IN,
                },
            ),
            this.jwtService.signAsync(
                {
                    sub,
                    username,
                },
                {
                    secret:
                        this.configService.get<string>(JWT_REFRESH_SECRET) ||
                        jwtConstantsTemplateValue[JWT_REFRESH_SECRET],
                    expiresIn: REFRESH_TOKEN_EXPIRE_IN,
                },
            ),
        ]);

        return {
            token,
            refreshToken,
            expiresAt,
            refreshToneExpiresAt,
        };
    }
}
