const ReadyResource = require('ready-resource')
const { createManifest } = require('./manifest.js')

const PEAR_RADIO_STREAM = 'pear_radio_stream'
const PEAR_RADIO_METADATA = 'pear_radio_metadata'

module.exports = class Streamer extends ReadyResource {
  constructor (keyPair, swarm, store, opts = {}) {
    super()
    this.swarm = swarm
    this.store = store // TODO: either pass in store session from pear-radio app instead of the full corestore, or create a session here, so the lifetime of the store can be managed within this class
    this.keyPair = keyPair
    this.core = null
    this.metadata = null
    this.streaming = null
    this.checkpoint = null // last song starting block
  }

  async _open () {
    this.core = this.store.get({ key: this.keyPair.publicKey, keyPair: this.keyPair, manifest: createManifest(this.keyPair.publicKey, PEAR_RADIO_STREAM) })
    this.metadata = this.store.get({ key: this.keyPair.publicKey, keyPair: this.keyPair, manifest: createManifest(this.keyPair.publicKey, PEAR_RADIO_METADATA), valueEncoding: 'json' })
    await this.store.ready()
    await this.core.ready()
    await this.metadata.ready()
    this.swarm.join(this.core.discoveryKey)
    this.swarm.join(this.metadata.discoveryKey) // TODO: I think just one announce here works fine for the server, as the corestore will connect the other one to every peer looking for both (like in hyperdrive)
    // this.swarm.flush() // Not needed I think, the hypercore.get(...) commands will wait anyway
  }

  async _close () {
    // TODO: Close the store (if it's a session managed here), or close the metadata+core cores
    // TODO: consider unjoining the swarm?

  }

  async stream (metadata, stream, opts = {}) {
    this.checkpoint = this.core.length
    if (this.streaming) await this.streaming.destroy()
    if (opts.forceRemoteCleanBuffer) metadata.cleanBuffer = true
    await this.metadata.append({ artist: metadata.artist, name: metadata.name, cleanBuffer: metadata.cleanBuffer })
    if (this.checkpoint !== 0) await this.core.clear(0, this.checkpoint)
    stream.on('data', data => {
      this.core.append(data)
    })
    this.streaming = stream
  }

  getMetadata () { // Return current track metadata
    return this.metadata.get(this.metadata.length - 1)
  }

  async stop () {
    if (this.streaming) await this.streaming.destroy()
    this.streaming = null
  }

  destroy () {
    this.store.destroy()
    this.swarm.destroy()
  }
}
