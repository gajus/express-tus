// @flow

import test from 'ava';
import parseUploadMetadataHeader from '../../../src/utilities/parseUploadMetadataHeader';

test('parses upload-metadata (one value)', (t) => {
  t.deepEqual(parseUploadMetadataHeader('foo YmFy'), {
    foo: 'bar',
  });
});

test('parses upload-metadata (multiple values)', (t) => {
  t.deepEqual(parseUploadMetadataHeader('foo YmFy, baz cXV4'), {
    baz: 'qux',
    foo: 'bar',
  });
});

test('parses keys without value', (t) => {
  t.deepEqual(parseUploadMetadataHeader('foo, baz'), {
    baz: '',
    foo: '',
  });
});

test('throws (multiple spaces)', (t) => {
  t.throws(() => {
    parseUploadMetadataHeader('foo   baz');
  });
});

test('throws (duplicate keys)', (t) => {
  t.throws(() => {
    parseUploadMetadataHeader('foo foo');
  });
});
