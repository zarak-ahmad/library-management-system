# WasenderApi interactive button messages

## Payload format (no polls)

```json
{
  "to": "923001234567",
  "type": "button",
  "text": "Hi Student Name, you have requested to borrow: Good Days. Please confirm your order.\n",
  "buttons": [
    { "id": "confirm_order", "text": "Confirm Order ✅" },
    { "id": "cancel_order", "text": "Cancel Order ❌" }
  ]
}
```

Implemented in `sendWasenderLibraryOrderButtons()` in `backend/src/services/whatsapp.service.ts`.

## Webhook

Enable `messages.received` or `messages.upsert` in Wasender dashboard.

Button taps are matched by id: `confirm_order` / `cancel_order`, or by button label text.

## Debug

Check backend console for:

- `[WasenderApi] Sending button message payload:`
- `[WasenderApi] Button message response:`
