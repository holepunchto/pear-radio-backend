const test = require('brittle')
const User = require('../user')
const createTestnet = require('hyperdht/testnet.js')

test('creates/destroys user', async (t) => {
  const user = new User()
  await user.ready()

  t.teardown(async () => {
    await user.close()
  })

  t.ok(user)
})

test('userA gets userB info', async (t) => {
  const testnet = await createTestnet()
  const bootstrap = testnet.bootstrap

  const userA = new User(null, { bootstrap })
  await userA.ready()

  const userB = new User(null, { bootstrap })
  await userB.ready()

  t.teardown(async () => {
    await userA.close()
    await userB.close()
    await testnet.destroy()
  })

  userB.info = {
    publicKey: userB.keyPair.publicKey,
    name: 'userB_name',
    description: 'userB_description',
    tags: 'userB_tags'
  }

  const info = await userA.getUserInfo(userB.keyPair.publicKey)

  t.is(info.publicKey.toString(), userB.keyPair.publicKey.toString())
  t.is(info.name, 'userB_name')
  t.is(info.description, 'userB_description')
  t.is(info.tags, 'userB_tags')
})
