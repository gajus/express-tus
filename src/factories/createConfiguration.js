// @flow

import {
  v4 as uuid,
} from 'uuid';
import type {
  ConfigurationInputType,
  ConfigurationType,
} from '../types';

export default (input: ConfigurationInputType): ConfigurationType => {
  const configuration: Object = {
    createUpload: input.createUpload,
    delete: input.delete,
    getUpload: input.getUpload,
    upload: input.upload,
  };

  configuration.basePath = input.basePath || '/';

  if (input.createUid) {
    configuration.createUid = input.createUid;
  } else {
    configuration.createUid = uuid;
  }

  return configuration;
};
