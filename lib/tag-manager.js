const Hyperswarm = require('hyperswarm')
const sodium = require('sodium-native')
const ReadyResource = require('ready-resource')
const b4a = require('b4a')
const ProtomuxRPC = require('protomux-rpc')

module.exports = class TagManager extends ReadyResource {
  constructor (user, opts = {}) {
    super()
    this.user = user
    this.swarm = new Hyperswarm(opts)
    this.swarm.on('connection', async (conn, info) => await this._onconnection(conn, info))
    this.tags = new Map() // acts as cache memory
    this._streamOnly = opts.streamOnly
  }

  // TODO close connection after sending and receiving info

  async _onconnection (connection, info) {
    const rpc = new ProtomuxRPC(connection)
    rpc.respond('user-info', (req) => {
      return this.user.encodeUserInfo()
    })

    if (this._streamOnly) return

    rpc.on('open', async () => {
      try {
        const encodedUserInfo = await rpc.request('user-info', b4a.alloc(1), { timeout: 60000 })
        this._addStream(encodedUserInfo)
      } catch (err) {
        console.log(err)
      }
    })
  }

  async _open () {
  }

  async _close () {
    await this.swarm.destroy()
  }

  async announceTag (tag) {
    const hash = Buffer.alloc(32)
    sodium.crypto_generichash(hash, Buffer.from('pear-radio' + tag))
    await this.swarm.join(hash)
    return this.swarm.flush()
  }

  async searchByTag (tag) {
    if (!this.tags.has(tag)) this.tags.set(tag, [])
    const hash = Buffer.alloc(32)
    sodium.crypto_generichash(hash, Buffer.from('pear-radio' + tag))
    await this.swarm.join(hash)
    return this.swarm.flush()
  }

  removeTag (tag) {
    return this.swarm.leave(tag)
  }

  _addStream (encodedUser) {
    const decodedUser = this.user.decodeUserInfo(encodedUser)
    if (decodedUser.tags) {
      decodedUser.tags.split(',').forEach(tag => {
        if (!this.tags.has(tag)) this.tags.set(tag, [])
        if (!this.tags.get(tag).find(e => b4a.equals(e.publicKey, decodedUser.publicKey))) {
          this.tags.get(tag).push(decodedUser)
        }
      })
    }
    this.emit('stream-found', decodedUser)
  }

  destroy () {
    return this.swarm.destroy()
  }
}
