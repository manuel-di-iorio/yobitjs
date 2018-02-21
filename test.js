const assert = require("assert")
const Yobit = require('.')
const http = require('http')
process.env.DEBUG = true

// Mock server
const mockServer = http.createServer(function (req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end('{"success":true}')
})

// assert.throws() for async functions
async function assertThrowsAsync(fn) {
  let f = () => { }
  try {
    await fn()
  } catch (e) {
    f = () => { throw e }
  } finally {
    assert.throws(f)
  }
}

// Tests
before(function (done) {
  mockServer.listen(9090, done)
})

after(function (done) {
  mockServer.close(done)
})

describe("new Yobit() - arguments test", function () {
  it("arguments should all be optional", function () {
    assert.doesNotThrow(() => new Yobit())
    assert.doesNotThrow(() => new Yobit("1"))
    assert.doesNotThrow(() => new Yobit("1", "1"))
    assert.doesNotThrow(() => new Yobit("1", "1", "1"))
  })

  it("when apikey is provided, the nonce should be generated", function () {
    const client = new Yobit("1")
    assert.equal(!!client.nonce, true)
  })
})

describe("API calls", function () {
  let client

  beforeEach(function () {
    client = new Yobit("mockApiKey", "mockApiServer", "http://localhost:9090")
  })

  it("should throw when not passing mandatory options", async function () {
    await assertThrowsAsync(client.getTicker)
    await assertThrowsAsync(client.getDepth)
    await assertThrowsAsync(client.getTrades)
    await assertThrowsAsync(client.getActiveOrders)
    await assertThrowsAsync(client.getTradeHistory)
    await assertThrowsAsync(client.getDepositAddress)
    await assertThrowsAsync(client.withdrawCoinsToAddress)
    await assertThrowsAsync(client.addTrade)
    await assertThrowsAsync(client.cancelOrder)
    await assertThrowsAsync(client.getOrderInfo)
  })

  it("should make generic calls", async function () {
    assert.equal(!!(await client.getInfo()).success, true)

    assert.equal(!!(await client.getTicker({ pair: "btc_usd-eth_usd" })).success, true)

    assert.equal(!!(await client.getDepth({ pair: "btc_usd-eth_usd" })).success, true)

    assert.equal(!!(await client.getTrades({ pair: "btc_usd-eth_usd" })).success, true)

    assert.equal(!!(await client.getPrivateInfo()).success, true)

    assert.equal(!!(await client.getActiveOrders({ pair: "ltc_btc" })).success, true)

    assert.equal(!!(await client.getTradeHistory({ pair: "ltc_btc" })).success, true)

    assert.equal(!!(await client.getDepositAddress({ coinName: "btc" })).success, true)

    assert.equal(!!(await client.withdrawCoinsToAddress({ coinName: "btc", amount: 1, address: "test" })).success, true)

    assert.equal(!!(await client.addTrade({ pair: "ltc_btc", type: "buy", rate: 5, amount: 2 })).success, true)

    assert.equal(!!(await client.cancelOrder({ order_id: 5 })).success, true)

    assert.equal(!!(await client.getOrderInfo({ order_id: 5 })).success, true)
  })
})
