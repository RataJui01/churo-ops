const RestockLog = require('../models/RestockLogModel');

exports.getAllRestockLog = async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
    });
  }
};
