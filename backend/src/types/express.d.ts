import 'express';
import { Logger } from 'pino';

declare global {
    namespace Express {
        interface Request {
            cookies: {
                refreshToken?: string;
            };
            userId?: string;
            log: Logger;
        }
    }
}

export { };
