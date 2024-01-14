const c = require('compact-encoding')
const DHT = require('hyperdht')
const RPC = require('@hyperswarm/rpc')
const { userInfo, syncResponse } = require('./encoding.js')
const ReadyResource = require('ready-resource')
const b4a = require('b4a')

module.exports = class User extends ReadyResource {
  constructor (syncResponseCallback, opts = {}) {
    super()
    this.info = { publicKey: null, name: null, description: null, tags: null }
    this.keyPair = opts.keyPair || DHT.keyPair()
    this.rpc = new RPC({ keyPair: this.keyPair, ...opts })
    this.server = this.rpc.createServer()
    this.connections = new Map()
    this.syncResponseCallback = syncResponseCallback
  }

  async _open () {
    this.server.respond('user-info', (req) => {
      return c.encode(userInfo, this.info)
    })

    this.server.respond('sync-request', async (req) => {
      return (await this.syncResponseCallback(req))
    })

    await this.server.listen(this.keyPair)
  }

  async _close () {
    await this.rpc.destroy()
    await this.server.close()
  }

  async getUserInfo (key) {
    if (!this.connections.has(key)) this.connections.set(key, this.rpc.connect(key))
    const encodedUserInfo = await this.connections.get(key).request('user-info', b4a.alloc(0)) // empty request body
    try {
      return this.decodeUserInfo(encodedUserInfo)
    } catch (err) {
      console.log(err)
    }
  }

  async syncRequest (key) {
    if (!this.connections.has(key)) this.connections.set(key, this.rpc.connect(key))
    const encodedSyncResponse = await this.connections.get(key).request('sync-request', this.keyPair.publicKey)
    try {
      return this._decodeSyncResponse(encodedSyncResponse)
    } catch (err) {
      console.log(err)
    }
  }

  encodeUserInfo () {
    return c.encode(userInfo, this.info)
  }

  decodeUserInfo (data) {
    try {
      return c.decode(userInfo, data)
    } catch (err) {
      return null
    }
  }

  _decodeSyncResponse (data) {
    try {
      return c.decode(syncResponse, data)
    } catch (err) {
      return null
    }
  }
}
