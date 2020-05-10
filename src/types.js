// @flow

/* eslint-disable import/exports-last, no-use-before-define */

import type {
  DatabasePoolType,
} from 'slonik';

export type {
  DatabaseConnectionType,
  DatabasePoolType,
} from 'slonik';

export type DatabaseRecordIdType = number;

export type ContextType = {

  // eslint-disable-next-line flowtype/no-weak-types
  authorization: Object,
  userAccountId: number | null,
  ...
};
