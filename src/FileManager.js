import * as THREE from 'three';
import { TTFLoader } from 'three/addons/loaders/TTFLoader';
import { OBJLoader } from 'three/addons/loaders/OBJLoader';
import { MTLLoader } from 'three/addons/loaders/MTLLoader';
import { loggerWarning, loggerDebug } from './Bindings';
import { Image } from './Image';
import { Text } from './Text';
import { Model } from './Model';
import { Settings } from './Settings';

import embeddedDefaultFsUrl from './_embedded/default.fs?url';
import embeddedDefaultVsUrl from './_embedded/default.vs?url';
import embeddedDefault2dFsUrl from './_embedded/default2d.fs?url';
import embeddedDefault2dVsUrl from './_embedded/default2d.vs?url';
import embeddedDefaultFixedViewVsUrl from './_embedded/defaultFixedView.vs?url';
import embeddedDefaultPlainFsUrl from './_embedded/defaultPlain.fs?url';
import embeddedDefaultTransparentPngUrl from './_embedded/defaultTransparent.png?url';
import embeddedDefaultWhitePngUrl from './_embedded/defaultWhite.png?url';

THREE.Cache.enabled = true;

const settings = new Settings();

let fs = null;
if (settings.engine.tool && import.meta.env.MODE !== 'production') {
  import('vite-plugin-fs/browser').then((module) => {
    loggerDebug('fs plugin for file watching loaded');
    fs = module.default;
  });
}

const FileManager = function () {
  return this.getInstance();
};

FileManager.prototype.getInstance = function () {
  if (!FileManager.prototype._singletonInstance) {
    this.init();
    FileManager.prototype._singletonInstance = this;
  }

  return FileManager.prototype._singletonInstance;
};

FileManager.prototype.init = function () {
  this.files = {};
  this.refreshFiles = {};
  this.needsUpdate = false;

  this.staticUrls = {
    '_embedded/default.fs': embeddedDefaultFsUrl,
    '_embedded/default.vs': embeddedDefaultVsUrl,
    '_embedded/default2d.fs': embeddedDefault2dFsUrl,
    '_embedded/default2d.vs': embeddedDefault2dVsUrl,
    '_embedded/defaultFixedView.vs': embeddedDefaultFixedViewVsUrl,
    '_embedded/defaultPlain.fs': embeddedDefaultPlainFsUrl,
    '_embedded/defaultTransparent.png': embeddedDefaultTransparentPngUrl,
    '_embedded/defaultWhite.png': embeddedDefaultWhitePngUrl
  };
};

FileManager.prototype.stopWatchFileChanges = async function () {
  if (this.intervalFunction) {
    clearInterval(this.intervalFunction);
  }
};

FileManager.prototype.startWatchFileChanges = async function () {
  if (settings.engine.tool) {
    this.stopWatchFileChanges();

    this.intervalFunction = setInterval(async () => {
      const fileManager = new FileManager();
      await fileManager.checkFiles();
    }, settings.engine.fileWatchInterval);
  }
};

FileManager.prototype.checkFiles = async function () {
  try {
    if (!fs) {
      return;
    }

    const fileManager = new FileManager();
    // loggerDebug(`Checking files for changes: ${Object.keys(fileManager.refreshFiles).join(', ')}`);
    for (const filePath in fileManager.refreshFiles) {
      const path = fileManager.getDiskPath(filePath);
      // loggerDebug('Checking file: ' + path);
      const stats = await fs.stat(path);

      if (fileManager.refreshFiles[filePath] === null) {
        fileManager.refreshFiles[filePath] = stats.mtime;
        continue;
      }

      if (stats.mtime > fileManager.refreshFiles[filePath]) {
        loggerDebug('File changed: ' + filePath);

        fileManager.refreshFiles[filePath] = stats.mtime;
        fileManager.setNeedsUpdate(true);

        const file = await fs.readFile(path);
        if (fileManager.files[filePath]) {
          fileManager.setFileData(filePath, file);

          if (path.toUpperCase().endsWith('.JS')) {
            try {
              loggerDebug('Executing JavaScript file: ' + filePath);
              /* eslint-disable no-eval */
              eval(file);
            } catch (e) {
              loggerWarning(
                'Error loading JavaScript file: ' + filePath + ' ' + e
              );
            }
          }
        }
      }
    }
  } catch (e) {
    loggerDebug('Error checking files: ' + e);
  }
};

FileManager.prototype.setNeedsUpdate = function (needsUpdate) {
  this.needsUpdate = needsUpdate;
};

FileManager.prototype.isNeedsUpdate = function () {
  return this.needsUpdate;
};

FileManager.prototype.setFileData = function (filePath, data) {
  if (filePath instanceof Array) {
    for (let i = 0; i < filePath.length; i++) {
      this.files[filePath[i]] = data[i];
    }
  } else {
    this.files[filePath] = data;
  }
};

FileManager.prototype.getFileData = function (filePath) {
  return this.files[filePath];
};

FileManager.prototype.getInstanceName = function (instance) {
  if (instance) {
    return instance.constructor.name;
  }
  return 'Unknown';
};

FileManager.prototype.processPromise = function (
  resolve,
  reject,
  filePath,
  instance,
  data,
  callback
) {
  let filePathString = filePath;
  if (filePathString instanceof Array) {
    filePathString = filePathString.join(', ');
  }

  let rejectPromise = true;

  if (callback) {
    try {
      if (callback(instance, data)) {
        if (
          !(
            instance instanceof Image ||
            instance instanceof Text ||
            instance instanceof Model
          )
        ) {
          this.setFileData(filePath, data);
        }
        loggerDebug(
          `${this.getInstanceName(instance)} file(s) loaded: ${filePathString}`
        );
        rejectPromise = false;
        resolve(data);
      } else {
        loggerWarning('Callback failed');
      }
    } catch (e) {
      loggerWarning(`Received exception: ${e}`);
    }
  }

  if (rejectPromise) {
    loggerWarning(
      `${this.getInstanceName(instance)} file(s) could not be loaded: ${filePathString}`
    );

    this.removeRefreshFileTimestamp(filePath);

    if (instance) {
      instance.error = true;
    }
    reject(data);
  }
};

FileManager.prototype.getPath = function (filePath) {
  if (!filePath.startsWith('_embedded/') && !filePath.startsWith('./')) {
    return settings.engine.demoPathPrefix + filePath;
  }
  return filePath;
};

FileManager.prototype.getDiskPath = function (filePath) {
  if (filePath.startsWith('_embedded/')) {
    return 'src/' + filePath;
  }
  return 'public/' + settings.engine.demoPathPrefix + filePath;
};

FileManager.prototype.loadFiles = function (filePaths, instance, callback) {
  const fileManager = this;
  if (!(filePaths instanceof Array)) {
    filePaths = [filePaths];
  }

  return new Promise((resolve, reject) => {
    const promises = [];
    for (let i = 0; i < filePaths.length; i++) {
      promises.push(
        this.load(filePaths[i], instance, (instance, data) => {
          return true;
        })
      );
    }

    Promise.all(promises)
      .then((values) => {
        fileManager.processPromise(
          resolve,
          reject,
          filePaths,
          instance,
          values,
          callback
        );
      })
      .catch((e) => {
        loggerWarning(
          `File(s) could not be loaded: ${filePaths.join(', ')}: ${e}`
        );
        reject(e);
      });
  });
};

FileManager.prototype.removeRefreshFileTimestamp = function (filePath) {
  const path = filePath;
  if (this.refreshFiles[path]) {
    loggerDebug('Removing file from refresh checking: ' + path);
    delete this.refreshFiles[filePath];
  }
};

FileManager.prototype.setRefreshFileTimestamp = function (filePath) {
  if (this.refreshFiles[filePath]) {
    return;
  }

  if (fs) {
    const path = this.getDiskPath(filePath);
    fs.stat(path)
      .then((stats) => {
        this.refreshFiles[filePath] = stats.mtime;
      })
      .catch((e) => {
        loggerDebug(
          `Error setting file refresh timestamp for ${filePath}: ${e}`
        );
        delete this.refreshFiles[filePath];
      });
  } else {
    if (settings.engine.tool) {
      loggerWarning(`File watch not available, not checking: ${filePath}`);
    }

    delete this.refreshFiles[filePath];
  }
};

FileManager.prototype.getUrl = function (filePath) {
  if (this.staticUrls[filePath]) {
    return this.staticUrls[filePath];
  }

  return this.getPath(filePath);
};

FileManager.prototype.load = function (filePath, instance, callback) {
  const fileManager = this;
  return new Promise((resolve, reject) => {
    const path = fileManager.getPath(filePath);

    if (this.files[filePath]) {
      fileManager.processPromise(
        resolve,
        reject,
        filePath,
        instance,
        this.files[filePath],
        callback
      );
      return;
    }

    let Loader = THREE.FileLoader;
    if (instance instanceof Image) {
      Loader = THREE.TextureLoader;
    } else if (instance instanceof Text) {
      Loader = TTFLoader;
    } else if (instance instanceof Model) {
      if (filePath.toUpperCase().endsWith('.OBJ')) {
        Loader = OBJLoader;
      } else if (filePath.toUpperCase().endsWith('.MTL')) {
        Loader = MTLLoader;
      } else {
        throw new Error('3D Model fileformat not supported: ' + filePath);
      }
    }

    new Loader().load(
      this.getUrl(filePath),
      // onLoad callback
      (data) => {
        if (data[0] === '<') {
          loggerWarning(
            `${fileManager.getInstanceName(instance)} file not found: ${path}`
          );
          if (instance) {
            instance.error = true;
          }
          reject(instance);
          return;
        }

        fileManager.processPromise(
          resolve,
          reject,
          filePath,
          instance,
          data,
          callback
        );

        fileManager.setRefreshFileTimestamp(filePath);
      },
      // onProgress callback
      undefined,
      // onError callback
      (err) => {
        loggerWarning(
          `${fileManager.getInstanceName(instance)} file could not be loaded: ${path}: ${err}`
        );
        if (instance) {
          instance.error = true;
        }
        reject(instance);
      }
    );
  });
};

export { FileManager };
