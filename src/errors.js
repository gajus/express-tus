// @flow

/* eslint-disable fp/no-class, fp/no-this */

import ExtendableError from 'es6-error';

export class ExpressTusError extends ExtendableError {}

export class UnexpectedStateError extends ExpressTusError {
  code: string;

  constructor (message: string, code: string = 'UNEXPECTED_STATE_ERROR') {
    super(message);

    this.code = code;
  }
}

export class UserError extends ExpressTusError {
  code: string;

  constructor (message: string, code: string = 'USER_ERROR') {
    super(message);

    this.code = code;
  }
}

export class NotFoundError extends UserError {
  constructor () {
    super('Resource not found.', 'RESOURCE_NOT_FOUND');
  }
}
