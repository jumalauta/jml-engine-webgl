# JML Engine Tool Server

Tool server contains some additional features for demo development

Run: `node src/server.js | npx pino-pretty`

## Capture notes

- It might be a good idea to run tool server outside devcontainer when capturing as browsers may end up in Out Of Memory error if encoding backlog is too big
- Default setting is to use ffmpeg fast capture, this means that output filesize is bigger than necessarily but capture encoding speed is better which should reduce risk of Out of Memory errors in browsers 