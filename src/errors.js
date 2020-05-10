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

export class InvalidInputError extends UserError {
  constructor (message: string, fieldName: string) {
    super(message);

    this.code = 'INVALID_INPUT';
    this.fieldName = fieldName;
  }
}

export class NotFoundError extends UserError {
  constructor () {
    super('Resource not found.', 'RESOURCE_NOT_FOUND');
  }
}

export class AuthenticationError extends UserError {
  constructor () {
    super('Visitor is not authenticated.', 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends UserError {
  constructor () {
    super('User is not authorized to access the requested content.', 'AUTHORIZATION_ERROR');
  }
}

export class TimeoutError extends UserError {
  constructor () {
    super('Operation timed out.', 'TIMEOUT');
  }
}
