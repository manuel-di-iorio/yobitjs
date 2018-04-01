const util = require('util'),
  _ = require('underscore'),
  request = require('request'),
  crypto = require('crypto'),
  VError = require('verror'),
  md5 = require('MD5')

const Yobit = function Yobit(api_key = null, secret = null, verbose = false) {

  // Set the verbose level
  this.verbose = verbose

  this.api_key = api_key
  this.secret = secret
  this.server = 'https://yobit.net'
  this.publicApiPath = 'api/3'
  this.privateApiPath = 'tapi'
  this.timeout = 20000
  this.requestModule = request

  // Request retry settings
  this.temptsMax = 10
  this.temptsDelay = 500
  this.temptsDelayProgressive = true
  this.temptsDelayIncrement = 250

  // Generate the nonce when the API key is provided
  if (api_key) {
    const keySeed = parseInt(api_key.substring(0, 5), 16)
    const dateSeed = parseInt(Date.now() / 1000)
    this.nonce = keySeed + dateSeed
  }
}

// Import the API methods
require("./api")(Yobit)


const headers = { "User-Agent": "nodejs-7.5-api-client" }

Yobit.prototype.privateRequest = function (method, params, callback) {
  const functionName = 'Yobit.privateRequest()',
    self = this

  let error

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

  params.nonce = this.generateNonce()
  params.method = method

  headers.key = this.api_key
  headers.sign = this.signMessage(params)

  const options = {
    url: this.server + '/' + this.privateApiPath,
    method: 'POST',
    headers: headers,
    form: params,
    timeout: this.timeout,
  }

  const requestDesc = util.format('%s request to url %s with method %s and params %s',
    options.method, options.url, method, JSON.stringify(params))

  this.__executeRequest(options, requestDesc, callback)
}

/**
 * This method returns a signature for a request as a md5-encoded uppercase string
 * @param  {Object}  params   The object to encode
 * @return {String}           The request signature
 */
Yobit.prototype.signMessage = function getMessageSignature(params) {
  let data = []

  for (let param in params) {
    data.push(`${param}=${params[param]}`)
  }
  data = data.join('&')

  return crypto.createHmac('sha512', this.secret).update(data).digest('hex')
}

/**
 * This method returns a nonce for yobit's API, generated within the bounds (1 -> 2^31)
 * @return {String}           The unique request Nonce
 */
Yobit.prototype.generateNonce = function getNonce() {
  return ++this.nonce
}

/**
 * This method returns the parameters as key=value pairs separated by & sorted by the key
 * @param  {Object}  params   The object to encode
 * @return {String}           Formatted parameters
 */
function formatParameters(params) {
  let sortedKeys = [],
    formattedParams = ''

  // Sort the properties of the parameters
  sortedKeys = _.keys(params).sort()

  // Create a string of key value pairs separated by '&' with '=' assignement
  for (i = 0; i < sortedKeys.length; i++) {
    if (i !== 0) {
      formattedParams += '&'
    }
    formattedParams += sortedKeys[i] + '=' + params[sortedKeys[i]]
  }

  return formattedParams
}

Yobit.prototype.publicRequest = function (method, params, callback) {
  const functionName = 'Yobit.publicRequest()'
  let error

  if (!_.isObject(params)) {
    error = new VError('%s second parameter %s must be an object. If no params then pass an empty object {}', functionName, params)
    return callback(error)
  }

  if (!callback || typeof (callback) != 'function') {
    error = new VError('%s third parameter needs to be a callback function with err and data parameters', functionName)
    return callback(error)
  }

  const url = this.server + '/' + this.publicApiPath + '/' + method + ''
  if (this.verbose) console.log("Request URL is: " + url)

  const options = {
    url: url,
    method: 'GET',
    headers: headers,
    timeout: this.timeout,
    qs: params,
    json: {}        // Request will parse the json response into an object
  }

  const requestDesc = util.format('%s request to url %s with parameters %s',
    options.method, options.url, JSON.stringify(params))

  this.__executeRequest(options, requestDesc, callback)
}


// Execute the request, handling the errors
// @private
Yobit.prototype.__executeRequest = function (options, requestDesc, callback, _tempts = 0, _temptsDelay = this.temptsDelay) {
  const functionName = 'Yobit.__executeRequest()'
  const self = this

  this.requestModule(options, function (err, response, data) {
    let error = null,   // Default to no errors
      returnObject = data

    if (err) {
      error = new VError(err, '%s failed %s', functionName, requestDesc)
      error.name = err.code
    }

    // Retry the request if there is a server error
    else if (response.statusCode >= 500 && response.statusCode < 600
      && _tempts < self.temptsMax) {

      if (self.verbose) {
        console.log("%s Retrying the request %s (tempt %d of %d)", functionName,
          requestDesc, _tempts, self.temptsMax)
      }

      // Increase the retry delay when the progressive option is set
      if (self.temptsDelayProgressive) {
        _temptsDelay += self.temptsDelayIncrement
      }

      return setTimeout(self.__executeRequest.bind(self), _temptsDelay, options, requestDesc,
        callback, ++_tempts, _temptsDelay)
    }

    // Error with another status code
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
      error = new VError('%s could not parse response from %s\nResponse: %s', functionName,
        requestDesc, data)
    }

    if (_.has(returnObject, 'error_code')) {
      const errorMessage = mapErrorMessage(returnObject.error_code)

      error = new VError('%s %s returned error code %s, message: "%s"', functionName,
        requestDesc, returnObject.error_code, errorMessage)

      error.name = returnObject.error_code
    }

    // Response with specific error {success: 0, error: "error"}
    else if (_.has(returnObject, 'error')) {
      error = new VError('%s %s returned error: "%s"', functionName,
        requestDesc, returnObject.error)

      error.name = 400
      error.message = returnObject.error
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
  const errorCodes = {
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
