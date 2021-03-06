## express-tus 🏋️

[![Travis build status](http://img.shields.io/travis/gajus/express-tus/master.svg?style=flat-square)](https://travis-ci.org/gajus/express-tus)
[![Coveralls](https://img.shields.io/coveralls/gajus/express-tus.svg?style=flat-square)](https://coveralls.io/github/gajus/express-tus)
[![NPM version](http://img.shields.io/npm/v/express-tus.svg?style=flat-square)](https://www.npmjs.org/package/express-tus)
[![Canonical Code Style](https://img.shields.io/badge/code%20style-canonical-blue.svg?style=flat-square)](https://github.com/gajus/canonical)
[![Twitter Follow](https://img.shields.io/twitter/follow/kuizinas.svg?style=social&label=Follow)](https://twitter.com/kuizinas)

[Express](https://expressjs.com/) middleware for [tus protocol](https://tus.io/) (v1.0.0).

---

* [Motivation](#motivation)
* [API](#api)
  * [Rejecting file uploads](#rejecting-file-uploads)
* [Storage](#storage)
  * [Memory Storage](#memory-storage)
* [CORS](#cors)
* [Supported extensions](#supported-extensions)
  * [Checksum](#checksum)
  * [Creation](#creation)
  * [Expiration](#expiration)
  * [Termination](#termination)
* [Implementation considerations](#implementation-considerations)
  * [Resumable uploads using Google Storage](#resumable-uploads-using-google-storage)
  * [Restrict minimum chunk size](#restrict-minimum-chunk-size)

## Motivation

Conceptually, [tus](https://tus.io/) is a great initiative. However, the existing implementations are lacking:

* [tus-node-server](https://github.com/tus/tus-node-server) has a big warning stating that usage is discouraged in favour of tusd.
* [tusd](https://github.com/tus/tusd) has bugs and opinionated limitations (just browse [issues](https://github.com/tus/tusd/issues)).

`express-tus` provides a high-level abstraction that implements tus protocol, but leaves the actual handling of uploads to the implementer. This approach has the benefit of granular control over the file uploads while being compatible with the underlying (tus) protocol.

## API

```js
// @flow

import {
  createTusMiddleware,
  formatUploadMetadataHeader,
} from 'express-tus';
import type {
  ConfigurationInputType,
  IncomingMessageType,
  ResponseType,
  StorageType,
  UploadInputType,
  UploadMetadataType,
  UploadType,
  UploadUpdateInputType,
} from 'express-tus';

/**
 * Formats Tus compliant metadata header.
 */
formatUploadMetadataHeader(uploadMetadata: UploadMetadataType): string;

/**
 * @property uploadExpires UNIX timestamp (in milliseconds) after which the upload will be deleted.
 * @property uploadLength Indicates the size of the entire upload in bytes.
 * @property uploadMetadata Key-value meta-data about the upload.
 * @property uploadOffset Indicates a byte offset within a resource.
 */
type UploadType = {|
  +uploadExpires?: number,
  +uploadLength: number,
  +uploadMetadata: UploadMetadataType,
  +uploadOffset: number,
|};

/**
 * @property createUpload Approves file upload. Defaults to allowing all uploads.
 * @property delete Deletes upload.
 * @property getUpload Retrieves progress information about an existing upload.
 * @property upload Applies bytes contained in the incoming message at the given offset.
 */
type StorageType = {|
  +createUpload: (input: UploadInputType) => MaybePromiseType<UploadType>,
  +delete: (uid: string) => MaybePromiseType<void>,
  +getUpload: (uid: string) => MaybePromiseType<UploadType>,
  +upload: (input: UploadUpdateInputType) => MaybePromiseType<void>,
|};

/**
 * @property basePath Path to where the tus middleware is mounted. Used for redirects. Defaults to `/`.
 * @property createUid Generates unique identifier for each upload request. Defaults to UUID v4.
 */
type ConfigurationInputType = {|
  +basePath?: string,
  +createUid?: () => Promise<string>,
  ...StorageType,
|};

createTusMiddleware(configuration: ConfigurationInputType);

```

### Rejecting file uploads

`createUpload`, `upload` and `getUpload` can throw an error at any point to reject an upload. The error will propagate through usual express error handling path.

As an example, this is what [Memory Storage](#memory-storage) errors handler could be implemented:

```js
import {
  createMemoryStorage,
  createTusMiddleware,
  ExpressTusError,
  NotFoundError,
  UserError,
} from 'express-tus';

app.use(createTusMiddleware({
  ...createMemoryStorage(),
}));

app.use((error, incomingMessage, outgoingMessage, next) => {
  // `incomingMessage.tus.uid` contains the upload UID.
  incomingMessage.tus.uid;

  if (error instanceof ExpressTusError) {
    if (error instanceof NotFoundError) {
      outgoingMessage
        .status(404)
        .end('Upload not found.');

      return;
    }

    if (error instanceof UserError) {
      outgoingMessage
        .status(500)
        .end(error.message);

      return;
    }

    outgoingMessage
      .status(500)
      .end('Internal server error.');
  } else {
    next();

    return;
  }
});

```

## Storage

`express-tus` does not provide any default storage engines.

### Memory Storage

Refer to the [example](./src/factories/createMemoryStorage.js), in-memory, storage engine.

## CORS

`express-tus` configures [`access-control-allow-headers`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Headers) and [`access-control-expose-headers`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Expose-Headers), but does not configure [`access-control-allow-origin`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin).

Use [`cors`](https://www.npmjs.com/package/cors) to configure the necessary headers for cross-site communication.

## Supported extensions

### Checksum

[creation](https://tus.io/protocols/resumable-upload.html#checksum)

Supported algorithms:

* crc32
* md5
* sha1
* sha256

### Creation

[creation](https://tus.io/protocols/resumable-upload.html#creation)

### Expiration

[expiration](https://tus.io/protocols/resumable-upload.html#expiration)

Note that it is the responsibility of the storage engine to detect and delete expired uploads.

### Termination

[termination](https://tus.io/protocols/resumable-upload.html#termination)

## Implementation considerations

### Resumable uploads using Google Storage

One of the original goals for writing `express-tus` was to have an abstraction that will allow to uploads files to Google Storage using their [resumable uploads protocol](https://cloud.google.com/storage/docs/performing-resumable-uploads). However, it turns out that, due to [arbitrary restrictions](https://github.com/googleapis/nodejs-storage/issues/1192#issuecomment-629042176) imposed by their API, this is not possible.

Specifically, the challenge is that Google resumable uploads (1) do not guarantee that they will upload the entire chunk that you send to the server and (2) do not allow to upload individual chunks lesser than 256 KB. Therefore, if you receive upload chunks on a different service instances, then individual instances are not going to be able to complete their upload without being aware of the chunks submitted to the other instances.

The only [workaround](https://github.com/googleapis/nodejs-storage/issues/1192#issuecomment-628873851) is to upload chunks individually (as separate files) and then using Google Cloud API to concatenate files. However, this approach results in [significant cost increase](https://github.com/googleapis/gcs-resumable-upload/issues/132#issuecomment-603493772).

### Restrict minimum chunk size

tus protocol does not dictate any restrictions about individual chunk size. However, this leaves your service open to DDoS attack.

When implementing `upload` method, restrict each chunk to a desired minimum size (except the last one), e.g.

```js
{
  // [..]

  upload: async (input) => {
    if (input.uploadOffset + input.chunkLength < input.uploadLength && input.chunkLength < MINIMUM_CHUNK_SIZE) {
      throw new UserError('Each chunk must be at least ' + filesize(MINIMUM_CHUNK_SIZE) + ' (except the last one).');
    }

    // [..]
  },
}

```

Google restricts their uploads to a [minimum of 256 KB per chunk](https://cloud.google.com/storage/docs/performing-resumable-uploads#json-api), which is a reasonable default. However, even with 256 KB restriction, a 1 GB upload would result in 3906 write operations. Therefore, if you are allowing large file uploads, adjust the minimum chunk size dynamically based on the input size.
