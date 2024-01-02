const c = require('compact-encoding')
const { compile, opt } = require('compact-encoding-struct')

const userInfo = compile({
  publicKey: c.buffer,
  name: c.string,
  description: opt(c.string),
  tags: opt(c.string)
})

const syncResponse = compile({
  block: (c.uint),
  artist: opt(c.string),
  name: opt(c.string)
})

module.exports = {
  userInfo,
  syncResponse
}
