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

type ShallowIncomingMessageType = {|
  +headers: HeadersType,
  +url: string,
|};

type UploadInputType = {|
  +incomingMessage: ShallowIncomingMessageType,
  +uid: string,
  +uploadLength: number,
  +uploadMetadata: UploadMetadataType,
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
  +upload: (uid: string, uploadOffset: number, incomingMessage: IncomingMessageType) => Promise<UploadType>,
  +createUpload: (input: UploadInputType) => MaybePromiseType<UploadType>,
  +getUpload: (uid: string) => MaybePromiseType<UploadType>,
|};

export type ConfigurationInputType = {|
  +basePath?: string,
  +createUid?: () => MaybePromiseType<string>,
  +createUpload?: (input: UploadInputType) => MaybePromiseType<UploadType>,
  +formatErrorResponse?: (error: Error) => ResponseType,
  +getUpload: (uid: string) => MaybePromiseType<UploadType>,
  +upload: (uid: string, uploadOffset: number, incomingMessage: IncomingMessageType) => MaybePromiseType<UploadType>,
|};

export type ConfigurationType = {|
  +basePath: string,
  +createUid: () => MaybePromiseType<string>,
  +formatErrorResponse: (error: Error) => ResponseType,
  ...StorageType,
|};
