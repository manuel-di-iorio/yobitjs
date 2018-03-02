Node.js API for the Yobit Crypto Currency Exchange
===============

Note: This repository is a fork of https://github.com/kwiksand/yobit which was unmaintained and untested.

**Example:**
```js
const Yobit = require("yobitjs")

// Note: api key and secret are optional: they allow to use private methods
const client = new Yobit("yourApiKey", "yourApiSecret")

(async () => {
  try {
    const response = await client.getPrivateInfo()
    //{ rights: { info: 1, trade: 1, deposit: 1, withdraw: 1 },
    //  transaction_count: 4,
    //  open_orders: 1,
    //  server_time: 1519153843 } }

    const response = await client.getTrades({pair: "btc_usd"})
    //{ btc_usd:
    //   [ { type: 'bid',
    //       price: 4792.55,
    //       amount: 0.00083461,
    //       tid: 133972806,
    //       timestamp: 1504791536 },
    //     { type: 'bid',
    //       price: 4792.49,
    //       amount: 0.00208659,
    //       tid: 133972796,
    //       timestamp: 1504791524 } ] }

    // get BTCUSD and ETHUSD ticker
    const response = await client.getTicker({pair: "btc_usd-eth_usd"});
    //{ btc_usd:
    //   { high: 4800.31688093,
    //     low: 4631.69467983,
    //     avg: 4716.00578038,
    //     vol: 219359.18861277,
    //     vol_cur: 46.56299584,
    //     last: 4779,
    //     buy: 4751,
    //     sell: 4779,
    //     updated: 1504788221 },
    //  eth_usd:
    //   { high: 355,
    //     low: 335.24600049,
    //     avg: 345.12300024,
    //     vol: 106157.35039798,
    //     vol_cur: 309.93220681,
    //     last: 342.21476841,
    //     buy: 341.3,
    //     sell: 342.21476841,
    //     updated: 1504788306 } }

  } catch (err) {
    console.log(err)
  }
})()
```

# API reference

**Class object**

```js
new Yobit(apiKey=null, apiSecret=null, debug=false)
// enable debug param to log verbose info
```


**Public methods**
- getInfo()
- getTicker( options )
- getDepth( options )
- getTrades( options )

**Private methods**
- getPrivateInfo()
- addTrade( options )
- cancelOrder( options )
- getActiveOrders( options )
- getOrderInfo( options )
- getTradeHistory( options )
- getDepositAddress( options )
- withdrawCoinsToAddress( options )

---
## Error reference

The request error object is a [VError](https://github.com/joyent/node-verror) instance:

```js
} catch (err) {
    console.log(err || err.message) // Error message
    console.log(err.name) // Error code
}
```

### For options and full reference, please see https://yobit.net/en/api

# V1.0 Changelog

- Added automatic request retry when a server error occurs (up to 10 by default).
- **[BC]** `verbose` option is now a parameter of the Yobit class and will not be retrieved anymore through process.env.DEBUG.
- **[BC]** `server` and `timeout` have been removed from the class params. They are available into the client object
- **[BC]** When Yobit returns `{success: false, error: "message"}` now the error code is set as 400 to `err.name`
- [FIX] Missing timeout for private requests

# Tests

```bash
$ yarn test
```

# License

MIT