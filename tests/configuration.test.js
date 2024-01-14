const PearRadioConfiguration = require('../lib/config')
const test = require('brittle')
const { tmpdir } = require('os')
const { join } = require('path')

test('get/set configuration value', async (t) => {
  const random = (Math.random() + 1).toString(36).substring(7)
  const config = new PearRadioConfiguration(join(tmpdir(), random))
  await config.set('key', 'value')
  const value = await config.get('key')
  t.is(value, 'value')
})

test('versioning', async (t) => {
  const random = (Math.random() + 1).toString(36).substring(7)
  const config = new PearRadioConfiguration(join(tmpdir(), random), { version: 'v_test' })
  await config.set('key', 'value')
  const value = await config.get('key')
  t.is(value, 'value')
})
