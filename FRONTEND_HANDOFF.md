# Frontend handoff

## LLC checkout (not implemented)

- `src/components/CheckoutButton.tsx` owns every purchase button and the `data-integration="llc-checkout"` hook. `ENABLE_LLC_CHECKOUT` is `false` in `src/data/brand.ts`; all purchase buttons are truly disabled. Do not enable it without a real `onCheckout` handler and server-side payment flow.
- `src/components/StatePriceSelector.tsx` prepares `{ state, stateFee, serviceFee, total }` after a selection. These values are display-only. The backend must independently look up the latest state fee, validate the selection, recalculate the total and only then create a Stripe Checkout session. Do not trust client totals or accept a payment using these initial fees without verification.
- The company-name availability statement and additional-fees disclaimer must stay visible in the checkout flow.

## Consultation

- `src/components/ConsultationCalendarModal.tsx` loads the authorized GoHighLevel booking iframe only when the dialog opens. The URL is centralized in `src/data/brand.ts` and can be overridden with `NEXT_PUBLIC_GHL_CALENDAR_URL`. The vendor script is loaded once with `next/script`.
- Consultation booking and payment happen inside GoHighLevel. There is no local payment API for this route.

## Later phases (not implemented)

- No Stripe endpoint, GHL contacts/opportunities/tags/webhooks, post-payment dossier form, authentication or OTP, file uploads, signatures or generated PDFs exist in this frontend.
- `src/data/stateFees.ts` should eventually be replaced with fees delivered by the backend. `CAMIKK_SERVICE_FEE` is currently USD 725.
- `src/locales/es.ts` and `en.ts` contain UI copy. `src/app/page.tsx` provides localized server metadata and JSON-LD. Configure `NEXT_PUBLIC_SITE_URL` only after the final landing domain is known.
