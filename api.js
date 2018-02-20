const promisify = require("util").promisify

module.exports = Yobit => {

  //
  // Public Functions
  //

  // @param {Function} callback
  Yobit.prototype.getInfo = promisify(function getInfo(callback) {
    this.publicRequest('info', {}, callback)
  })

  // @param {Object} params
  // @param {Function} callback
  Yobit.prototype.getTicker = promisify(function getTicker({ pair }, callback) {
    if (!pair) throw new Error("pair is not defined");
    this.publicRequest('ticker/' + pair, {}, callback)
  })

  // @param {Object} params
  // @param {Function} callback
  Yobit.prototype.getDepth = promisify(function getDepth({ pair, limit = 150 }, callback) {
    if (!pair) throw new Error("pair is not defined");

    if (!callback) {
      callback = arguments[0]
      limit = null
    }

    this.publicRequest('depth/' + pair, { limit }, callback)
  })

  // @param {Object} params
  // @param {Function} callback
  Yobit.prototype.getTrades = promisify(function getTrades({ pair, limit = 150 }, callback) {
    if (!pair) throw new Error("pair is not defined");

    if (!callback) {
      callback = arguments[0]
      limit = null
    }

    this.publicRequest('trades/' + pair, { limit }, callback)
  })


  //
  // Private Functions
  //

  // @param {Function} callback
  Yobit.prototype.getPrivateInfo = promisify(function getPrivateInfo(callback) {
    this.privateRequest('getInfo', {}, callback)
  })

  // @param {Object} params
  // @param {Function} callback
  Yobit.prototype.addTrade = promisify(function addTrade({ pair, type, rate, amount }, callback) {
    if (!pair) throw new Error("pair is not defined")
    if (!type) throw new Error("type is not defined")
    if (!rate) throw new Error("rate is not defined")
    if (!amount) throw new Error("amount is not defined")
    this.privateRequest('Trade', arguments[0], callback)
  })

  // @param {Object} params
  // @param {Function} callback
  Yobit.prototype.cancelOrder = promisify(function cancelOrder({ order_id }, callback) {
    if (!order_id) throw new Error("order_id is not defined")
    this.privateRequest('CancelOrder', arguments[0], callback)
  })

  // @param {Object} params
  // @param {Function} callback
  Yobit.prototype.getActiveOrders = promisify(function getActiveOrders({ pair }, callback) {
    if (!pair) throw new Error("pair is not defined");
    this.privateRequest('ActiveOrders', arguments[0], callback)
  })

  // @param {Object} params
  // @param {Function} callback
  Yobit.prototype.getOrderInfo = promisify(function getOrderInfo({ order_id }, callback) {
    if (!order_id) throw new Error("order_id is not defined")
    this.privateRequest('OrderInfo', arguments[0], callback)
  })

  // @param {Object} params
  // @param {Function} callback
  Yobit.prototype.getTradeHistory = promisify(function getTradeHistory({ pair, from = 0, count = 1000, from_id = 0, end_id = 0, order = "DESC", since = 0, end = Date.now() }, callback) {
    if (!pair) throw new Error("pair is not defined");
    this.privateRequest('TradeHistory', arguments[0], callback)
  })

  // @param {Object} params
  // @param {Function} callback
  Yobit.prototype.getDepositAddress = promisify(function getDepositAddress({ coinName, needNew = 0 }, callback) {
    if (!coinName) throw new Error("coinName is not defined");
    this.privateRequest('GetDepositAddress', arguments[0], callback)
  })

  // @param {Object} params
  // @param {Function} callback
  Yobit.prototype.withdrawCoinsToAddress = promisify(function withdrawCoinsToAddress({ coinName, amount, address }, callback) {
    if (!coinName) throw new Error("coinName is not defined");
    if (!amount) throw new Error("amount is not defined");
    if (!address) throw new Error("address is not defined");
    this.privateRequest('WithdrawCoinsToAddress', arguments[0], callback)
  })
};
