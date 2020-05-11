// @flow

import test from 'ava';
import got from 'got';
import createTestServer from '../../helpers/createTestServer';

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

// @todo It MAY include Tus-Max-Size headers.

