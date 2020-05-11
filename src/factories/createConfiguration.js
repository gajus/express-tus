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
    getUpload: input.getUpload,
    upload: input.upload,
  };

  configuration.basePath = input.basePath || '/';

  if (input.createUid) {
    configuration.createUid = input.createUid;
  } else {
    configuration.createUid = uuid;
  }

  if (input.createUpload) {
    configuration.createUpload = input.createUpload;
  } else {
    configuration.createUpload = () => {
      return null;
    };
  }

  return configuration;
};
