// PromptPay QR for an order's payment page (Jui, 2026-11-08 / 11-09).
//
// A PromptPay QR is only text in the Thai QR Payment (EMVCo) format — who to
// pay, the currency, the amount and a checksum — drawn as a QR image. Making
// one never talks to a bank, so the app can't know whether a customer paid:
// staff confirm each payment by hand against their bank notification.
//
// promptparse builds the text (not promptpay-qr, which the design docs name:
// unmaintained since 2022 and pulls in qrcode 0.9, which depends on any version
// of `colors` — a package its own author sabotaged in 2022). qrcode draws it.
//
// PROMPTPAY_ID isn't a secret — anyone who decodes the QR can read it — but
// the repo is public, so the number lives in the environment, not in git.
const { anyId } = require('promptparse/generate');
const QRCode = require('qrcode');

// PROMPTPAY_ID: a mobile number (10 digits) or a national ID / tax ID
// (13 digits). Dashes and spaces are fine; anything else is a setup mistake.
function promptPayTarget() {
  const digits = (process.env.PROMPTPAY_ID ?? '').replace(/\D/g, '');
  if (digits.length === 10) return { type: 'MSISDN', target: digits };
  if (digits.length === 13) return { type: 'NATID', target: digits };
  return null;
}

// { qr, accountName, amount } for an amount in baht, or null when PromptPay
// isn't set up. Deliberately not a crash at start-up (unlike CLIENT_ORIGIN):
// a variable forgotten on Railway would otherwise take the whole dashboard
// down, when only the payment page needs it. The page shows "ask the staff"
// instead of a QR.
async function paymentQr(amount) {
  const target = promptPayTarget();
  if (!target) {
    console.error(
      'PROMPTPAY_ID is missing or not 10 / 13 digits — no payment QR',
    );
    return null;
  }

  const payload = anyId({ ...target, amount });
  return {
    // A PNG data URL, shown in an <img> so a long press can save it —
    // customers can't scan their own screen. 480 px wide stays sharp at the
    // design's 240 px on a 2x screen.
    qr: await QRCode.toDataURL(payload, { width: 480, margin: 2 }),
    // Shown under the QR so customers can check it against the name their
    // bank app shows (null = not set; the page leaves the line out)
    accountName: process.env.PROMPTPAY_NAME?.trim() || null,
    amount,
  };
}

module.exports = { paymentQr, promptPayTarget };
