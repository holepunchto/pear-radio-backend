const TagManager = require('../lib/tag-manager')
const test = require('brittle')
const User = require('../lib/user')
const createTestnet = require('hyperdht/testnet.js')

test('can create/destroy a tag manager', async (t) => {
  const testnet = await createTestnet()
  const bootstrap = testnet.bootstrap

  const user = new User(null, { bootstrap })
  await user.ready()

  const tagManager = new TagManager(user)
  await tagManager.ready()

  t.teardown(async () => {
    await tagManager.close()
    await user.close()
    await testnet.destroy()
  })

  t.ok(tagManager)
})

test('announce in #another channel', async (t) => {
  t.plan(4)

  const testnet = await createTestnet()
  const bootstrap = testnet.bootstrap

  const userA = new User(null, { bootstrap })
  await userA.ready()

  const tagManagerA = new TagManager(userA, { bootstrap })
  await tagManagerA.ready()

  const userB = new User(null, { bootstrap })
  await userB.ready()

  const tagManagerB = new TagManager(userB, { bootstrap })
  await tagManagerB.ready()

  userA.info = {
    publicKey: Buffer.alloc(32),
    name: 'userA_name',
    description: 'userA_description',
    tags: '#userA_tag'
  }

  userB.info = {
    publicKey: Buffer.alloc(32),
    name: 'userB_name',
    description: 'userB_description',
    tags: '#userB_tag'
  }

  await tagManagerB.announceTag('#another')

  tagManagerA.on('stream-found', (info) => {
    t.is(info.name, 'userB_name')
    t.is(info.tags, '#userB_tag')
  })

  tagManagerB.on('stream-found', (info) => {
    t.is(info.name, 'userA_name')
    t.is(info.tags, '#userA_tag')
  })

  await tagManagerA.searchByTag('#another')

  t.teardown(async () => {
    await tagManagerA.close()
    await userA.close()
    await tagManagerB.close()
    await userB.close()
    await testnet.destroy()
  })
})
