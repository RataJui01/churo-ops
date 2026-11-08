// PromptPay QR for an order's payment page (Jui, 2026-11-08 / 11-09).
//
// A PromptPay QR is only text in the Thai QR Payment (EMVCo) format — who to
// pay, the currency, the amount and a checksum (CRC) — drawn as a QR image.
// Making one never talks to a bank, so the app can't know whether a customer
// paid: staff confirm each payment by hand against their notification.
//
// Two ways to say who gets paid, checked in this order:
// 1. PROMPTPAY_MERCHANT_QR — the shop's own K SHOP QR (what Churo Bites uses,
//    Jui 2026-11-09). That printed QR has no amount, so the customer would
//    type one. Each order gets a copy with its amount filled in: tag 01 set to
//    12 (single use, with an amount), tag 54 = the amount, a new CRC.
//    Everything else — the K SHOP biller, the shop's reference, the card tags,
//    the shop name — stays exactly as K SHOP made it, so the money and the
//    K SHOP notification arrive as for the printed QR (checked with a real
//    ฿1 payment, 2026-11-09). Every order carries the same shop reference, so
//    staff still match payments by amount + name + time.
// 2. PROMPTPAY_ID — a plain PromptPay mobile number or national ID.
//
// promptparse builds / edits the text (not promptpay-qr, which the design
// docs name: unmaintained since 2022 and pulls in qrcode 0.9, which depends on
// any version of `colors` — a package its own author sabotaged in 2022).
// qrcode draws it.
//
// Neither value is secret — anyone who decodes the QR can read it, and the
// K SHOP one is printed at the stall — but the repo is public and the values
// belong to the shop, so they live in the environment, not in git.
const { parse, encode, tag, withCrcTag } = require('promptparse');
const { anyId } = require('promptparse/generate');
const QRCode = require('qrcode');

// The shop's static merchant QR, checked: it must decode with a valid CRC
// and contain PromptPay bill payment (tag 30), or it isn't the QR we think
function merchantQr() {
  const payload = process.env.PROMPTPAY_MERCHANT_QR?.trim();
  if (!payload) return undefined;
  const qr = parse(payload, true);
  return qr && qr.getTag('30') ? qr : null;
}

// PROMPTPAY_ID: a mobile number (10 digits) or a national ID / tax ID
// (13 digits). Dashes and spaces are fine; anything else is a setup mistake.
function promptPayTarget() {
  const digits = (process.env.PROMPTPAY_ID ?? '').replace(/\D/g, '');
  if (digits.length === 10) return { type: 'MSISDN', target: digits };
  if (digits.length === 13) return { type: 'NATID', target: digits };
  return null;
}

// The merchant QR with this amount filled in. Tags stay in ID order, and
// withCrcTag appends a fresh CRC (tag 63) — the old one would no longer match.
function withAmount(qr, amount) {
  const tags = qr
    .getTags()
    .filter((t) => !['01', '54', '63'].includes(t.id))
    .concat([tag('01', '12'), tag('54', amount.toFixed(2))])
    .sort((a, b) => a.id.localeCompare(b.id));
  return withCrcTag(encode(tags), '63');
}

// The text to encode, or null (with the reason logged) when PromptPay isn't
// set up. A merchant QR that's set but broken is an error too — never a quiet
// switch to PROMPTPAY_ID, which could be a different account.
function paymentPayload(amount) {
  const merchant = merchantQr();
  if (merchant) return withAmount(merchant, amount);
  if (merchant === null) {
    console.error(
      'PROMPTPAY_MERCHANT_QR is not a valid PromptPay QR (bad CRC or no tag 30) — no payment QR',
    );
    return null;
  }

  const target = promptPayTarget();
  if (target) return anyId({ ...target, amount });
  console.error(
    'Neither PROMPTPAY_MERCHANT_QR nor a 10 / 13-digit PROMPTPAY_ID is set — no payment QR',
  );
  return null;
}

// { qr, accountName, amount } for an amount in baht, or null when PromptPay
// isn't set up. Deliberately not a crash at start-up (unlike CLIENT_ORIGIN):
// a variable forgotten on Railway would otherwise take the whole dashboard
// down, when only the payment page needs it. The page shows "ask the staff"
// instead of a QR.
async function paymentQr(amount) {
  const payload = paymentPayload(amount);
  if (!payload) return null;
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

module.exports = { paymentQr, paymentPayload, promptPayTarget };
