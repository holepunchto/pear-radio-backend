const ReadyResource = require('ready-resource')
const { createManifest } = require('./manifest.js')

const PEAR_RADIO_STREAM = 'pear_radio_stream'
const PEAR_RADIO_METADATA = 'pear_radio_metadata'

module.exports = class Listener extends ReadyResource {
  constructor (userPublicKey, swarm, store, opts = {}) {
    super()
    this.userPublicKey = userPublicKey
    this.swarm = swarm
    this.store = store
    this.core = null
    this.metadata = null
  }

  async _open () {
    await this.store.ready()
    this.core = this.store.get({ keyPair: { publicKey: this.userPublicKey }, manifest: createManifest(this.userPublicKey, PEAR_RADIO_STREAM) })
    this.metadata = this.store.get({ keyPair: { publicKey: this.userPublicKey }, manifest: createManifest(this.userPublicKey, PEAR_RADIO_METADATA), valueEncoding: 'json' })
    await this.core.ready()
    await this.metadata.ready()
    this.swarm.join(this.core.discoveryKey)
    this.swarm.join(this.metadata.discoveryKey)
    this.swarm.flush()
  }

  async _close () {
    await this.store.close()
    await this.core.close()
    await this.swarm.destroy()
  }

  async listen (fromBlock, metadataCallback) {
    const stream = this.core.createReadStream({ live: true, start: fromBlock })
    this.metadata.createReadStream({ live: true, start: this.metadata.length - 1 })
    if (metadataCallback) {
      this.metadata.on('append', async () => {
        const data = await this.metadata.get(this.metadata.length - 1)
        metadataCallback(data)
      })
    }
    return stream
  }

  async getLastPlayedTracks (n) { // max n of tracks
    const tracks = []
    await this.metadata.update()
    for (let i = 0; i < n; i++) {
      if (i + 1 > this.metadata.length) break
      tracks.push(await this.metadata.get(this.metadata.length - i - 1))
    }
    return tracks
  }
}
