const mongoose = require('mongoose');

// There's only ever one document, so its _id is a fixed name rather than an
// ObjectId — no "find the first one" guessing.
const STORE_ID = 'storefront';

// Whether customers can order right now. Staff flip it on the Store / Menu
// page (DESIGN §4.7); the server checks it before accepting an order, so a
// menu left open on a phone can't order after closing (REQUIREMENTS §5).
const storeSettingSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: STORE_ID,
    },
    isOpen: {
      type: Boolean,
      default: false,
    },
    // Shown as "Opened by {name} {time}" — one of the existing accounts
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
);

// No document yet counts as closed: the safe default. Until staff open the
// store (or the seed creates it closed), customers only see the closed screen
// — which is also what keeps unfinished storefront work hidden in production.
storeSettingSchema.statics.getStore = async function () {
  return (await this.findById(STORE_ID)) ?? { _id: STORE_ID, isOpen: false };
};

storeSettingSchema.statics.STORE_ID = STORE_ID;

const StoreSetting = mongoose.model('StoreSetting', storeSettingSchema);
module.exports = StoreSetting;
