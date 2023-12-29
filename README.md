# Pear Radio Backend

Backend connectivity for [Pear Radio.](https://github.com/holepunchto/pear-radio)

## API

### User

User communication interface.

``` javascript
const user = new User(player, opts)
await user.ready()
```

#### await user.getUserInfo(key)

Gets user/streamer information by key.

``` javascript
const info = await user.getUserInfo(key)
```

User information is an object:

``` javascript
{
  publicKey: buffer,
  name: string,
  description: string,
  tags: c.string
}
```

#### await user.syncRequest(key)

Gets user/streamer information about the track that is streaming at the moment.

``` javascript
const info = await user.syncRequest(key)
```

``` javascript
{
  block: uint,
  artist: string,
  name: string
}
```

### Listener

Receives stream from remote user/streamer.

``` javascript
const listener = new Listener(userPublicKey, swarm, store)
await listener.ready()
```

#### await listener.listen(fromBlock)

Returns the stream of the remote user core, starting from block `fromBlock`. Each block corresponds to ~1 second of audio.

### Streamer

Streams audio data and metadata.

``` javascript
const streamer = new Streamer(keyPair, swarm, store, opts)
await streamer.ready()
```

#### await streamer.stream(metadata, stream, opts)

Streams single track.

### Mp3ReadStream

Collection of static methods to read mp3 files and ID3 tags.

#### Mp3ReadStream.stream(path)

Returns `{ localStream, remoteStream }`. `localStream` is a `fs.createReadStream` of a given file. `remoteStream` streams chunks of the file of ~1 second of audio.

#### Mp3ReadStream.readTrack(path)

Return metadata and duration information of an mp3 file.

``` javascript
{
  file: string // filename
  name: string, // track title
  artist: string, // track artist
  duration: uint, // duration in seconds
  path: string // absolute path of the file
}
```

### HttpAudioStreamer

Http server that stream mp3 files for local consumption.

``` javascript
const httpStreamer = new HttpAudioStreamer()
const port = await httpStreamer.ready()
```

#### httpStreamer.stream(stream)

``` javascript
const { localStream } = Mp3ReadStream.stream(absPath)
httpStreamer.stream(localStream) // stream mp3 file in localhost:$port
```

### PearRadioConfiguration

Hyperbee that stores pear radio user information.

``` javascript
const configuration = new PearRadioConfiguration()
await configuration.ready()
```

#### configuration.get(key)

Returns value of the given key.

#### configuration.set(key, value)

Sets value for the given key, with format `compact-encoding.any`.
