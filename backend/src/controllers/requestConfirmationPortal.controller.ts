import { Request, Response, NextFunction } from 'express';
import { WhatsAppConfirmation } from '../models/WhatsAppConfirmation.model';
import { Book } from '../models/Book.model';
import {
  renderRequestConfirmationPortal,
  RequestConfirmationPortalPreview,
} from '../views/requestConfirmationPortal';
import { renderRequestConfirmationResult } from '../views/requestConfirmationResult';
import {
  getConfirmationPageUrl,
  resolvePublicMediaUrl,
} from '../utils/publicAppUrl';
import { whatsappConfirmationService } from '../services/whatsappConfirmation.service';

const CONFIRM_ORDER_LINK_LABEL = 'Click here to confirm your order';
const CONFIRM_PICKUP_LINK_LABEL = 'Click here to confirm pickup';

const isValidToken = (token: string): boolean => /^[a-f0-9]{16}$/i.test(token);

export const requestConfirmationPortalController = {
  show: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = String(req.params.token || '').trim();
      if (!isValidToken(token)) {
        res.status(400).send('Invalid confirmation link.');
        return;
      }

      let preview: RequestConfirmationPortalPreview | undefined;
      const confirmation = await WhatsAppConfirmation.findOne({ token }).populate(
        'book',
        'title author coverImage'
      );

      if (confirmation) {
        const book = confirmation.book as unknown as InstanceType<typeof Book> | null;
        const bookTitle = book?.title || 'your book';
        const linkLabel =
          confirmation.type === 'book_issue' ? CONFIRM_PICKUP_LINK_LABEL : CONFIRM_ORDER_LINK_LABEL;

        preview = {
          previewTitle: linkLabel,
          previewDescription: `Confirm or cancel your request for "${bookTitle}".`,
          previewImage: resolvePublicMediaUrl(book?.coverImage?.url) || undefined,
          canonicalUrl: getConfirmationPageUrl(token),
        };
      }

      res.type('html').send(renderRequestConfirmationPortal(token, preview));
    } catch (error) {
      next(error);
    }
  },

  confirm: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = String(req.params.token || '').trim();
      if (!isValidToken(token)) {
        res.status(400).send('Invalid confirmation link.');
        return;
      }

      const page = await whatsappConfirmationService.processLinkAction(token, true);
      res.type('html').send(renderRequestConfirmationResult(page));
    } catch (error) {
      next(error);
    }
  },

  cancel: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = String(req.params.token || '').trim();
      if (!isValidToken(token)) {
        res.status(400).send('Invalid confirmation link.');
        return;
      }

      const page = await whatsappConfirmationService.processLinkAction(token, false);
      res.type('html').send(renderRequestConfirmationResult(page));
    } catch (error) {
      next(error);
    }
  },
};
