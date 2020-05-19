// @flow

import {
  resolve as resolveUrl,
} from 'url';
import test from 'ava';
import got from 'got';
import cloneBuffer from 'clone-buffer';
import createMemoryStorage from '../../src/factories/createMemoryStorage';
import createTestServer from '../helpers/createTestServer';

test('uploads file', async (t) => {
  const storage = {};

  const server = await createTestServer({
    ...createMemoryStorage({
      storage,
    }),
    createUid: () => {
      return 'foo';
    },
  });

  const response0 = await got(server.url, {
    headers: {
      'tus-resumable': '1.0.0',
      'upload-length': '3',
    },
    method: 'POST',
    responseType: 'json',
  });

  const response1 = await got(resolveUrl(server.url, response0.headers.location), {
    body: Buffer.from('bar'),
    headers: {
      'content-type': 'application/offset+octet-stream',
      'tus-resumable': '1.0.0',
      'upload-length': '3',
      'upload-offset': '0',
    },
    method: 'PATCH',
  });

  t.is(response1.statusCode, 204);
  t.is(response1.headers['upload-offset'], '3');

  t.is(storage.foo.uploadLength, 3);
  t.is(storage.foo.uploadOffset, 3);

  t.true(storage.foo.buffer.equals(Buffer.from('bar')));
});

test('uploads file (multiple patch requests)', async (t) => {
  const storage = {};

  const server = await createTestServer({
    ...createMemoryStorage({
      storage,
    }),
    createUid: () => {
      return 'foo';
    },
  });

  const response0 = await got(server.url, {
    headers: {
      'tus-resumable': '1.0.0',
      'upload-length': '6',
    },
    method: 'POST',
  });

  await got(resolveUrl(server.url, response0.headers.location), {
    body: Buffer.from('bar'),
    headers: {
      'content-type': 'application/offset+octet-stream',
      'tus-resumable': '1.0.0',
      'upload-length': '3',
      'upload-offset': '0',
    },
    method: 'PATCH',
  });

  const response2 = await got(resolveUrl(server.url, response0.headers.location), {
    body: Buffer.from('baz'),
    headers: {
      'content-type': 'application/offset+octet-stream',
      'tus-resumable': '1.0.0',
      'upload-length': '3',
      'upload-offset': '3',
    },
    method: 'PATCH',
  });

  t.is(response2.statusCode, 204);
  t.is(response2.headers['upload-offset'], '6');

  t.is(storage.foo.uploadLength, 6);
  t.is(storage.foo.uploadOffset, 6);

  t.true(storage.foo.buffer.equals(Buffer.from('barbaz')));
});

test('does not modify source (wrong offset)', async (t) => {
  const storage = {};

  const server = await createTestServer({
    ...createMemoryStorage({
      storage,
    }),
    createUid: () => {
      return 'foo';
    },
  });

  const response0 = await got(server.url, {
    headers: {
      'tus-resumable': '1.0.0',
      'upload-length': '6',
    },
    method: 'POST',
  });

  await got(resolveUrl(server.url, response0.headers.location), {
    body: Buffer.from('bar'),
    headers: {
      'content-type': 'application/offset+octet-stream',
      'tus-resumable': '1.0.0',
      'upload-length': '3',
      'upload-offset': '0',
    },
    method: 'PATCH',
  });

  const buffer = cloneBuffer(storage.foo.buffer);

  const response2 = await got(resolveUrl(server.url, response0.headers.location), {
    body: Buffer.from('baz'),
    headers: {
      'content-type': 'application/offset+octet-stream',
      'tus-resumable': '1.0.0',
      'upload-length': '3',
      'upload-offset': '1',
    },
    method: 'PATCH',
    throwHttpErrors: false,
  });

  t.is(response2.statusCode, 409);

  t.is(storage.foo.uploadLength, 6);
  t.is(storage.foo.uploadOffset, 3);

  t.true(storage.foo.buffer.equals(buffer));
});
