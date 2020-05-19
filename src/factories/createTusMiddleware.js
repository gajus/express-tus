// @flow

import stream from 'stream';
import {
  promisify,
} from 'util';
import {
  createWriteStream,
} from 'fs';
import {
  createHash,
} from 'crypto';
import {
  resolve as resolveUrl,
} from 'url';
import {
  tmpNameSync,
} from 'tmp';
import {
  serializeError,
} from 'serialize-error';
import createRouter from 'express-promise-router';
import type {
  ConfigurationInputType,
} from '../types';
import {
  formatUploadMetadataHeader,
  parseUploadChecksumHeader,
  parseUploadLengthHeader,
  parseUploadMetadataHeader,
  parseUploadOffsetHeader,
} from '../utilities';
import Logger from '../Logger';
import createConfiguration from './createConfiguration';

const pipeline = promisify(stream.pipeline);

const ALLOW_HEADERS = [
  'authorization',
  'content-type',
  'origin',
  'tus-resumable',
  'upload-concat,',
  'upload-defer-length',
  'upload-length',
  'upload-metadata',
  'upload-offset',
  'x-http-method-override',
  'x-request-id',
  'x-requested-with',
];

const EXPOSE_HEADERS = [
  'location',
  'tus-checksum-algorithm',
  'tus-extension',
  'tus-max-size',
  'tus-resumable',
  'tus-version',
  'upload-concat',
  'upload-defer-length',
  'upload-length',
  'upload-metadata',
  'upload-offset',
];

const SUPPORTED_CHECKSUM_ALGORITHMS = [
  'crc32',
  'md5',
  'sha1',
  'sha256',
];

const SUPPORTED_EXTENSIONS = [
  'checksum',
  'creation',
  'expiration',
  'termination',
];

const log = Logger.child({
  namespace: 'createTusMiddleware',
});

export default (configurationInput: ConfigurationInputType) => {
  const configuration = createConfiguration(configurationInput);

  const router = createRouter();

  router.use('/', (incomingMessage, outgoingMessage, next) => {
    outgoingMessage.set({
      'access-control-allow-headers': ALLOW_HEADERS.join(', '),
      'access-control-expose-headers': EXPOSE_HEADERS.join(', '),
      'cache-control': 'no-store',
      connection: 'close',
      'tus-checksum-algorithm': SUPPORTED_CHECKSUM_ALGORITHMS.join(', '),
      'tus-extension': SUPPORTED_EXTENSIONS.join(', '),
      'tus-resumable': '1.0.0',
      'tus-version': '1.0.0',
      'x-content-type-options': 'nosniff',
    });

    if (incomingMessage.headers['x-http-method-override']) {
      outgoingMessage
        .status(501)
        .end('Not implemented.');

      return;
    }

    if (incomingMessage.method !== 'OPTIONS' && incomingMessage.headers['tus-resumable'] === undefined) {
      outgoingMessage
        .status(412)
        .end('tus-resumable header must be present.');

      return;
    }

    next();
  });

  router.post('/', async (incomingMessage, outgoingMessage) => {
    if (incomingMessage.headers['upload-defer-length']) {
      outgoingMessage
        .status(501)
        .end('Not implemented.');

      return;
    }

    if (!incomingMessage.headers['upload-length']) {
      outgoingMessage
        .status(400)
        .end();

      return;
    }

    const uploadLength = parseUploadLengthHeader(incomingMessage.headers['upload-length']);
    const uploadMetadata = parseUploadMetadataHeader(incomingMessage.headers['upload-metadata'] || '');

    const uid = await configuration.createUid();

    incomingMessage.tus = {
      uid,
    };

    try {
      await configuration.createUpload({
        incomingMessage,
        uid,
        uploadLength,
        uploadMetadata,
      });
    } catch (error) {
      log.error({
        error: serializeError(error),
      }, 'upload rejected');

      throw error;
    }

    const upload = await configuration.getUpload(uid);

    if (upload.uploadExpires) {
      outgoingMessage
        .set('upload-expires', new Date(upload.uploadExpires).toUTCString());
    }

    outgoingMessage
      .set({
        location: resolveUrl(configuration.basePath.replace(/\/$/g, '') + '/', uid),
      })
      .status(201)
      .end();
  });

  router.options('/', (incomingMessage, outgoingMessage) => {
    outgoingMessage
      .status(204)
      .end();
  });

  router.patch('/:uid', async (incomingMessage, outgoingMessage) => {
    if (incomingMessage.headers['content-type'] !== 'application/offset+octet-stream') {
      outgoingMessage
        .status(415)
        .end();

      return;
    }

    if (incomingMessage.headers['upload-offset'] === undefined) {
      outgoingMessage
        .status(400)
        .end('upload-offset must be present.');

      return;
    }

    const uploadOffset = parseUploadOffsetHeader(incomingMessage.headers['upload-offset']);

    let upload;

    try {
      upload = await configuration.getUpload(incomingMessage.params.uid);
    } catch (error) {
      log.error({
        error: serializeError(error),
      }, 'upload not found');

      throw error;
    }

    incomingMessage.tus = {
      uid: upload.uid,
    };

    if (upload.uploadOffset !== uploadOffset) {
      outgoingMessage
        .status(409)
        .end('Conflict.');

      return;
    }

    const temporaryFilePath = tmpNameSync();

    const temporaryFileStream = createWriteStream(temporaryFilePath);

    let chunkLength = 0;

    if (incomingMessage.headers['upload-checksum']) {
      const checksum = parseUploadChecksumHeader(incomingMessage.headers['upload-checksum']);

      if (!SUPPORTED_CHECKSUM_ALGORITHMS.includes(checksum.algorithm)) {
        outgoingMessage
          .status(400)
          .end('Unsupported checksum algorithm.');

        return;
      }

      const hash = createHash(checksum.algorithm);

      await pipeline(
        incomingMessage,
        async function *(chunks) {
          for await (const chunk of chunks) {
            chunkLength += chunk.length;

            hash.update(chunk);

            yield chunk;
          }
        },
        temporaryFileStream,
      );

      if (hash.digest('base64') !== checksum.checksum) {
        outgoingMessage
          .status(460)
          .end('Checksum mismatch.');

        return;
      }
    } else {
      await pipeline(
        incomingMessage,
        async function *(chunks) {
          for await (const chunk of chunks) {
            chunkLength += chunk.length;

            yield chunk;
          }
        },
        temporaryFileStream,
      );
    }

    try {
      await configuration.upload({
        chunkLength,
        filePath: temporaryFilePath,
        uid: incomingMessage.params.uid,
        uploadLength: upload.uploadLength,
        uploadOffset: upload.uploadOffset,
      });
    } catch (error) {
      log.error({
        error: serializeError(error),
      }, 'upload rejected');

      throw error;
    }

    upload = await configuration.getUpload(incomingMessage.params.uid);

    if (upload.uploadExpires) {
      outgoingMessage
        .set('upload-expires', new Date(upload.uploadExpires).toUTCString());
    }

    outgoingMessage
      .set({
        'upload-offset': upload.uploadOffset,
        'upload-uid': upload.uid,
      })
      .status(204)
      .end();
  });

  router.delete('/:uid', async (incomingMessage, outgoingMessage) => {
    let upload;

    try {
      upload = await configuration.getUpload(incomingMessage.params.uid);
    } catch (error) {
      log.error({
        error: serializeError(error),
      }, 'upload not found');

      throw error;
    }

    incomingMessage.tus = {
      uid: upload.uid,
    };

    try {
      await configuration.delete(incomingMessage.params.uid);
    } catch (error) {
      log.error({
        error: serializeError(error),
      }, 'upload cannot be deleted');

      throw error;
    }

    outgoingMessage
      .status(204)
      .end();
  });

  router.head('/:uid', async (incomingMessage, outgoingMessage) => {
    let upload;

    try {
      upload = await configuration.getUpload(incomingMessage.params.uid);
    } catch (error) {
      log.error({
        error: serializeError(error),
      }, 'upload not found');

      throw error;
    }

    incomingMessage.tus = {
      uid: upload.uid,
    };

    if (upload.uploadExpires) {
      outgoingMessage
        .set('upload-expires', new Date(upload.uploadExpires).toUTCString());
    }

    if (upload.uploadMetadata) {
      outgoingMessage
        .set('upload-metadata', formatUploadMetadataHeader(upload.uploadMetadata));
    }

    outgoingMessage
      .set({
        'upload-length': upload.uploadLength,
        'upload-offset': upload.uploadOffset,
      })
      .status(200)
      .end();
  });

  return router;
};
