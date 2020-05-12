// @flow

import type {
  UploadMetadataType,
} from '../types';

export default (uploadMetadata: UploadMetadataType): string => {
  const keys = Object
    .keys(uploadMetadata)
    .sort();

  const tokens = [];

  for (const key of keys) {
    const value = uploadMetadata[key];

    if (value) {
      tokens.push(key + ' ' + Buffer.from(uploadMetadata[key]).toString('base64'));
    } else {
      tokens.push(key);
    }
  }

  return tokens.join(', ');
};
