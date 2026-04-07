import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import compression from 'compression';
import logger from './utils/logger';

import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { RegisterRoutes } from './routes/routes';
import * as swaggerJson from './config/swagger.json';
import errorHandler from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { requestIdMiddleware } from './middleware/requestId';
import { csrfProtection } from './middleware/csrf';
import { metricsMiddleware, metricsHandler } from './middleware/metrics';
import { gracefulShutdown } from './utils/shutdown';
import externalHealthRouter from './routes/externalHealth';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

const app = express();
const PORT = process.env.PORT || 8080;

// Request correlation
app.use(requestIdMiddleware);

// Metrics tracking
app.use(metricsMiddleware);

// Compression middleware
app.use(compression());

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ['\'self\''],
            styleSrc: ['\'self\'', '\'unsafe-inline\''],
            scriptSrc: ['\'self\''],
            imgSrc: ['\'self\'', 'data:', 'https:'],
        }
    }
}));

const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:8080'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
    const exempt = ['/api/v1/auth/login', '/api/v1/auth/register'];
    if (exempt.includes(req.path)) return next();
    return csrfProtection(req, res, next);
});
app.use(rateLimiter);

// Prometheus metrics endpoint
app.get('/api/v1/metrics', metricsHandler);

// External API health checks
app.use('/api/v1', externalHealthRouter);

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerJson));

app.get('/', (req, res) => {
    res.send('Server Running');
});

// Routes
RegisterRoutes(app);

app.use(errorHandler);

const server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});

gracefulShutdown(server);
