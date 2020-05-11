// @flow

import {
  resolve as resolveUrl,
} from 'url';
import createRouter from 'express-promise-router';
import type {
  ConfigurationInputType,
} from '../types';
import {
  parseUploadLengthHeader,
  parseUploadMetadataHeader,
  parseUploadOffsetHeader,
} from '../utilities';
import createConfiguration from './createConfiguration';

export default (configurationInput: ConfigurationInputType) => {
  const configuration = createConfiguration(configurationInput);

  const router = createRouter();

  router.use('/', (incomingMessage, outgoingMessage, next) => {
    outgoingMessage.set({
      'access-control-allow-headers': 'authorization, content-type, origin, tus-resumable, upload-concat,, upload-defer-length, upload-length, upload-metadata, upload-offset, x-http-method-override, x-request-id, x-requested-with',
      'access-control-expose-headers': 'location, tus-extension, tus-max-size, tus-resumable, tus-version, upload-concat, upload-defer-length, upload-length, upload-metadata, upload-offset',
      'cache-control': 'no-store',
      connection: 'close',
      'tus-extension': 'creation, creation-with-upload, termination',
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

    const maybeRejectionResponse = await configuration.createUpload({
      incomingMessage: {
        headers: incomingMessage.headers,
        url: incomingMessage.url,
      },
      uploadLength,
      uploadMetadata,
    });

    if (maybeRejectionResponse) {
      outgoingMessage
        .set(maybeRejectionResponse.headers)
        .status(maybeRejectionResponse.statusCode)
        .end(maybeRejectionResponse.body);

      return;
    }

    outgoingMessage
      .set({
        location: resolveUrl(configuration.basePath.replace(/\/$/g, '') + '/', await configuration.createUid()),
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

    const upload = await configuration.getUpload(incomingMessage.params.uid);

    if (!upload) {
      outgoingMessage
        .status(404)
        .end('Upload not found.');

      return;
    }

    if (upload.uploadOffset !== uploadOffset) {
      outgoingMessage
        .status(409)
        .end('Conflict.');

      return;
    }

    const nextUpload = await configuration.upload(
      incomingMessage.params.uid,
      upload.uploadOffset,
      incomingMessage,
    );

    outgoingMessage
      .set({
        'upload-offset': nextUpload.uploadOffset,
      })
      .status(204)
      .end();
  });

  router.head('/:uid', async (incomingMessage, outgoingMessage) => {
    const upload = await configuration.getUpload(incomingMessage.params.uid);

    if (!upload) {
      outgoingMessage
        .status(404)
        .end('Upload not found.');

      return;
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
