import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestConfirmationPortalController } from './controllers/requestConfirmationPortal.controller';
import { getPublicConfirmationBaseUrl } from './utils/publicAppUrl';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      connectSrc: ["'self'"],
    },
  },
}));
const corsOrigins = new Set<string>([
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
if (env.WEBHOOK_BASE_URL) {
  corsOrigins.add(env.WEBHOOK_BASE_URL.replace(/\/$/, ''));
}
app.use(cors({
  origin: env.isDev ? Array.from(corsOrigins) : env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const skipRateLimit = () => env.isDev || env.isTest;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProd ? 300 : 1000,
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProd ? 20 : 100,
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

app.use('/api', limiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(express.static(path.join(process.cwd(), 'public')));

app.get('/request-confirmation/:token', requestConfirmationPortalController.show);
app.get('/request-confirmation/:token/confirm', requestConfirmationPortalController.confirm);
app.get('/request-confirmation/:token/cancel', requestConfirmationPortalController.cancel);

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
