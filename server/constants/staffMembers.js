// Must match each account's `name` exactly: createOrder and createRestock take
// staffMember from req.user.name. Shared by Order and RestockLog, so a third
// person means one change here (plus their account).
module.exports = ['Jui', 'Impact'];
