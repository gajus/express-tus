// @flow

/* eslint-disable fp/no-class, fp/no-this */

import ExtendableError from 'es6-error';

export class UnexpectedStateError extends ExtendableError {
  code: string;

  constructor (message: string, code: string = 'UNEXPECTED_STATE_ERROR') {
    super(message);

    this.code = code;
  }
}

export class UnimplementedError extends UnexpectedStateError {
  constructor () {
    super('Functionality is not implemented.', 'UNIMPLEMENTED');
  }
}

export class UserError extends ExtendableError {
  code: string;

  constructor (message: string, code: string = 'USER_ERROR') {
    super(message);

    this.code = code;
  }
}
