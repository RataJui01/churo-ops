const mongoose = require('mongoose');

// A named number that only goes up. Used for the daily queue number: one
// document per day, e.g. { _id: 'queue-2026-11-08', seq: 12 }.
const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

// "YYYY-MM-DD" in Thai time. The server runs in UTC on Railway, so without the
// time zone the number would start again at 7 am in Bangkok, not midnight.
// en-CA is just a locale whose date format happens to be YYYY-MM-DD.
const thaiDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
});

// The next queue number for today. One atomic $inc (like stock counts) rather
// than "read the last number, add 1": if both phones confirm a payment at the
// same moment, they still get different numbers. upsert creates the day's
// counter on its first use, so numbering starts again at 1 every day with no
// scheduled job.
counterSchema.statics.nextQueueNumber = async function (now = new Date()) {
  const counter = await this.findOneAndUpdate(
    { _id: `queue-${thaiDate.format(now)}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return counter.seq;
};

const Counter = mongoose.model('Counter', counterSchema);
module.exports = Counter;
