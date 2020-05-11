// @flow

import {
  UserError,
} from '../errors';

export default (header: string): number => {
  if (!/^\s*\d\s*$/.test(header)) {
    throw new UserError('upload-offset header value must be an integer.');
  }

  const uploadOffset = parseInt(header, 10);

  if (uploadOffset < 0) {
    throw new UserError('upload-offset must be a positive integer.');
  }

  return uploadOffset;
};
