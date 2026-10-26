import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { whatsappConfirmationService } from '../services/whatsappConfirmation.service';
import { getConfirmationConfirmUrl, getConfirmationCancelUrl } from '../utils/publicAppUrl';
import {
  parseInboundResponse,
  parseMetaWebhookResponse,
  parseWasenderWebhookResponse,
  parseWasenderPollWebhookResponse,
  parsePollVoteFromInboundMessage,
  parseSimpleYesNoResponse,
  extractPhoneFromTwilioWebhook,
  verifyWasenderWebhook,
} from '../services/whatsapp.service';
import { ApiResponseUtil } from '../utils/ApiResponse';

const handleParsedConfirmation = async (
  parsed:
    | { token: string; accepted: boolean }
    | { phone: string; accepted: boolean }
    | { jid: string; accepted: boolean }
): Promise<unknown> => {
  if ('token' in parsed) {
    return whatsappConfirmationService.handleResponse(parsed.token, parsed.accepted);
  }

  if ('jid' in parsed) {
    return whatsappConfirmationService.handleResponseByJid(parsed.jid, parsed.accepted);
  }

  if (parsed.phone) {
    return whatsappConfirmationService.handleResponseByPhone(parsed.phone, parsed.accepted);
  }

  return whatsappConfirmationService.handleResponseByKeywordOnly(parsed.accepted);
};

export const webhookController = {
  verifyMeta: (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      res.status(200).send(challenge);
      return;
    }

    res.sendStatus(403);
  },

  handleMeta: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.sendStatus(200);

      const parsed = parseMetaWebhookResponse(req.body);
      if (!parsed) return;

      await whatsappConfirmationService.handleResponse(parsed.token, parsed.accepted);
    } catch (error) {
      next(error);
    }
  },

  handleTwilio: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bodyText = String(req.body?.Body || '');
      const tokenParsed = parseInboundResponse(bodyText);

      if (tokenParsed) {
        await whatsappConfirmationService.handleResponse(tokenParsed.token, tokenParsed.accepted);
      } else {
        const simple = parseSimpleYesNoResponse(bodyText);
        if (simple !== null && req.body?.From) {
          const phone = extractPhoneFromTwilioWebhook(String(req.body.From));
          await whatsappConfirmationService.handleResponseByPhone(phone, simple);
        }
      }

      res.type('text/xml').send('<Response></Response>');
    } catch (error) {
      next(error);
    }
  },

  handleWasender: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.get('X-Webhook-Signature') || req.get('x-webhook-signature');
      const signatureOk = verifyWasenderWebhook(signature);

      console.log('[Wasender webhook] Received:', {
        event: (req.body as { event?: string })?.event,
        signatureOk,
      });

      if (env.isDev || env.isTest) {
        console.log('[Wasender webhook] Raw body:', JSON.stringify(req.body));
      }

      const webhookEvent = String((req.body as { event?: string })?.event || '').toLowerCase();
      if (webhookEvent.includes('poll')) {
        console.log('[Wasender webhook] Raw poll payload:', JSON.stringify(req.body));
      }

      if (!signatureOk) {
        console.warn('[Wasender webhook] Invalid signature');
        if (!env.isDev && !env.isTest) {
          res.status(401).json({ success: false, message: 'Invalid webhook signature' });
          return;
        }
        console.warn('[Wasender webhook] Dev mode: processing despite invalid signature');
      }

      res.status(200).json({ received: true });

      const pollParsed = parseWasenderPollWebhookResponse(req.body);
      if (pollParsed) {
        console.log('[Wasender webhook] Parsed poll.results vote:', pollParsed);
        const pollResult = await whatsappConfirmationService.handlePollVote({
          accepted: pollParsed.accepted,
          msgId: pollParsed.msgId,
          pollKeyId: pollParsed.pollKeyId,
          phone: pollParsed.phone,
        });
        console.log('[Wasender webhook] Poll handle result:', pollResult);
        if (!pollResult.handled) {
          console.warn(
            '[Wasender webhook] Poll vote not applied — will retry via Wasender API sync on next list refresh'
          );
        }
        return;
      }

      const inboundPoll = parsePollVoteFromInboundMessage(req.body);
      if (inboundPoll) {
        console.log('[Wasender webhook] Parsed inbound poll vote:', inboundPoll);
        const inboundResult = await whatsappConfirmationService.handlePollVote({
          accepted: inboundPoll.accepted,
          phone: 'phone' in inboundPoll ? inboundPoll.phone : undefined,
          jid: 'jid' in inboundPoll ? inboundPoll.jid : undefined,
          pollKeyId: inboundPoll.pollKeyId,
        });
        console.log('[Wasender webhook] Inbound poll handle result:', inboundResult);
        return;
      }

      const parsed = parseWasenderWebhookResponse(req.body);
      if (!parsed) {
        console.log('[Wasender webhook] No confirmation parsed. Body:', JSON.stringify(req.body));
        return;
      }

      console.log('[Wasender webhook] Parsed confirmation:', parsed);
      const result = await handleParsedConfirmation(parsed);
      console.log('[Wasender webhook] Handle result:', result);
    } catch (error) {
      next(error);
    }
  },

  devRespond: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!env.isDev && !env.isTest) {
        res.status(404).json({ success: false, message: 'Not found' });
        return;
      }

      const { token, response } = req.body as { token?: string; response?: string };
      if (!token || !response) {
        res.status(400).json({ success: false, message: 'token and response are required' });
        return;
      }

      const accepted = parseSimpleYesNoResponse(response);
      if (accepted === null) {
        res.status(400).json({
          success: false,
          message: 'response must be CONFIRM, CANCEL, yes, or no',
        });
        return;
      }

      const result = await whatsappConfirmationService.handleResponse(token, accepted);
      ApiResponseUtil.success(res, result, 'Webhook simulated');
    } catch (error) {
      next(error);
    }
  },

  confirmOrder: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.redirect(getConfirmationConfirmUrl(String(req.params.token)));
    } catch (error) {
      next(error);
    }
  },

  cancelOrder: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.redirect(getConfirmationCancelUrl(String(req.params.token)));
    } catch (error) {
      next(error);
    }
  },
};
