const c = require('compact-encoding')
const ReadyResource = require('ready-resource')
const Streamer = require('./streamer.js')
const Mp3ReadStream = require('./mp3-read-stream.js')
const HttpAudioStreamer = require('./http-audio-streamer.js')
const { syncResponse } = require('./encoding.js')

const bootstrap = process.env.TEST ? [{ host: '127.0.0.1', port: 49736 }] : undefined

module.exports = class Player extends ReadyResource {
  constructor (start, swarm, store, userKeyPair) {
    super()
    this.start = start
    this.audio = start()
    this.streamer = new Streamer(userKeyPair, swarm, store, { bootstrap })
    this.httpAudioStreamer = new HttpAudioStreamer()
    this.volume = 0.5
    this.playlist = []
    this.index = 0
    this.random = false
    this.intervalIsFinished = null
    this.intervalIsBuffering = null
    this.currentTrackDuration = null
    this.isPlayingLocal = false
  }

  async _open () {
    await this.streamer.ready()
    await this.httpAudioStreamer.ready()
    this.audio.src = 'http://localhost:' + this.httpAudioStreamer.port // Note that using localhost can be confusing in some cases, as on some systems it resolves to 127.0.0.1 and on others to :: (ipv6)
    this.audio.volume = this.volume
  }

  async _close () {
    // TODO: close the streamer? Probably also call stop on the audio stream
  }

  async play (info, opts = {}) {
    if (!this.intervalIsBuffering) this.intervalIsBuffering = this.trackIsBuffering()
    if (!this.intervalIsFinished) this.intervalIsFinished = this.trackIsFinished()
    if (info) this.index = this.playlist.indexOf(info.path)

    this.cleanBuffer()

    const path = info ? info.path : this.playlist[this.index]
    const { localStream, remoteStream } = await Mp3ReadStream.stream(path)
    const metadata = await Mp3ReadStream.readTrack(path)

    await this.streamer.stream(metadata, remoteStream, opts)
    await this.httpAudioStreamer.stream(localStream)

    await this.audio.play()
    this.isPlayingLocal = true

    return metadata
  }

  async playStream (stream) {
    await this.streamer.stop() // stop streaming if you are going to play another stream
    await this.httpAudioStreamer.stream(stream)
    if (!this.intervalIsBuffering) this.intervalIsBuffering = this.trackIsBuffering()
    this.intervalIsFinished = null // only for local
    this.audio.play()
    this.isPlayingLocal = false
  }

  async syncRequest (req) {
    const block = this.currentAudioBlock()
    const { artist, name } = await this.streamer.getMetadata()
    return c.encode(syncResponse, { block, artist, name })
  }

  cleanBuffer () {
    this.audio.pause()
    this.audio.load()
  }

  stop () {
    this.audio.pause()
    this.cleanBuffer()
    this.streamer.stop()
    this.isPlayingLocal = false
  }

  async forward (opts) {
    this.index = this.random ? Math.floor(Math.random() * this.playlist.length) : (this.index + 1) % this.playlist.length
    return this.play(null, opts)
  }

  async backward (opts) {
    this.index = this.random ? Math.floor(Math.random() * this.playlist.length) : (this.index - 1) % this.playlist.length
    return this.play(null, opts)
  }

  async addTrack (path) {
    const metadata = await Mp3ReadStream.readTrack(path)
    this.playlist.push(path)
    return metadata
  }

  currentAudioBlock () {
    const buffer = 4 // compensate mp3 kbs deviation
    return this.streamer.checkpoint + Math.floor(this.audio.currentTime) - buffer
  }

  trackIsBuffering () {
    return setInterval(() => {
      try {
        this.audio.buffered.end(0)
        this.emit('buffering-finished')
      } catch (err) {
        this.emit('buffering')
      }
    }, 100)
  }

  trackIsFinished () {
    let last = -1
    return setInterval(async () => {
      if (this.isPlayingLocal && last && this.audio.currentTime === last && this.audio.currentTime !== 0.1) {
        const metadata = await this.forward()
        this.emit('track-finished', { index: this.index, metadata })
        last = -1
      }
      last = this.audio.currentTime
    }, 100)
  }
}
