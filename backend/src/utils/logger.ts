import pino from 'pino';

const env = process.env.NODE_ENV || 'development';
const isDev = env === 'development';

const logger = pino({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),

    ...(isDev && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname'
            }
        }
    }),

    base: {
        service: 'mono-server-backend',
        env
    }
});

export default logger;