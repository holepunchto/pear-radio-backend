const { Mp3ReadStream } = require('../index.js')
const test = require('brittle')
const path = require('path')

test('read mp3 duration', async (t) => {
  const duration = await Mp3ReadStream.readMp3Duration(path.join(__dirname, 'fixtures', 'file.mp3'))
  t.is(Math.floor(duration), 172)
})

test('read metadata', async (t) => {
  const metadata = await Mp3ReadStream.readTrack(path.join(__dirname, 'fixtures', 'file.mp3'))
  t.ok(metadata.duration, '2:52')
  t.ok(metadata.name, 'Nicht mehr')
})

test('stream file', async (t) => {
  t.plan(2)
  const { localStream, remoteStream } = await Mp3ReadStream.stream(path.join(__dirname, 'fixtures', 'file.mp3'))

  let localChunks = 0
  localStream.on('data', (data) => {
    localChunks++
    if (localChunks === 106) t.ok(true)
  })

  let remoteChunks = 0
  remoteStream.on('data', (data) => {
    remoteChunks++
    if (remoteChunks === 173) t.ok(true)
  })
})
