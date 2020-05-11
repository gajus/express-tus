// @flow

import {
  UserError,
} from '../errors';

export default (header: string): number => {
  if (!/^\s*\d\s*$/.test(header)) {
    throw new UserError('upload-length header value must be an integer.');
  }

  const uploadLength = parseInt(header, 10);

  if (uploadLength < 0) {
    throw new UserError('upload-length must be a positive integer.');
  }

  return uploadLength;
};
