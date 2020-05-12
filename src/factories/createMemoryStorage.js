// @flow

import {
  NotFoundError,
} from '../errors';
import type {
  StorageType,
} from '../types';

type ConfigurationType = {|
  +storage?: Object,
|};

export default (configuration?: ConfigurationType): StorageType => {
  const storage = configuration && configuration.storage || {};

  const getUpload = (uid) => {
    const upload = storage[uid];

    if (upload) {
      return upload;
    }

    throw new NotFoundError();
  };

  const formatUpload = (upload) => {
    return {
      uploadLength: upload.uploadLength,
      uploadMetadata: upload.uploadMetadata,
      uploadOffset: upload.uploadOffset,
    };
  };

  return {
    createUpload: async (input) => {
      storage[input.uid] = {
        buffer: Buffer.alloc(input.uploadLength),
        uploadLength: input.uploadLength,
        uploadMetadata: input.uploadMetadata || {},
        uploadOffset: 0,
      };

      return formatUpload(getUpload(input.uid));
    },
    getUpload: (uid) => {
      return formatUpload(getUpload(uid));
    },
    upload: (input) => {
      return new Promise((resolve, reject) => {
        const upload = getUpload(input.uid);

        input.incomingMessage.on('data', (buffer) => {
          buffer.copy(
            upload.buffer,
            upload.uploadOffset,
          );

          upload.uploadOffset += buffer.length;
        });

        input.incomingMessage.on('end', () => {
          resolve(formatUpload(getUpload(input.uid)));
        });

        input.incomingMessage.on('error', (error) => {
          reject(error);
        });
      });
    },
  };
};
