import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import {
    JWT_REFRESH_SECRET,
    jwtConstantsTemplateValue,
} from '@/modules/auth/constants';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
    Strategy,
    'jwt-refresh',
) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey:
                process.env[JWT_REFRESH_SECRET] ||
                jwtConstantsTemplateValue[JWT_REFRESH_SECRET],
            passReqToCallback: true,
        });
    }

    validate(req: Request, payload: any) {
        const refreshToken = (req.get('Authorization') ?? '')
            .replace('Bearer', '')
            .trim();
        return { ...payload, refreshToken };
    }
}
