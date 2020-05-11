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

type IncomingMessageType = HttpIncomingMessage | HttpsIncomingMessage;

type ShallowIncomingMessageType = {|
  +headers: HeadersType,
  +url: string,
|};

type UploadInputType = {|
  +incomingMessage: ShallowIncomingMessageType,
  +uploadMetadata: UploadMetadataType,
  +uploadLength: number,
|};

type RejectionResponseType = {|
  +body: string,
  +headers: HeadersType,
  +statusCode: number,
|};

type MaybePromiseType<T> = Promise<T> | T;

type UploadType = {|
  +uploadLength: number,
  +uploadOffset: number,
|};

export type ConfigurationInputType = {|
  +upload: (uid: string, uploadOffset: number, incomingMessage: IncomingMessageType) => Promise<UploadType>,
  +basePath?: string,
  +createUid?: () => MaybePromiseType<string>,
  +createUpload?: (input: UploadInputType) => MaybePromiseType<RejectionResponseType | null>,
  +getUpload: (uid: string) => UploadType,
|};

export type ConfigurationType = {|
  +upload: (uid: string, uploadOffset: number, incomingMessage: IncomingMessageType) => Promise<UploadType>,
  +basePath: string,
  +createUid: () => MaybePromiseType<string>,
  +createUpload: (input: UploadInputType) => MaybePromiseType<RejectionResponseType | null>,
  +getUpload: (uid: string) => UploadType,
|};
