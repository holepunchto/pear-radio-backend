const NodeID3 = require('node-id3')
const { createReadStream } = require('fs')
const { readFile } = require('fs/promises')
const { basename } = require('path')
const getMP3Duration = require('get-mp3-duration')
const { stat } = require('fs/promises')

module.exports = class Mp3ReadStream {
  static async stream (path) {
    const { size } = await stat(path)
    const duration = await Mp3ReadStream.readMp3Duration(path)
    const bitRate = size / Math.floor(duration)
    const localStream = createReadStream(path)
    const remoteStream = createReadStream(path, { highWaterMark: Math.floor(bitRate) }) // chunks are ~1 second of audio, helps in sync calculation
    return { localStream, remoteStream }
  }

  static async readTrack (path) {
    const tags = NodeID3.read(path)
    const duration = Math.floor(await Mp3ReadStream.readMp3Duration(path))
    const secondsToMinutes = (seconds) => Math.floor(seconds / 60) + ':' + (seconds % 60 >= 10 ? seconds % 60 : '0' + seconds % 60)
    const file = basename(path)
    return { file, name: tags.title, artist: tags.artist, duration: secondsToMinutes(duration), seconds: duration, path }
  }

  static async readMp3Duration (path) {
    const buffer = await readFile(path)
    return Math.floor(getMP3Duration(buffer) / 1000)
  }
}
