// @flow

import parseUploadMetadataHeader from './parseUploadMetadataHeader';

export default (subject: string): boolean => {
  try {
    parseUploadMetadataHeader(subject);

    return true;
  } catch (error) {
    return false;
  }
};
