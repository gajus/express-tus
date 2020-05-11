// @flow

import test from 'ava';
import sinon from 'sinon';
import got from 'got';
import createTestServer from '../helpers/createTestServer';

test('OPTIONS successful response produces 204', async (t) => {
  const server = await createTestServer({});

  const response = await got(server.url, {
    method: 'OPTIONS',
  });

  t.is(response.statusCode, 204);
  t.is(response.body, '');
});

test('OPTIONS describes tus-version', async (t) => {
  const server = await createTestServer({});

  const response = await got(server.url, {
    method: 'OPTIONS',
  });

  t.is(response.headers['tus-version'], '1.0.0');
});

test('OPTIONS describes tus-extension', async (t) => {
  const server = await createTestServer({});

  const response = await got(server.url, {
    method: 'OPTIONS',
  });

  t.is(response.headers['tus-extension'], 'creation, creation-with-upload, termination');
});

test('empty POST creates a new upload resource', async (t) => {
  const server = await createTestServer({
    createUid: () => {
      return 'foo';
    },
  });

  const response = await got(server.url, {
    headers: {
      'tus-resumable': '1.0.0',
      'upload-length': '100',
    },
    method: 'POST',
  });

  t.is(response.headers.location, '/foo');
  t.is(response.statusCode, 201);
  t.is(response.body, '');
});

test('location is resolved using base-path configuration', async (t) => {
  const server = await createTestServer({
    basePath: '/foo',
    createUid: () => {
      return 'bar';
    },
  });

  const response = await got(server.url, {
    headers: {
      'tus-resumable': '1.0.0',
      'upload-length': '100',
    },
    method: 'POST',
  });

  t.is(response.headers.location, '/foo/bar');
  t.is(response.statusCode, 201);
  t.is(response.body, '');
});

test('x-http-method-override produces 501 (not implemented)', async (t) => {
  const server = await createTestServer({});

  const response = await got(server.url, {
    headers: {
      'tus-resumable': '1.0.0',
      'x-http-method-override': 'PATCH',
    },
    throwHttpErrors: false,
  });

  t.is(response.statusCode, 501);
  t.is(response.body, 'Not implemented.');
});

test('upload-defer-length produces 501 (not implemented)', async (t) => {
  const server = await createTestServer({});

  const response = await got(server.url, {
    headers: {
      'tus-resumable': '1.0.0',
      'upload-defer-length': '1',
    },
    method: 'POST',
    throwHttpErrors: false,
  });

  t.is(response.statusCode, 501);
  t.is(response.body, 'Not implemented.');
});

test('createUpload is called with the original incomingMessage', async (t) => {
  const createUpload = sinon.stub().returns(null);

  const server = await createTestServer({
    createUpload,
  });

  await got(server.url, {
    headers: {
      foo: 'bar',
      'tus-resumable': '1.0.0',
      'upload-length': '100',
    },
    method: 'POST',
  });

  t.is(createUpload.firstCall.firstArg.incomingMessage.headers.foo, 'bar');
  t.is(createUpload.firstCall.firstArg.incomingMessage.url, '/');
});

test('createUpload is called with the original upload-metadata', async (t) => {
  const createUpload = sinon.stub().returns(null);

  const server = await createTestServer({
    createUpload,
  });

  await got(server.url, {
    headers: {
      foo: 'bar',
      'tus-resumable': '1.0.0',
      'upload-length': '100',
      'upload-metadata': 'foo YmFy, baz cXV4',
    },
    method: 'POST',
  });

  t.deepEqual(createUpload.firstCall.firstArg.uploadMetadata, {
    baz: 'qux',
    foo: 'bar',
  });
});

test('createUpload is called with the original upload-length', async (t) => {
  const createUpload = sinon.stub().returns(null);

  const server = await createTestServer({
    createUpload,
  });

  await got(server.url, {
    headers: {
      foo: 'bar',
      'tus-resumable': '1.0.0',
      'upload-length': '100',
    },
    method: 'POST',
  });

  t.is(createUpload.firstCall.firstArg.uploadLength, 100);
});

test('PATCH request with unsupported content-type produces 415', async (t) => {
  const server = await createTestServer({});

  const response = await got(server.url + '/foo', {
    headers: {
      'content-type': 'application/json',
      'tus-resumable': '1.0.0',
      'upload-length': '100',
    },
    method: 'PATCH',
    throwHttpErrors: false,
  });

  t.is(response.statusCode, 415);
});

test('PATCH with an unexpected upload-offset produces 409 conflict', async (t) => {
  const server = await createTestServer({
    getUpload: () => {
      return {
        uploadOffset: 0,
      };
    },
  });

  const response = await got(server.url + '/foo', {
    headers: {
      'content-type': 'application/offset+octet-stream',
      'tus-resumable': '1.0.0',
      'upload-length': '100',
      'upload-offset': '50',
    },
    method: 'PATCH',
    throwHttpErrors: false,
  });

  t.is(response.statusCode, 409);
});

test('produces 400 if PATCH request is made without upload-offset', async (t) => {
  const server = await createTestServer({
    getUpload: () => {
      return {
        uploadOffset: 0,
      };
    },
  });

  const response = await got(server.url + '/foo', {
    headers: {
      'content-type': 'application/offset+octet-stream',
      'tus-resumable': '1.0.0',
      'upload-length': '100',
    },
    method: 'PATCH',
    throwHttpErrors: false,
  });

  t.is(response.statusCode, 400);
});

test('produces 404 upload cannot be found', async (t) => {
  const server = await createTestServer({
    getUpload: () => {
      return null;
    },
  });

  const response = await got(server.url + '/foo', {
    headers: {
      'content-type': 'application/offset+octet-stream',
      'tus-resumable': '1.0.0',
      'upload-length': '100',
      'upload-offset': '0',
    },
    method: 'PATCH',
    throwHttpErrors: false,
  });

  t.is(response.statusCode, 404);
});

test('successful PATCH produces 204', async (t) => {
  const server = await createTestServer({
    getUpload: () => {
      return {
        uploadOffset: 0,
      };
    },
    upload: () => {
      return {
        uploadOffset: 100,
      };
    },
  });

  const response = await got(server.url + '/foo', {
    headers: {
      'content-type': 'application/offset+octet-stream',
      'tus-resumable': '1.0.0',
      'upload-length': '100',
      'upload-offset': '0',
    },
    method: 'PATCH',
  });

  t.is(response.statusCode, 204);
});

test('unsuccessful HEAD produces 404', async (t) => {
  const server = await createTestServer({
    getUpload: () => {
      return null;
    },
  });

  const response = await got(server.url + '/foo', {
    headers: {
      'tus-resumable': '1.0.0',
    },
    method: 'HEAD',
    throwHttpErrors: false,
  });

  t.is(response.statusCode, 404);
});

test('successful HEAD produces 200', async (t) => {
  const server = await createTestServer({
    getUpload: () => {
      return {
        uploadLength: 100,
        uploadOffset: 100,
      };
    },
  });

  const response = await got(server.url + '/foo', {
    headers: {
      'tus-resumable': '1.0.0',
    },
    method: 'HEAD',
  });

  t.is(response.statusCode, 200);
});

test('successful HEAD describes upload-length', async (t) => {
  const server = await createTestServer({
    getUpload: () => {
      return {
        uploadLength: 100,
        uploadOffset: 50,
      };
    },
  });

  const response = await got(server.url + '/foo', {
    headers: {
      'tus-resumable': '1.0.0',
    },
    method: 'HEAD',
  });

  t.is(response.headers['upload-length'], '100');
});

test('successful HEAD describes upload-offset', async (t) => {
  const server = await createTestServer({
    getUpload: () => {
      return {
        uploadLength: 100,
        uploadOffset: 50,
      };
    },
  });

  const response = await got(server.url + '/foo', {
    headers: {
      'tus-resumable': '1.0.0',
    },
    method: 'HEAD',
  });

  t.is(response.headers['upload-offset'], '50');
});
