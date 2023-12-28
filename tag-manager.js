import EventEmmiter from 'events'
import Hyperswarm from 'hyperswarm'
import sodium from 'sodium-native'

export class TagManager extends EventEmmiter {
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
      this.emit('stream-found', decodedUser)
      if (decodedUser.tags) {
        decodedUser.tags.split(',').forEach(tag => {
          if (!this.tags.has(tag)) this.tags.set(tag, [])
          this.tags.get(tag).push(decodedUser)
        })
      }
      this.tags.get('#all').push(decodedUser)
    })
  }

  async ready () {
    this.announce() // announce to the #all channel
    this.tags.set('#all', [])
    this.searchByTag('#all')
  }

  async announce () {
    const pearRadioTopic = 'pear-radio#all'
    const hash = Buffer.alloc(32)
    sodium.crypto_generichash(hash, Buffer.from(pearRadioTopic))
    await this.swarm.join(hash)
    this.swarm.flush()
  }

  async announceTag (tag) {
    const hash = Buffer.alloc(32)
    sodium.crypto_generichash(hash, Buffer.from(tag))
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
