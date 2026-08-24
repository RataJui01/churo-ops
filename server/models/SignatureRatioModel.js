const mongoose = require('mongoose');

const signatureRatioSchema = new mongoose.Schema({
  size: {
    type: String,
    enum: ['S', 'M'],
    required: true,
  },
  flavor: {
    type: String,
    enum: ['plain', 'choco_pops', 'choco_berry'],
    required: true,
  },
  pieceCount: {
    type: Number,
    required: true,
  },
});

const SignatureRatio = mongoose.model('SignatureRatio', signatureRatioSchema);

module.exports = SignatureRatio;
