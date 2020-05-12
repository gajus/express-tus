// @flow

import {
  PassThrough,
} from 'stream';
import test from 'ava';
import createMemoryStorage from '../../../src/factories/createMemoryStorage';

test('createUpload creates an empty upload', async (t) => {
  const storage = {};

  const memoryStorage = createMemoryStorage({
    storage,
  });

  const upload = await memoryStorage.createUpload({
    uid: 'foo',
    uploadLength: 100,
  });

  t.true(storage.foo.buffer.equals(Buffer.alloc(100)));

  t.deepEqual(upload, {
    uploadLength: 100,
    uploadOffset: 0,
  });
});

test('upload applies bytes contained in the incoming message at the given offset', async (t) => {
  const storage = {};

  const memoryStorage = createMemoryStorage({
    storage,
  });

  await memoryStorage.createUpload({
    uid: 'foo',
    uploadLength: 6,
  });

  const incomingMessage0 = new PassThrough();

  setTimeout(() => {
    incomingMessage0.emit('data', Buffer.from('bar'));
    incomingMessage0.end();
    incomingMessage0.destroy();
  }, 50);

  await memoryStorage.upload({
    incomingMessage: incomingMessage0,
    uid: 'foo',
    uploadOffset: 0,
  });

  t.deepEqual(await memoryStorage.getUpload('foo'), {
    uploadLength: 6,
    uploadOffset: 3,
  });

  const incomingMessage1 = new PassThrough();

  setTimeout(() => {
    incomingMessage1.emit('data', Buffer.from('baz'));
    incomingMessage1.end();
    incomingMessage1.destroy();
  }, 50);

  await memoryStorage.upload({
    incomingMessage: incomingMessage1,
    uid: 'foo',
    uploadOffset: 3,
  });

  t.deepEqual(await memoryStorage.getUpload('foo'), {
    uploadLength: 6,
    uploadOffset: 6,
  });
});
