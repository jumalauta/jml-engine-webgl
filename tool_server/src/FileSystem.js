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

const logger = pino();

const FileSystem = function (projectAbsolutePath, wsLogger) {
  this.projectAbsolutePath = projectAbsolutePath;
  this.logger = wsLogger || logger;
  this.watchers = new Map();
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
  encoding = 'utf8'
) {
  const abs = this.toAbsolutePath(relativePath);
  return await fsReadFile(abs, { encoding: encoding });
};

FileSystem.prototype.monitorFile = function (relativePath, onChange) {
  const abs = this.toAbsolutePath(relativePath);
  if (this.watchers.has(abs)) {
    return true;
  }
  try {
    const watcher = watch(abs, { persistent: true }, async (eventType) => {
      try {
        const stats = await stat(abs);
        let content = null;
        try {
          content = await fsReadFile(abs, { encoding: 'utf8' });
        } catch {}
        onChange({
          path: relativePath,
          mtimeMs: stats.mtimeMs,
          eventType,
          content
        });
      } catch (err) {
        this.logger.warn({ err, abs }, 'Error reading stats on change');
      }
    });
    const close = () => {
      try {
        watcher.close();
      } catch {}
    };
    this.watchers.set(abs, close);
    return true;
  } catch (err) {
    this.logger.error({ err, abs }, 'Failed to watch file');
    return false;
  }
};

FileSystem.prototype.stopFileWatch = function () {
  for (const [, close] of this.watchers) {
    try {
      close();
    } catch {}
  }
  this.watchers.clear();
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

  if (msg.type === 'FS_STOP_WATCH') {
    try {
      if (ws.state.fileSystem) {
        ws.state.fileSystem.stopFileWatch();
        ws.sendJson({ type: 'FS_STOP_WATCH_SUCCESS' });
      } else {
        throw new Error('File system not initialized');
      }
      return;
    } catch (err) {
      ws.logger.child({ err }).error('Failed to stop file watch');
      ws.sendJson({ type: 'FS_STOP_WATCH_ERROR', error: err.message });
      return;
    }
  }

  const fileSystem = ensureFileSystem(ws);

  const requiresPath =
    msg.type === 'FS_MONITORFILE' ||
    msg.type === 'FS_STAT' ||
    msg.type === 'FS_READFILE';

  if (requiresPath && !msg.path) {
    ws.logger.child({ clientMessage: msg }).error('Path not provided');
    throw new Error('Path not provided');
  }

  if (requiresPath) {
    await validatePath(ws, msg.path);
  }

  if (msg.type === 'FS_MONITORFILE') {
    const ok = fileSystem.monitorFile(
      msg.path,
      ({ path, mtimeMs, eventType, content }) => {
        ws.logger.child({ path, mtimeMs, eventType }).info('File changed');
        ws.sendJson({
          type: 'FS_FILE_CHANGED',
          path,
          mtimeMs,
          eventType,
          content
        });
      }
    );
    ws.sendJson({
      type: ok ? 'FS_MONITOR_SUCCESS' : 'FS_MONITOR_ERROR',
      path: msg.path
    });
  } else if (msg.type === 'FS_STAT') {
    fileSystem
      .stat(msg.path)
      .then((stats) => {
        ws.sendJson({ type: 'FS_STAT_SUCCESS', stats });
        return true;
      })
      .catch((err) => {
        ws.sendJson({ type: 'FS_STAT_ERROR', error: err.message });
        return false;
      });
  } else if (msg.type === 'FS_READFILE') {
    fileSystem
      .readFile(msg.path)
      .then((content) => {
        ws.sendJson({ type: 'FS_READFILE_SUCCESS', content });
        return true;
      })
      .catch((err) => {
        ws.sendJson({ type: 'FS_READFILE_ERROR', error: err.message });
        return false;
      });
  } else {
    ws.logger
      .child({ clientMessage: msg })
      .info('Invalid file system client data received');
    throw new Error('Invalid file system message: ' + msg.type);
  }
};

export { FileSystem, handleFileSystemMessage };
