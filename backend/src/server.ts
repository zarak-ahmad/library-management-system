import app from './app';
import { connectDatabase } from './config/database';
import { verifyEmailConnection } from './config/email';
import { env } from './config/env';
import { startBackgroundJobs } from './jobs';
import {
  getWhatsAppProviderLabel,
  getConfirmationProviderLabel,
  getWasenderConfirmationLimitation,
} from './services/whatsapp.service';
import {
  getConfirmationPageUrl,
  isLocalhostUrl,
} from './utils/publicAppUrl';

const startServer = async () => {
  await connectDatabase();
  await verifyEmailConnection();
  const whatsappProvider = getWhatsAppProviderLabel();
  const confirmationProvider = getConfirmationProviderLabel();
  if (whatsappProvider === 'console' && confirmationProvider === 'console') {
    console.warn('WhatsApp not configured — messages will be logged to console (set WASENDER_API_KEY in backend/.env)');
  } else {
    console.log(`WhatsApp provider: ${whatsappProvider} | Confirmations: ${confirmationProvider}`);
    const wasenderLimit = getWasenderConfirmationLimitation();
    if (wasenderLimit) {
      console.warn(`[WhatsApp] ${wasenderLimit}`);
    }
    if (env.WEBHOOK_BASE_URL && confirmationProvider === 'wasender') {
      const base = env.WEBHOOK_BASE_URL.replace(/\/$/, '');
      console.log(`[WhatsApp] Confirmation links base URL: ${base}/request-confirmation/<token>`);
      console.log(
        `[WhatsApp] Wasender webhook (optional for poll fallback): ${base}/api/v1/webhooks/whatsapp/wasender`
      );
    }
    if (isLocalhostUrl(env.CLIENT_URL) && env.WEBHOOK_BASE_URL) {
      console.log(
        `[WhatsApp] Book requests use WhatsApp confirmation links via ngrok: ${env.WEBHOOK_BASE_URL.replace(/\/$/, '')}/request-confirmation/<token>/confirm|cancel`
      );
    } else if (isLocalhostUrl(env.CLIENT_URL)) {
      console.warn(
        '[WhatsApp] CLIENT_URL is localhost and WEBHOOK_BASE_URL is not set — confirmation links will NOT work on phones.'
      );
    } else {
      console.log(`[WhatsApp] Confirmation page base URL: ${getConfirmationPageUrl('<token>').replace('/<token>', '')}/<token>`);
    }
  }
  startBackgroundJobs();

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
