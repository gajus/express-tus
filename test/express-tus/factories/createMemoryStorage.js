// @flow

import fs from 'fs';
import {
  tmpNameSync,
} from 'tmp';
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
    uploadMetadata: {},
    uploadOffset: 0,
  });
});

const createChunk = (buffer) => {
  const temporaryFileName = tmpNameSync();

  fs.writeFileSync(temporaryFileName, buffer);

  return temporaryFileName;
};

test('upload applies bytes contained in the incoming message at the given offset', async (t) => {
  const storage = {};

  const memoryStorage = createMemoryStorage({
    storage,
  });

  await memoryStorage.createUpload({
    uid: 'foo',
    uploadLength: 6,
  });

  await memoryStorage.upload({
    filePath: createChunk(Buffer.from('bar')),
    uid: 'foo',
    uploadOffset: 0,
  });

  t.deepEqual(await memoryStorage.getUpload('foo'), {
    uploadLength: 6,
    uploadMetadata: {},
    uploadOffset: 3,
  });

  await memoryStorage.upload({
    filePath: createChunk(Buffer.from('bar')),
    uid: 'foo',
    uploadOffset: 3,
  });

  t.deepEqual(await memoryStorage.getUpload('foo'), {
    uploadLength: 6,
    uploadMetadata: {},
    uploadOffset: 6,
  });
});
