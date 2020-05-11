## express-tus

[Express](https://expressjs.com/) middleware for [tus protocol](https://tus.io/) (v1.0.0).

## Motivation

Conceptually, [tus](https://tus.io/) is a great initiative. However, the existing implementations are lacking:

* [tus-node-server](https://github.com/tus/tus-node-server) has a big warning stating that usage should be discouraged in favour of tusd.
* [tusd](https://github.com/tus/tusd) has bugs and opinionated limitations (just browse [issues](https://github.com/tus/tusd/issues)).

`express-tus` provides a high-level abstraction that implements tus protocol, but leaves the actual handling of uploads to the implementer. This approach has the benefit of granular control over the file uploads while being compatible with the underlying (tus) protocol.

## API

```js
import {
  createTusMiddleware,
} from 'express-tus';

/**
 * @properties basePath Path to where the tus middleware is mounted. Used for redirects.
 * @properties createUid Generates unique identifier for each upload request. Defaults to UUID v4.
 * @properties createUpload Approves (null result) or rejects (RejectionResponseType result) file upload.
 * @properties getUpload Retrieves progress information about an existing upload.
 */
type ConfigurationType = {|
  +basePath?: string,
  +createUid?: () => MaybePromiseType<string>,
  +createUpload?: (input: UploadInputType) => MaybePromiseType<RejectionResponseType | null>,
  +getUpload: (uid: string) => UploadType,
|};

createTusMiddleware(configuration: ConfigurationType);

```
