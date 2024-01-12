const Hyperswarm = require('hyperswarm')
const sodium = require('sodium-native')
const ReadyResource = require('ready-resource')
const b4a = require('b4a')

module.exports = class TagManager extends ReadyResource {
  constructor (user, opts = {}) {
    super()
    this.user = user
    this.swarm = new Hyperswarm(opts)
    this.swarm.on('connection', (conn, info) => this._onConnection(conn, info))
    this.tags = new Map() // acts as cache memory
  }

  _onConnection (connection, info) {
    connection.write(this.user.encodeUserInfo())
    connection.on('data', (encodedUser) => {
      const decodedUser = this.user.decodeUserInfo(encodedUser)
      if (decodedUser.tags) {
        decodedUser.tags.split(',').forEach(tag => {
          if (!this.tags.has(tag)) this.tags.set(tag, [])
          if (!this.tags.get(tag).find(e => b4a.equals(e, decodedUser.publicKey))) {
            this.tags.get(tag).push(decodedUser)
          }
        })
      }
      if (!this.tags.get('#all').find(e => b4a.equals(e, decodedUser.publicKey))) {
        this.tags.get('#all').push(decodedUser)
      }
      this.emit('stream-found', decodedUser)
    })
  }

  async _open () {
    this.announce() // announce to the #all channel
    this.tags.set('#all', [])
    this.searchByTag('#all')
  }

  async _close () {
    await this.swarm.destroy()
  }

  async announce () {
    const pearRadioTopic = '#all'
    const hash = Buffer.alloc(32)
    sodium.crypto_generichash(hash, Buffer.from('pear-radio' + pearRadioTopic))
    await this.swarm.join(hash)
    this.swarm.flush()
  }

  async announceTag (tag) {
    const hash = Buffer.alloc(32)
    sodium.crypto_generichash(hash, Buffer.from('pear-radio' + tag))
    await this.swarm.join(hash)
    this.swarm.flush()
  }

  async searchByTag (tag) {
    if (tag === '#all') return // searched by default
    if (!this.tags.has(tag)) this.tags.set(tag, [])
    const hash = Buffer.alloc(32)
    sodium.crypto_generichash(hash, Buffer.from('pear-radio' + tag))
    await this.swarm.join(hash)
    this.swarm.flush()
  }

  removeTag (tag) {
    return this.swarm.leave(tag)
  }

  destroy () {
    return this.swarm.destroy()
  }
}
