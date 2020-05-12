// @flow

import {
  v4 as uuid,
} from 'uuid';
import {
  NotFoundError,
} from '../errors';
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

  if (input.formatErrorResponse) {
    configuration.formatErrorResponse = input.formatErrorResponse;
  } else {
    configuration.formatErrorResponse = (error) => {
      if (error instanceof NotFoundError) {
        return {
          body: 'Resource not found.',
          headers: {},
          statusCode: 404,
        };
      }

      return {
        body: 'Request cannot be processed.',
        headers: {},
        statusCode: 400,
      };
    };
  }

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
