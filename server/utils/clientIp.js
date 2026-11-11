const { ipKeyGenerator } = require('express-rate-limit');

// Who a request comes from, for the rate limiters (login, placing storefront
// orders). One place for it, so both limiters always count visitors the same
// way.
//
// Railway's edge puts the visitor's address in X-Real-IP (clients can't set
// it), while the number of proxies in front of the app varies — so req.ip with
// trust proxy 1 could be a Railway proxy, and everyone would share one limit.
// Production only: in development nothing sets the header, so anyone could.
const clientIp = (req) =>
  (process.env.NODE_ENV === 'production' && req.get('x-real-ip')) || req.ip;

// The key a limiter counts by. ipKeyGenerator counts an IPv6 address by its
// /56 block, so hopping between addresses of one connection can't reset the
// count.
const ipKey = (req) => ipKeyGenerator(clientIp(req));

module.exports = { clientIp, ipKey };
