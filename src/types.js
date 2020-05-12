// @flow

/* eslint-disable import/exports-last */

import {
  IncomingMessage as HttpIncomingMessage,
} from 'http';
import {
  IncomingMessage as HttpsIncomingMessage,
} from 'https';

export type UploadMetadataType = {|
  +[key: string]: string,
|};

type HeadersType = {|
  +[key: string]: string,
|};

export type IncomingMessageType = HttpIncomingMessage | HttpsIncomingMessage;

export type UploadInputType = {|
  +incomingMessage: IncomingMessageType,
  +uid: string,
  +uploadLength: number,
  +uploadMetadata: UploadMetadataType,
|};

export type UploadUpdateInputType = {|
  +incomingMessage: IncomingMessageType,
  +uid: string,
  +uploadOffset: number,
|};

export type ResponseType = {|
  +body: string,
  +headers: HeadersType,
  +statusCode: number,
|};

type MaybePromiseType<T> = Promise<T> | T;

export type UploadType = {|
  +uploadLength: number,
  +uploadOffset: number,
|};

export type StorageType = {|
  +upload: (input: UploadUpdateInputType) => MaybePromiseType<UploadType>,
  +createUpload: (input: UploadInputType) => MaybePromiseType<UploadType>,
  +getUpload: (uid: string) => MaybePromiseType<UploadType>,
|};

export type ConfigurationInputType = {|
  +basePath?: string,
  +createUid?: () => MaybePromiseType<string>,
  +createUpload?: (input: UploadInputType) => MaybePromiseType<UploadType>,
  +formatErrorResponse?: (error: Error) => ResponseType,
  +getUpload: (uid: string) => MaybePromiseType<UploadType>,
  +upload: (input: UploadUpdateInputType) => MaybePromiseType<UploadType>,
|};

export type ConfigurationType = {|
  +basePath: string,
  +createUid: () => MaybePromiseType<string>,
  +formatErrorResponse: (error: Error) => ResponseType,
  ...StorageType,
|};
