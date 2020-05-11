// @flow

import test from 'ava';
import express from 'express';
import got from 'got';
import createTusMiddleware from '../../../src/factories/createTusMiddleware';
import createHttpServerWithRandomPort from '../../helpers/createHttpServerWithRandomPort';

test('OPTIONS successful response produces 204', async (t) => {
  const app = express();

  app.use(createTusMiddleware({}));

  const server = await createHttpServerWithRandomPort(app);

  const response = await got(server.url, {
    method: 'OPTIONS',
  });

  t.is(response.statusCode, 204);
  t.is(response.body, '');
});

test('OPTIONS describes tus-version', async (t) => {
  const app = express();

  app.use(createTusMiddleware({}));

  const server = await createHttpServerWithRandomPort(app);

  const response = await got(server.url, {
    method: 'OPTIONS',
  });

  t.is(response.headers['tus-version'], '1.0.0');
});

test('OPTIONS describes tus-extension', async (t) => {
  const app = express();

  app.use(createTusMiddleware({}));

  const server = await createHttpServerWithRandomPort(app);

  const response = await got(server.url, {
    method: 'OPTIONS',
  });

  t.is(response.headers['tus-extension'], 'creation, creation-with-upload, termination');
});

// @todo It MAY include Tus-Max-Size headers.

