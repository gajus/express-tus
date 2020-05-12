// @flow

import {
  resolve as resolveUrl,
} from 'url';
import {
  serializeError,
} from 'serialize-error';
import createRouter from 'express-promise-router';
import type {
  ConfigurationInputType,
} from '../types';
import {
  formatUploadMetadataHeader,
  parseUploadLengthHeader,
  parseUploadMetadataHeader,
  parseUploadOffsetHeader,
} from '../utilities';
import Logger from '../Logger';
import createConfiguration from './createConfiguration';

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

const SUPPORTED_EXTENSIONS = [
  'creation',
  'termination',
];

const log = Logger.child({
  namespace: 'createTusMiddleware',
});

const respond = (outgoingMessage, response) => {
  outgoingMessage
    .set(response.headers)
    .status(response.statusCode)
    .end(response.body);
};

export default (configurationInput: ConfigurationInputType) => {
  const configuration = createConfiguration(configurationInput);

  const router = createRouter();

  router.use('/', (incomingMessage, outgoingMessage, next) => {
    outgoingMessage.set({
      'access-control-allow-headers': ALLOW_HEADERS.join(', '),
      'access-control-expose-headers': EXPOSE_HEADERS.join(', '),
      'cache-control': 'no-store',
      connection: 'close',
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

      respond(
        outgoingMessage,
        configuration.formatErrorResponse(error),
      );

      return;
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

      respond(
        outgoingMessage,
        configuration.formatErrorResponse(error),
      );

      return;
    }

    if (upload.uploadOffset !== uploadOffset) {
      outgoingMessage
        .status(409)
        .end('Conflict.');

      return;
    }

    let nextUpload;

    try {
      nextUpload = await configuration.upload({
        incomingMessage,
        uid: incomingMessage.params.uid,
        uploadOffset: upload.uploadOffset,
      });
    } catch (error) {
      log.error({
        error: serializeError(error),
      }, 'upload rejected');

      respond(
        outgoingMessage,
        configuration.formatErrorResponse(error),
      );

      return;
    }

    outgoingMessage
      .set({
        'upload-offset': nextUpload.uploadOffset,
      })
      .status(204)
      .end();
  });

  router.delete('/:uid', async (incomingMessage, outgoingMessage) => {
    try {
      await configuration.delete(incomingMessage.params.uid);
    } catch (error) {
      console.log('>>>');
      log.error({
        error: serializeError(error),
      }, 'upload not found');

      respond(
        outgoingMessage,
        configuration.formatErrorResponse(error),
      );

      return;
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

      respond(
        outgoingMessage,
        configuration.formatErrorResponse(error),
      );

      return;
    }

    if (upload.uploadMetadata) {
      outgoingMessage.set('upload-metadata', formatUploadMetadataHeader(upload.uploadMetadata));
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
