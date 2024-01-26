function createManifest (publicKey, namespace) {
  return {
    signers: [
      {
        signature: 'ed25519',
        publicKey,
        namespace: Buffer.from(namespace.padEnd(32, '\0'))
      }
    ]
  }
}

module.exports = {
  createManifest
}
