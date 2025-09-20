import { pino } from 'pino';
import {
  stat,
  readFile as fsReadFile,
  readdir,
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

            if (content.length === 0) {
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
        } catch (err) {
          this.logger.warn(
            { err, absolutePath },
            'Error closing file watcher during cleanup'
          );
        }
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
    } catch (err) {
      this.logger.warn({ err }, 'Error closing file watcher during cleanup');
    }
  }
  this.watchers.clear();
  this.contentCache.clear();
};

FileSystem.prototype.getAllFiles = async function (dirPath = '') {
  const allFiles = [];
  const absoluteDirPath = dirPath
    ? this.toAbsolutePath(dirPath)
    : this.projectAbsolutePath;

  try {
    const entries = await readdir(absoluteDirPath, { withFileTypes: true });

    for (const entry of entries) {
      // skip hidden files and directories (starting with '.'), e.g., ".git" etc
      if (entry.name.startsWith('.')) {
        continue;
      }

      const relativePath = dirPath ? `${dirPath}/${entry.name}` : entry.name;
      const absolutePath = this.toAbsolutePath(relativePath);

      if (entry.isDirectory()) {
        const subFiles = await this.getAllFiles(relativePath);
        allFiles.push(...subFiles);
      } else if (entry.isFile()) {
        allFiles.push({ relativePath, absolutePath });
      }
    }
  } catch (err) {
    this.logger.warn({ err, absoluteDirPath }, 'Error reading directory');
  }

  return allFiles;
};

FileSystem.prototype.getUnusedFiles = async function () {
  const allFiles = await this.getAllFiles();
  const monitoredPaths = new Set(this.watchers.keys());

  // This can report false-positive unused files if three.js is loading something and bypassing the monitoring. So THREE.Cache must be compared to avoid false positives
  const unusedFiles = allFiles.filter(
    (file) => !monitoredPaths.has(file.absolutePath)
  );

  return unusedFiles.map((file) => file.relativePath);
};

const getProjectPath = async (ws) => {
  assert(
    ws.state.settings?.engine?.demoPathPrefix,
    'Settings have not been loaded'
  );

  const rootPath = 'public';
  const relativeBaseProjectPath = `${rootPath}/${ws.state.settings.engine.demoPathPrefix}`;
  const projectAbsolutePath = resolve(relativeBaseProjectPath);

  try {
    if (projectAbsolutePath === resolve(rootPath)) {
      throw new Error('Project path is not valid');
    }
    await access(projectAbsolutePath, constants.R_OK);
    const stats = await stat(projectAbsolutePath);
    if (!stats.isDirectory()) {
      throw new Error('Project path is not a directory');
    }
  } catch (err) {
    ws.logger.error(
      { err, projectAbsolutePath },
      'Project path does not exist'
    );
    throw err;
  }

  return projectAbsolutePath;
};

const ensureFileSystem = async (ws) => {
  if (ws.state.fileSystem) {
    return ws.state.fileSystem;
  }

  const projectAbsolutePath = await getProjectPath(ws);
  ws.state.projectAbsolutePath = projectAbsolutePath;
  const fs = new FileSystem(projectAbsolutePath, ws.logger);
  ws.state.fileSystem = fs;
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
    const stats = await stat(abs);
    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }
  } catch (err) {
    ws.logger.child({ err, relativePath, abs }).error('Path not accessible');
    throw new Error('Path not accessible');
  }
  return abs;
};

const stopFileWatch = (ws, msg) => {
  if (ws.state.fileSystem) {
    ws.state.fileSystem.stopFileWatch();
    ws.state.fileSystem = null;
    if (msg?.id !== undefined) {
      ws.sendResponse(msg.id, { status: 'stopped' });
    }
  }
};

const handleFileSystemMessage = async (ws, msg) => {
  assert(ws, 'WebSocket is required');
  assert(msg, 'Message is required');

  const { method, params, id } = msg;

  if (method === 'fs.stopWatch') {
    try {
      if (!ws.state.fileSystem) {
        throw new Error('File system not initialized');
      }
      stopFileWatch(ws, msg);
      return;
    } catch (err) {
      ws.logger.child({ err }).error('Failed to stop file watch');
      if (id !== undefined) {
        ws.sendError(id, -32603, 'Internal error', err.message);
      }
      return;
    }
  }

  if (method === 'fs.showUnusedFiles') {
    try {
      const fileSystem = await ensureFileSystem(ws);
      const unusedFiles = await fileSystem.getUnusedFiles();

      ws.logger.info({ count: unusedFiles.length }, 'Found unused files');

      if (unusedFiles.length === 0) {
        ws.logger.info('No unused files found');
      } else {
        ws.logger.info('Unused files:');
        unusedFiles.forEach((file) => {
          ws.logger.info(`  ${file}`);
        });
      }

      if (id !== undefined) {
        ws.sendResponse(id, {
          unusedFiles,
          count: unusedFiles.length
        });
      }
      return;
    } catch (err) {
      ws.logger.child({ err }).error('Failed to show unused files');
      if (id !== undefined) {
        ws.sendError(id, -32603, 'Internal error', err.message);
      }
      return;
    }
  }

  const fileSystem = await ensureFileSystem(ws);

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

export { FileSystem, stopFileWatch, handleFileSystemMessage };
