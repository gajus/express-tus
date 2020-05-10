## Contra File Upload API

Contra File Upload API uses [tus protocol](https://tus.io/protocols/resumable-upload.html).

## Usage

In production, Tus is deployed to `upload.contra.com`.

Uploading files requires to use [one of the libraries](https://tus.io/implementations.html) that implement tus protocol. For JavaScript projects, use [tus-js-client](https://github.com/tus/tus-js-client).

## Architecture

File uploads are handled by [tusd](https://github.com/tus/tusd).

tusd is integrated with `contra-file-upload-api` using [HTTP hooks](https://github.com/tus/tusd/blob/master/docs/hooks.md#http-hooks).

* tusd handles file upload to the server running the service.
* `contra-file-upload-api` handles:
  * client request authentication
  * recording meta-data about file uploads to the database
  * encoding
  * uploading to GCP (for images)
  * uploading to Cloudflare (for videos)

Notes:

* The reason tusd is not being used to upload directly to GCP is because:
  * we want to convert images tp webp before uploading them to GCP
  * we want to upload videos to Cloudflare

### Running locally

Running `contra-file-upload-api` locally requires that you configure a local instance of [tusd](https://github.com/tus/tusd).

```bash
docker run \
  -it \
  --rm \
  --name tusd \
  # You must configure `contra-file-upload-api`
  # to use the same upload directory.
  -v $PWD/.uploads:/srv/tusd-data/data \
  -p 1080:1080 \
  tusproject/tusd --base-path=/upload --upload-dir=/srv/tusd-data/data --hooks-http http://host.docker.internal:8080/hooks

```
