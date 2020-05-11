// @flow

import test from 'ava';
import sinon from 'sinon';
import express from 'express';
import got from 'got';
import createTusMiddleware from '../../../src/factories/createTusMiddleware';
import createHttpServerWithRandomPort from '../../helpers/createHttpServerWithRandomPort';

test('empty POST creates a new upload resource', async (t) => {
  const app = express();

  app.use(createTusMiddleware({
    createUid: () => {
      return 'foo';
    },
  }));

  const server = await createHttpServerWithRandomPort(app);

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
  const app = express();

  app.use(createTusMiddleware({
    basePath: '/foo',
    createUid: () => {
      return 'bar';
    },
  }));

  const server = await createHttpServerWithRandomPort(app);

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

test('upload-defer-length produces 501 (not implemented)', async (t) => {
  const app = express();

  app.use(createTusMiddleware({}));

  const server = await createHttpServerWithRandomPort(app);

  const response = await got(server.url, {
    headers: {
      'tus-resumable': '1.0.0',
      'upload-defer-length': '1',
    },
    method: 'POST',
    throwHttpErrors: false,
  });

  t.is(response.statusCode, 501);
  t.is(response.body, 'Not Implemented');
});

test('createUpload is called with the original incomingMessage', async (t) => {
  const app = express();

  const createUpload = sinon.stub().returns(null);

  app.use(createTusMiddleware({
    createUpload,
  }));

  const server = await createHttpServerWithRandomPort(app);

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
  const app = express();

  const createUpload = sinon.stub().returns(null);

  app.use(createTusMiddleware({
    createUpload,
  }));

  const server = await createHttpServerWithRandomPort(app);

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
  const app = express();

  const createUpload = sinon.stub().returns(null);

  app.use(createTusMiddleware({
    createUpload,
  }));

  const server = await createHttpServerWithRandomPort(app);

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
  const app = express();

  app.use(createTusMiddleware({}));

  const server = await createHttpServerWithRandomPort(app);

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
  const app = express();

  app.use(createTusMiddleware({
    getUpload: () => {
      return {
        uploadOffset: 0,
      };
    },
  }));

  const server = await createHttpServerWithRandomPort(app);

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
  const app = express();

  app.use(createTusMiddleware({
    getUpload: () => {
      return {
        uploadOffset: 0,
      };
    },
  }));

  const server = await createHttpServerWithRandomPort(app);

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
  const app = express();

  app.use(createTusMiddleware({
    getUpload: () => {
      return null;
    },
  }));

  const server = await createHttpServerWithRandomPort(app);

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
  const app = express();

  app.use(createTusMiddleware({
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
  }));

  const server = await createHttpServerWithRandomPort(app);

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
