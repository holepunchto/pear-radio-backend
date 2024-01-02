const test = require('brittle')
const User = require('../lib/user')
const Listener = require('../lib/listener')
const Streamer = require('../lib/streamer')
const createTestnet = require('hyperdht/testnet.js')
const Hyperswarm = require('hyperswarm')
const Corestore = require('corestore')
const RAM = require('random-access-memory')
const Mp3ReadStream = require('../lib/mp3-read-stream')
const path = require('path')

test('creates/destroys listener', async (t) => {
  const testnet = await createTestnet()
  const bootstrap = testnet.bootstrap

  const swarm = new Hyperswarm({ bootstrap })
  const store = new Corestore(RAM)
  await store.ready()

  const listener = new Listener(Buffer.alloc(32), swarm, store)
  await listener.ready()

  t.teardown(async () => {
    await listener.close()
    await testnet.destroy()
  })

  t.ok(listener)
})

test('listener gets audio data in blocks of ~1 second', async (t) => {
  t.plan(1)

  const testnet = await createTestnet()
  const bootstrap = testnet.bootstrap

  const swarm = new Hyperswarm({ bootstrap })
  const store = new Corestore(RAM)
  const user = new User(null, { bootstrap })
  await store.ready()
  await user.ready()

  const streamer = new Streamer(user.keyPair, swarm, store)
  await streamer.ready()

  const { remoteStream } = await Mp3ReadStream.stream(path.join(__dirname, 'fixtures', 'file.mp3'))
  await streamer.stream({}, remoteStream)

  const listener = new Listener(user.keyPair.publicKey, swarm, store)
  await listener.ready()

  const listenerStream = await listener.listen(0, () => {})
  let blocks = 0
  listenerStream.on('data', (data) => {
    blocks++
    if (blocks === 173) t.pass('Received 173 blocks')
  })

  t.teardown(async () => {
    listenerStream.destroy()
    await user.close()
    await listener.close()
    await testnet.destroy()
  })
})
