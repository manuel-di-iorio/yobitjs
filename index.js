var verbose = process.env.DEBUG

var util = require('util'),
  _ = require('underscore'),
  request = require('request'),
  crypto = require('crypto'),
  VError = require('verror'),
  md5 = require('MD5')

var Yobit = function Yobit(api_key, secret, server, timeout) {
  this.api_key = api_key
  this.secret = secret

  this.server = server || 'https://yobit.net'
  this.publicApiPath = 'api/3'
  this.privateApiPath = 'tapi'

  this.timeout = timeout || 20000

  if (api_key) {
    var keySeed = parseInt(api_key.substring(0, 5), 16)
    var dateSeed = parseInt(Date.now() / 1000)
    this.nonce = keySeed + dateSeed
  }
}

require("./api")(Yobit)

var headers = { "User-Agent": "nodejs-7.5-api-client" }

Yobit.prototype.privateRequest = function (method, params, callback) {
  var functionName = 'Yobit.privateRequest()',
    self = this

  var error

  if (!this.api_key || !this.secret) {
    error = new VError('%s must provide api_key and secret to make this API request.', functionName)
    return callback(error)
  }

  if (!_.isObject(params)) {
    error = new VError('%s second parameter %s must be an object. If no params then pass an empty object {}', functionName, params)
    return callback(error)
  }

  if (!callback || typeof (callback) != 'function') {
    error = new VError('%s third parameter needs to be a callback function', functionName)
    return callback(error)
  }

  params.method = method
  params.nonce = this.generateNonce()

  headers.key = this.api_key
  headers.sign = this.signMessage(params)

  var options = {
    url: this.server + '/' + this.privateApiPath,
    method: 'POST',
    headers: headers,
    form: params
  }

  var requestDesc = util.format('%s request to url %s with method %s and params %s',
    options.method, options.url, method, JSON.stringify(params))

  executeRequest(options, requestDesc, callback)
}

/**
 * This method returns a signature for a request as a md5-encoded uppercase string
 * @param  {Object}  params   The object to encode
 * @return {String}           The request signature
 */
Yobit.prototype.signMessage = function getMessageSignature(params) {
  var data = []

  for (let param in params) {
    data.push(`${param}=${params[param]}`)
  }
  var data = data.join('&')

  hash = crypto.createHmac('sha512', this.secret)
  hash.update(data)

  return (hash.digest('hex'))
}

/**
 * This method returns a nonce for yobit's API, generated within the bounds (1 -> 2^31)
 * For "uniqueness" we add a shortened timestamp to a see driven by the API key
 * @return {String}           The unique request Nonce
 */
Yobit.prototype.generateNonce = function getNonce() {
  return ++this.nonce
}

/**
 * This method returns the parameters as key=value pairs separated by & sorted by the key
 * @param  {Object}  params   The object to encode
 * @return {String}           formatted parameters
 */
function formatParameters(params) {
  var sortedKeys = [],
    formattedParams = ''

  // sort the properties of the parameters
  sortedKeys = _.keys(params).sort()

  // create a string of key value pairs separated by '&' with '=' assignement
  for (i = 0; i < sortedKeys.length; i++) {
    if (i !== 0) {
      formattedParams += '&'
    }
    formattedParams += sortedKeys[i] + '=' + params[sortedKeys[i]]
  }

  return formattedParams
}

Yobit.prototype.publicRequest = function (method, params, callback) {
  var functionName = 'Yobit.publicRequest()'
  var error

  if (!_.isObject(params)) {
    error = new VError('%s second parameter %s must be an object. If no params then pass an empty object {}', functionName, params)
    return callback(error)
  }

  if (!callback || typeof (callback) != 'function') {
    error = new VError('%s third parameter needs to be a callback function with err and data parameters', functionName)
    return callback(error)
  }

  var url = this.server + '/' + this.publicApiPath + '/' + method + ''
  if (verbose) console.log("Request URL is: " + url)

  var options = {
    url: url,
    method: 'GET',
    headers: headers,
    timeout: this.timeout,
    qs: params,
    json: {}        // request will parse the json response into an object
  }

  var requestDesc = util.format('%s request to url %s with parameters %s',
    options.method, options.url, JSON.stringify(params))

  executeRequest(options, requestDesc, callback)
}

function executeRequest(options, requestDesc, callback) {
  var functionName = 'Yobit.executeRequest()'

  request(options, function (err, response, data) {
    var error = null,   // default to no errors
      returnObject = data

    if (err) {
      error = new VError(err, '%s failed %s', functionName, requestDesc)
      error.name = err.code
    }
    else if (response.statusCode < 200 || response.statusCode >= 300) {
      error = new VError('%s HTTP status code %s returned from %s', functionName,
        response.statusCode, requestDesc)
      error.name = response.statusCode
    }
    else if (options.form) {
      try {
        returnObject = JSON.parse(data)
      }
      catch (e) {
        error = new VError(e, 'Could not parse response from server: ' + data)
      }
    }
    // if json request was not able to parse json response into an object
    else if (options.json && !_.isObject(data)) {
      error = new VError('%s could not parse response from %s\nResponse: %s', functionName, requestDesc, data)
    }

    if (_.has(returnObject, 'error_code')) {
      var errorMessage = mapErrorMessage(returnObject.error_code)

      error = new VError('%s %s returned error code %s, message: "%s"', functionName,
        requestDesc, returnObject.error_code, errorMessage)

      error.name = returnObject.error_code
    }

    // Response with specific error {success: 0, error: "error"}
    else if (_.has(returnObject, 'error')) {
      error = new VError('%s %s returned error: "%s"', functionName,
        requestDesc, returnObject.error)

      error.name = returnObject.error
    }

    callback(error, returnObject)
  })
}



/**
 * Maps the Yobit error codes to error message
 * @param  {Integer}  error_code   Yobit error code
 * @return {String}                error message
 */
function mapErrorMessage(error_code) {
  var errorCodes = {
    10000: 'Required parameter can not be null',
    10001: 'Requests are too frequent',
    10002: 'System Error',
    10003: 'Restricted list request, please try again later',
    10004: 'IP restriction',
    10005: 'Key does not exist',
    10006: 'User does not exist',
    10007: 'Signatures do not match',
    10008: 'Illegal parameter',
    10009: 'Order does not exist',
    10010: 'Insufficient balance',
    10011: 'Order is less than minimum trade amount',
    10012: 'Unsupported symbol (not btc_usd or ltc_usd)',
    10013: 'This interface only accepts https requests',
    10014: 'Order price must be between 0 and 1,000,000',
    10015: 'Order price differs from current market price too much',
    10016: 'Insufficient coins balance',
    10017: 'API authorization error',
    10026: 'Loan (including reserved loan) and margin cannot be withdrawn',
    10027: 'Cannot withdraw within 24 hrs of authentication information modification',
    10028: 'Withdrawal amount exceeds daily limit',
    10029: 'Account has unpaid loan, please cancel/pay off the loan before withdraw',
    10031: 'Deposits can only be withdrawn after 6 confirmations',
    10032: 'Please enabled phone/google authenticator',
    10033: 'Fee higher than maximum network transaction fee',
    10034: 'Fee lower than minimum network transaction fee',
    10035: 'Insufficient BTC/LTC',
    10036: 'Withdrawal amount too low',
    10037: 'Trade password not set',
    10040: 'Withdrawal cancellation fails',
    10041: 'Withdrawal address not approved',
    10042: 'Admin password error',
    10100: 'User account frozen',
    10216: 'Non-available API',
    503: 'Too many requests (Http)'
  }

  if (!errorCodes[error_code]) {
    return 'Unknown Yobit error code: ' + error_code
  }

  return (errorCodes[error_code])
}

module.exports = Yobit
