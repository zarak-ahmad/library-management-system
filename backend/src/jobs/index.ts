import cron from 'node-cron';
import { env } from '../config/env';
import { borrowService } from '../services/borrow.service';
import { reservationService } from '../services/reservation.service';
import { syncOverdueFines } from '../services/fine.service';
import { reconcileActiveBookRequests } from '../services/bookRequestLifecycle.service';
import { whatsappConfirmationService } from '../services/whatsappConfirmation.service';
import { getSystemSettings } from '../models/SystemSettings.model';

export const startBackgroundJobs = (): void => {
  if (env.isTest) {
    return;
  }

  syncOverdueFines()
    .then((count) => {
      if (count > 0) console.log(`Synced ${count} overdue fine(s) on startup`);
    })
    .catch((error) => console.error('Initial overdue fine sync failed:', error));

  cron.schedule('0 * * * *', async () => {
    try {
      const synced = await syncOverdueFines();
      if (synced > 0) console.log(`Synced ${synced} overdue fine(s)`);
    } catch (error) {
      console.error('Overdue fine sync job failed:', error);
    }
  });

  cron.schedule('0 8 * * *', async () => {
    try {
      const sent = await borrowService.sendDueDateReminders();
      if (sent > 0) console.log(`Sent ${sent} due date reminders`);
    } catch (error) {
      console.error('Due date reminder job failed:', error);
    }
  });

  cron.schedule('0 9 * * *', async () => {
    try {
      const sent = await borrowService.sendOverdueNotices();
      if (sent > 0) console.log(`Sent ${sent} overdue notices`);
    } catch (error) {
      console.error('Overdue notice job failed:', error);
    }
  });

  cron.schedule('0 * * * *', async () => {
    try {
      const expired = await reservationService.expireReservations();
      if (expired > 0) console.log(`Expired ${expired} reservations`);
    } catch (error) {
      console.error('Reservation expiry job failed:', error);
    }
  });

  cron.schedule('*/2 * * * *', async () => {
    try {
      if (!env.WASENDER_API_KEY) return;
      const synced = await whatsappConfirmationService.syncPendingPollVotesFromWasender();
      if (synced > 0) {
        console.log(`Synced ${synced} WhatsApp poll vote(s) from Wasender API`);
        await reconcileActiveBookRequests();
      }
    } catch (error) {
      console.error('WhatsApp poll sync job failed:', error);
    }
  });

  cron.schedule('*/5 * * * *', async () => {
    try {
      const reconciled = await reconcileActiveBookRequests();
      if (reconciled > 0) console.log(`Reconciled ${reconciled} stuck book request(s)`);
    } catch (error) {
      console.error('Book request reconcile job failed:', error);
    }
  });

  reconcileActiveBookRequests()
    .then((count) => {
      if (count > 0) console.log(`Reconciled ${count} stuck book request(s) on startup`);
    })
    .catch((error) => console.error('Initial book request reconcile failed:', error));

  getSystemSettings().then(() => console.log('Background jobs started'));
};
