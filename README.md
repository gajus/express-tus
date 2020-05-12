## express-tus 🏋️

[![Travis build status](http://img.shields.io/travis/gajus/express-tus/master.svg?style=flat-square)](https://travis-ci.org/gajus/express-tus)
[![Coveralls](https://img.shields.io/coveralls/gajus/express-tus.svg?style=flat-square)](https://coveralls.io/github/gajus/express-tus)
[![NPM version](http://img.shields.io/npm/v/express-tus.svg?style=flat-square)](https://www.npmjs.org/package/express-tus)
[![Canonical Code Style](https://img.shields.io/badge/code%20style-canonical-blue.svg?style=flat-square)](https://github.com/gajus/canonical)
[![Twitter Follow](https://img.shields.io/twitter/follow/kuizinas.svg?style=social&label=Follow)](https://twitter.com/kuizinas)

[Express](https://expressjs.com/) middleware for [tus protocol](https://tus.io/) (v1.0.0).

## Motivation

Conceptually, [tus](https://tus.io/) is a great initiative. However, the existing implementations are lacking:

* [tus-node-server](https://github.com/tus/tus-node-server) has a big warning stating that usage is discouraged in favour of tusd.
* [tusd](https://github.com/tus/tusd) has bugs and opinionated limitations (just browse [issues](https://github.com/tus/tusd/issues)).

`express-tus` provides a high-level abstraction that implements tus protocol, but leaves the actual handling of uploads to the implementer. This approach has the benefit of granular control over the file uploads while being compatible with the underlying (tus) protocol.

## API

```js
import {
  createTusMiddleware,
} from 'express-tus';
import type {
  UploadType,
  IncomingMessageType,
  ResponseType,
} from 'express-tus';

/**
 * @properties basePath Path to where the tus middleware is mounted. Used for redirects. Defaults to `/`.
 * @properties createUid Generates unique identifier for each upload request. Defaults to UUID v4.
 * @properties createUpload Approves file upload. Defaults to allowing all uploads.
 * @properties formatErrorResponse Formats HTTP response in case of an error.
 * @properties getUpload Retrieves progress information about an existing upload.
 * @properties upload Applies bytes contained in the incoming message at the given offset.
 */
type ConfigurationType = {|
  +basePath?: string,
  +createUid?: () => Promise<string>,
  +createUpload?: (input: UploadInputType) => Promise<UploadType>,
  +formatErrorResponse?: (error: Error) => ResponseType,
  +getUpload: (uid: string) => Promise<UploadType>,
  +upload: (
    uid: string,
    uploadOffset: number,
    incomingMessage: IncomingMessageType,
  ) => Promise<UploadType>,
|};

createTusMiddleware(configuration: ConfigurationType);

```

### Rejecting file uploads

`createUpload` and `upload` can throw an error at any point to reject an upload. By default, all uploads are rejected with 400 status code.

A custom response can be formatted using `formatErrorResponse` configuration, e.g.

```js
{
  formatErrorResponse: (error) => {
    return {
      body: 'Unauthorized',
      headers: {},
      statusCode: 401,
    };
  },
}

```

## CORS

`express-tus` configures [`access-control-allow-headers`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Headers) and [`access-control-expose-headers`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Expose-Headers), but does not configure [`access-control-allow-origin`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin).

Use [`cors`](https://www.npmjs.com/package/cors) to configure the necessary headers for cross-site communication.
