import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import {
    JWT_ACCESS_SECRET,
    jwtConstantsTemplateValue,
} from '@/modules/auth/constants';

type JwtPayload = {
    sub: string;
    username: string;
};

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey:
                process.env[JWT_ACCESS_SECRET] ||
                jwtConstantsTemplateValue[JWT_ACCESS_SECRET],
        });
    }

    async validate(payload: JwtPayload) {
        // console.log(`jwt-strategy${Object.keys(payload)}`);
        // console.log(payload);
        return payload;
    }
}
