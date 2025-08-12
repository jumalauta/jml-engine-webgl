import { pino } from 'pino';
import {
  stat,
  readFile as fsReadFile,
  access,
  constants
} from 'node:fs/promises';
import { watch } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert';
import { createTwoFilesPatch } from 'diff';

const logger = pino();

const FileSystem = function (projectAbsolutePath, wsLogger) {
  this.projectAbsolutePath = projectAbsolutePath;
  this.logger = wsLogger || logger;
  this.watchers = new Map();
  this.contentCache = new Map();
};

FileSystem.prototype.isDiffableExtension = function (filePath) {
  const diffableExtensions = ['.js', '.vs', '.fs', '.txt', '.json'];
  return diffableExtensions.some((ext) => filePath.toLowerCase().endsWith(ext));
};

FileSystem.prototype.createDiff = function (oldContent, newContent, filePath) {
  if (!this.isDiffableExtension(filePath) || !oldContent || !newContent) {
    return null;
  }

  const patch = createTwoFilesPatch(
    filePath, // old file name
    filePath, // new file name
    oldContent,
    newContent,
    '', // old file header
    '', // new file header
    { ignoreWhitespace: true }
  );

  return patch;
};

FileSystem.prototype.toAbsolutePath = function (relativePath) {
  return resolve(join(this.projectAbsolutePath, relativePath));
};

FileSystem.prototype.stat = async function (relativePath) {
  const absolutePath = this.toAbsolutePath(relativePath);
  return await stat(absolutePath);
};

FileSystem.prototype.readFile = async function (
  relativePath,
  encoding = 'base64'
) {
  const abs = this.toAbsolutePath(relativePath);
  return await fsReadFile(abs, { encoding: encoding });
};

FileSystem.prototype.monitorFile = function (relativePath, onChange) {
  const absolutePath = this.toAbsolutePath(relativePath);
  if (this.watchers.has(absolutePath)) {
    return true;
  }

  const setupWatch = () => {
    if (this.isDiffableExtension(relativePath)) {
      try {
        fsReadFile(absolutePath, { encoding: 'utf8' })
          .then((content) => {
            this.contentCache.set(absolutePath, content);
            return content;
          })
          .catch(() => {
            return null;
          });
      } catch (err) {
        this.logger.warn(
          { err, absolutePath },
          'Could not read initial file content'
        );
      }
    }

    try {
      const watcher = watch(
        absolutePath,
        { persistent: true },
        async (eventType) => {
          try {
            let stats;
            let content = null;
            let diffContent = null;

            try {
              stats = await stat(absolutePath);
            } catch (statErr) {
              if (statErr.code === 'ENOENT') {
                // file might be temporarily missing, e.g., during copy operation
                const fileWaitGrace = 250;
                await new Promise((resolve) =>
                  setTimeout(resolve, fileWaitGrace)
                );
                try {
                  stats = await stat(absolutePath);
                } catch (retryErr) {
                  if (retryErr.code === 'ENOENT') {
                    this.logger.warn(
                      { absolutePath, eventType },
                      'File no longer exists after copy operation'
                    );

                    this.watchers.delete(absolutePath);
                    this.contentCache.delete(absolutePath);
                    try {
                      watcher.close();
                    } catch (err) {
                      this.logger.warn(
                        { err, absolutePath },
                        'Error closing file watcher'
                      );
                    }
                    return;
                  }
                  throw retryErr;
                }
              } else {
                throw statErr;
              }
            }

            try {
              content = await fsReadFile(absolutePath, { encoding: 'base64' });

              if (this.isDiffableExtension(relativePath)) {
                const textContent = await fsReadFile(absolutePath, {
                  encoding: 'utf8'
                });
                const oldContent = this.contentCache.get(absolutePath);

                if (oldContent && oldContent !== textContent) {
                  diffContent = this.createDiff(
                    oldContent,
                    textContent,
                    relativePath
                  );
                }

                this.contentCache.set(absolutePath, textContent);
              }
            } catch (err) {
              if (err.code === 'ENOENT') {
                this.logger.warn(
                  { err, absolutePath },
                  'File disappeared during processing'
                );
              } else {
                this.logger.error(
                  { err, absolutePath },
                  'Error reading file content'
                );
              }
              return;
            }

            if (content.length == 0) {
              this.logger.warn({ absolutePath }, 'File content is empty');
            }

            onChange({
              path: relativePath,
              mtimeMs: stats.mtimeMs,
              eventType,
              content,
              diffContent
            });
          } catch (err) {
            this.logger.warn(
              { err, absolutePath },
              'Error processing file change'
            );
          }
        }
      );
      const close = () => {
        try {
          watcher.close();
        } catch {}
      };
      this.watchers.set(absolutePath, close);
      return true;
    } catch (err) {
      this.logger.error({ err, absolutePath }, 'Failed to watch file');
      return false;
    }
  };

  return setupWatch();
};

FileSystem.prototype.stopFileWatch = function () {
  for (const [, close] of this.watchers) {
    try {
      close();
    } catch {}
  }
  this.watchers.clear();
  this.contentCache.clear();
};

const ensureFileSystem = (ws) => {
  if (ws.state.fileSystem) return ws.state.fileSystem;
  assert(
    ws.state.settings?.engine?.demoPathPrefix,
    'Settings have not been loaded'
  );
  const relativeBaseProjectPath = `public/${ws.state.settings.engine.demoPathPrefix}`;
  const projectAbsolutePath = resolve(relativeBaseProjectPath);
  if (!access(projectAbsolutePath, constants.R_OK)) {
    ws.logger.error({ projectAbsolutePath }, 'Project path does not exist');
    throw new Error('Project path does not exist');
  }
  ws.state.projectAbsolutePath = projectAbsolutePath;
  const fs = new FileSystem(projectAbsolutePath, ws.logger);
  ws.state.fileSystem = fs;
  ws.once('close', () => fs.stopFileWatch());
  return fs;
};

const validatePath = async (ws, relativePath) => {
  const abs = resolve(join(ws.state.projectAbsolutePath, relativePath));
  if (!abs.startsWith(ws.state.projectAbsolutePath)) {
    ws.logger
      .child({ relativePath, abs })
      .error('Path outside project directory');
    throw new Error('Path outside project directory');
  }
  try {
    await access(abs, constants.R_OK);
    await stat(abs);
  } catch {
    ws.logger.child({ relativePath, abs }).error('Path not accessible');
    throw new Error('Path not accessible');
  }
  return abs;
};

const handleFileSystemMessage = async (ws, msg) => {
  assert(ws, 'WebSocket is required');
  assert(msg, 'Message is required');

  const { method, params, id } = msg;

  if (method === 'fs.stopWatch') {
    try {
      if (ws.state.fileSystem) {
        ws.state.fileSystem.stopFileWatch();
        if (id !== undefined) {
          ws.sendResponse(id, { status: 'stopped' });
        }
      } else {
        throw new Error('File system not initialized');
      }
      return;
    } catch (err) {
      ws.logger.child({ err }).error('Failed to stop file watch');
      if (id !== undefined) {
        ws.sendError(id, -32603, 'Internal error', err.message);
      }
      return;
    }
  }

  const fileSystem = ensureFileSystem(ws);

  const requiresPath = ['fs.monitorFile', 'fs.stat', 'fs.readFile'].includes(
    method
  );

  if (requiresPath && (!params || !params.path)) {
    ws.logger.child({ method, params }).error('Path not provided');
    if (id !== undefined) {
      ws.sendError(id, -32602, 'Invalid params', 'Path required');
    }
    return;
  }

  if (requiresPath) {
    try {
      await validatePath(ws, params.path);
    } catch (err) {
      if (id !== undefined) {
        ws.sendError(id, -32602, 'Invalid params', err.message);
      }
      return;
    }
  }

  if (method === 'fs.monitorFile') {
    const ok = fileSystem.monitorFile(
      params.path,
      ({ path, mtimeMs, eventType, content, diffContent }) => {
        ws.logger.child({ path, mtimeMs, eventType }).info('File changed');
        const notificationParams = {
          path,
          mtimeMs,
          eventType,
          content
        };

        if (diffContent) {
          notificationParams.diffContent = diffContent;
        }

        ws.sendNotification('fs.fileChanged', notificationParams);
      }
    );

    if (id !== undefined) {
      ws.sendResponse(id, {
        status: ok ? 'monitoring' : 'failed',
        path: params.path
      });
    }
  } else if (method === 'fs.stat') {
    try {
      const stats = await fileSystem.stat(params.path);
      if (id !== undefined) {
        ws.sendResponse(id, { stats });
      }
    } catch (err) {
      if (id !== undefined) {
        ws.sendError(id, -32603, 'Internal error', err.message);
      }
    }
  } else if (method === 'fs.readFile') {
    try {
      const content = await fileSystem.readFile(params.path);
      if (id !== undefined) {
        ws.sendResponse(id, { content });
      }
    } catch (err) {
      if (id !== undefined) {
        ws.sendError(id, -32603, 'Internal error', err.message);
      }
    }
  } else {
    ws.logger.child({ method, params }).info('Unknown file system method');
    if (id !== undefined) {
      ws.sendError(id, -32601, 'Method not found', `Unknown method: ${method}`);
    }
  }
};

export { FileSystem, handleFileSystemMessage };
