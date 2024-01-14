const Hyperbee = require('hyperbee')
const ReadyResource = require('ready-resource')
const Hypercore = require('hypercore')
const c = require('compact-encoding')
const SubEncoder = require('sub-encoder')

module.exports = class PearRadioConfiguration extends ReadyResource {
  constructor (storage, opts = {}) {
    super()
    const enc = new SubEncoder()
    this.core = new Hypercore(storage)
    this.bee = new Hyperbee(this.core, { keyEncoding: 'utf-8', valueEncoding: c.any })
    this.encoding = enc.sub(opts.version || 'v0')
  }

  async _open () {
    await this.core.ready()
    await this.bee.ready()
    const username = await this.get('username')
    const description = await this.get('description')
    const tags = await this.get('tags')
    const darkMode = await this.get('darkMode')
    const favourites = await this.get('favourites')

    if (!username) await this.set('username', '')
    if (!description) await this.set('description', '')
    if (!tags) await this.set('tags', '')
    if (!darkMode) await this.set('darkMode', null)
    if (!favourites) await this.set('favourites', [])
  }

  async _close () {
    return this.bee.close()
  }

  async set (key, value) {
    return this.bee.put(key, value, { keyEncoding: this.encoding })
  }

  async get (key) {
    if (key === 'seed') return this.bee.key
    const entry = await this.bee.get(key, { keyEncoding: this.encoding })
    return entry ? entry.value : entry
  }
}
