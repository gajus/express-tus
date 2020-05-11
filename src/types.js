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

export type RejectionResponseType = {|
  +body: string,
  +headers: HeadersType,
  +statusCode: number,
|};

type MaybePromiseType<T> = Promise<T> | T;

export type UploadType = {|
  +uploadLength: number,
  +uploadOffset: number,
|};

export type ConfigurationInputType = {|
  +upload: (uid: string, uploadOffset: number, incomingMessage: IncomingMessageType) => Promise<UploadType>,
  +basePath?: string,
  +createUid?: () => MaybePromiseType<string>,
  +createUpload?: (input: UploadInputType) => MaybePromiseType<RejectionResponseType | null>,
  +getUpload: (uid: string) => MaybePromiseType<UploadType>,
|};

export type ConfigurationType = {|
  +upload: (uid: string, uploadOffset: number, incomingMessage: IncomingMessageType) => Promise<UploadType>,
  +basePath: string,
  +createUid: () => MaybePromiseType<string>,
  +createUpload: (input: UploadInputType) => MaybePromiseType<RejectionResponseType | null>,
  +getUpload: (uid: string) => MaybePromiseType<UploadType>,
|};
