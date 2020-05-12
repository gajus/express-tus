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

/**
 * @property uploadExpires UNIX timestamp (in milliseconds) after which the upload will be deleted.
 * @property uploadLength Indicates the size of the entire upload in bytes.
 * @property uploadMetadata Key-value meta-data about the upload.
 * @property uploadOffset Indicates a byte offset within a resource.
 */
export type UploadType = {|
  +uploadExpires?: number,
  +uploadLength: number,
  +uploadMetadata: UploadMetadataType,
  +uploadOffset: number,
|};

/**
 * @property createUpload Approves file upload. Defaults to allowing all uploads.
 * @property delete Deletes upload.
 * @property getUpload Retrieves progress information about an existing upload.
 * @property upload Applies bytes contained in the incoming message at the given offset.
 */
export type StorageType = {|
  +createUpload: (input: UploadInputType) => MaybePromiseType<UploadType>,
  +delete: (uid: string) => MaybePromiseType<void>,
  +getUpload: (uid: string) => MaybePromiseType<UploadType>,
  +upload: (input: UploadUpdateInputType) => MaybePromiseType<UploadType>,
|};

/**
 * @property basePath Path to where the tus middleware is mounted. Used for redirects. Defaults to `/`.
 * @property createUid Generates unique identifier for each upload request. Defaults to UUID v4.
 * @property formatErrorResponse Formats HTTP response in case of an error.
 */
export type ConfigurationInputType = {|
  +basePath?: string,
  +createUid?: () => MaybePromiseType<string>,
  +formatErrorResponse?: (error: Error) => ResponseType,
  ...StorageType,
|};

export type ConfigurationType = {|
  +basePath: string,
  +createUid: () => MaybePromiseType<string>,
  +formatErrorResponse: (error: Error) => ResponseType,
  ...StorageType,
|};
