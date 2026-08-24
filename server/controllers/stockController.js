const Stock = require('../models/StockModel');

exports.getAllStocks = async (req, res) => {
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
