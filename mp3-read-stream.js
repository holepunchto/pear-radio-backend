import NodeID3 from 'node-id3'
import fs from 'fs'
import { basename } from 'path'
import mp3Duration from '@rafapaezbas/mp3-duration'
import { stat } from 'fs/promises'

export class Mp3ReadStream {
  static async stream (path) {
    const { size } = await stat(path)
    const duration = await Mp3ReadStream.readMp3Duration(path)
    const bitRate = size / Math.floor(duration)
    const localStream = fs.createReadStream(path)
    const remoteStream = fs.createReadStream(path, { highWaterMark: Math.floor(bitRate) }) // chunks are ~1 second of audio, helps in sync calculation
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
    return new Promise((resolve, reject) => {
      mp3Duration(path, (err, { duration }) => {
        if (err) reject(err)
        resolve(duration)
      })
    })
  }
}
