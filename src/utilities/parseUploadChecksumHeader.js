// @flow

import isBase64 from 'is-base64';
import {
  UserError,
} from '../errors';

type ChecksumType = {|
  +algorithm: string,
  +checksum: string,
|};

export default (header: string): ChecksumType => {
  const tokens = header.trim().split(' ');

  if (tokens.length !== 2) {
    throw new UserError('upload-checksum header must consist only of the name of the used checksum algorithm and the base64 encoded checksum separated by a space.');
  }

  if (!isBase64(tokens[1])) {
    throw new UserError('checksum must be base64 encoded.');
  }

  return {
    algorithm: tokens[0],
    checksum: tokens[1],
  };
};
