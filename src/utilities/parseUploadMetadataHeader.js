// @flow

import isBase64 from 'is-base64';
import {
  UserError,
} from '../errors';
import type {
  UploadMetadataType,
} from '../types';

export default (header: string): UploadMetadataType => {
  const pairs = header.split(',');

  const uploadMetadata: Object = {};

  for (const pair of pairs) {
    const tokens = pair
      .trim()
      .split(' ');

    if (tokens.length > 2) {
      throw new UserError('Each upload-metadata key-value pair must have at most 1 space separating key and value.');
    }

    const key = tokens[0];

    if (uploadMetadata[key]) {
      throw new UserError('upload-metadata key must be unique.');
    }

    let value;

    if (!tokens[1]) {
      value = '';
    } else if (isBase64(tokens[1])) {
      value = Buffer.from(tokens[1], 'base64').toString();
    } else {
      throw new UserError('upload-metadata value must be base64 encoded.');
    }

    uploadMetadata[key] = value;
  }

  return uploadMetadata;
};
