// @flow

import path from 'path';
import {
  remove,
} from 'fs-extra';
import express from 'express';
import sharp from 'sharp';
import {
  v4 as uuid,
} from 'uuid';
import delay from 'delay';
import {
  tmpNameSync as createTemporaryNameSync,
} from 'tmp';
import bodyParser from 'body-parser';
import {
  Storage,
} from '@google-cloud/storage';
import {
  sql,
  createPool,
} from 'slonik';
import {
  createInterceptors,
} from 'slonik-interceptor-preset';
import createRouter from 'express-promise-router';
import {
  serializeError,
} from 'serialize-error';
import yargs from 'yargs';
import {
  createLightship,
} from 'lightship';
import Logger from '../Logger';
import type {
  ConfigurationType,
} from '../types';

const log = Logger.child({
  namespace: 'server',
});

const argv: ConfigurationType = yargs
  .env('CWCFUA')
  .help()
  .options({
    'base-path': {
      default: '/',
      description: 'API base path, e.g.',
      type: 'string',
    },
    'google-cloud-key': {
      demand: true,
      type: 'string',
    },
    'google-project-id': {
      demand: true,
      type: 'string',
    },
    'postgres-dsn': {
      demand: true,
      type: 'string',
    },
    'service-port': {
      default: 8080,
      type: 'number',
    },
    'session-secret': {
      demand: true,
      type: 'string',
    },
    'upload-directory': {
      demand: true,
      description: 'Directory where tusd uploads files.',
      type: 'string',
    },
  })
  .parse();

process.on('unhandledRejection', (error) => {
  log.error({
    error: serializeError(error),
  }, 'unhandledRejection');

  throw error;
});

const googleStorage = new Storage({
  credentials: JSON.parse(argv.googleCloudKey),
  projectId: argv.googleProjectId,
});

const googleStorageBucket = googleStorage.bucket('contrawork');

const pool = createPool(argv.postgresDsn, {
  captureStackTrace: false,
  connectionTimeout: 60 * 1000,
  interceptors: [
    ...createInterceptors(),
  ],
});

const router = createRouter();

const userAccountId = 1;

router.post('/hooks', async (incomingMessage, outgoingMessage) => {
  const hookName = incomingMessage.headers['hook-name'];

  log.debug('received %s hook', hookName);

  const payload = incomingMessage.body;

  console.log('payload', payload);

  if (payload.Upload.ID) {
    const uploadedFile = path.resolve(argv.uploadDirectory, payload.Upload.ID);

    if (hookName === 'post-create') {
      await pool.query(sql`
        INSERT INTO file_upload
        (
          user_account_id,
          foreign_tus_id,
          file_name,
          file_type,
          size
        )
        VALUES
        (
          ${userAccountId},
          ${payload.Upload.ID},
          ${payload.Upload.MetaData.filename || null},
          ${payload.Upload.MetaData.filetype || null},
          ${payload.Upload.Size || null}
        )
      `);
    }

    if (hookName === 'post-finish') {
      const fileUploadId = await pool.oneFirst(sql`
        SELECT id
        FROM file_upload
        WHERE foreign_tus_id = ${payload.Upload.ID}
      `);

      const temporaryFileName = createTemporaryNameSync();

      const uploadedFileUuid = uuid();

      try {
        // @todo Handle failed conversion.
        await sharp(uploadedFile)
          .webp({
            lossless: true,
          })
          .toFile(temporaryFileName);
      } catch (error) {
        log.error({
          error: serializeError(error),
        }, 'image cannot be converted');

        outgoingMessage
          .status(400)
          .end('');

        return;
      }

      const file = googleStorageBucket.file('images/' + uploadedFileUuid);

      // @todo Use offset https://googleapis.dev/nodejs/storage/latest/global.html#CreateWriteStreamOptions
      await file.save(temporaryFileName, {
        gzip: true,
        predefinedAcl: 'publicRead',
        resumable: false,
        validation: 'md5',
      });

      await pool.oneFirst(sql`
        INSERT INTO uploaded_file
        (
          file_upload_id,
          user_account_id,
          uid,
          file_name,
          file_type,
          size
        )
        VALUES
        (
          ${fileUploadId},
          ${userAccountId},
          ${uploadedFileUuid},
          'foo',
          'bar',
          1
        )
        RETURNING id
      `);

      await remove(uploadedFile);
    }

    if (hookName === 'post-receive') {
      await pool.query(sql`
        UPDATE file_upload
        SET "offset" = ${payload.Upload.Offset}
        WHERE foreign_tus_id = ${payload.Upload.ID}
      `);
    }

    if (hookName === 'post-terminate') {
      await pool.query(sql`
        DELETE FROM file_upload
        WHERE foreign_tus_id = ${payload.Upload.ID}
      `);

      await remove(uploadedFile);
    }

    outgoingMessage.end();

    return;
  }

  // @todo add pre-finish hook https://github.com/tus/tusd/pull/382
  // @todo assert authentication
  // @todo assert file restrictions
  outgoingMessage.send('OK');
});

const app = express();

app.use(bodyParser.json());

app.use(argv.basePath, router);

const server = app.listen(8080);

const lightship = createLightship();

lightship.registerShutdownHandler(() => {
  server.close();
});

lightship.signalReady();
