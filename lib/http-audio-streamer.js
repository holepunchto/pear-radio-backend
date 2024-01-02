const http = require('http')

module.exports = class HttpAudioStreamer {
  constructor (opts = {}) {
    this.listeners = []
    this.streaming = null
    this.cli = opts.cli
    this.buffer = []
    this.server = http.createServer((req, res) => {
      res.writeHead(200, {
        'Content-Type': 'audio/mp3',
        'Transfer-Encoding': 'chunked'
      })
      this.listeners.push(res)
      if (this.cli) this.buffer.forEach(e => res.write(e))
    })
  }

  ready () {
    return new Promise((resolve) => {
      this.server.listen(this.port || 0, '127.0.0.1', () => {
        this.port = this.port || this.server.address().port
        resolve(this.port)
      })
    })
  }

  async stream (readStream) {
    if (this.streaming) await this.streaming.destroy()
    this.streaming = readStream
    readStream.on('data', data => {
      if (this.cli) this.buffer.push(data)
      this.listeners.forEach(l => l.write(data))
    })
  }

  async stop () {
    if (this.streaming) await this.streaming.destroy()
    this.streaming = null
  }
}
