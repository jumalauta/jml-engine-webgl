import * as THREE from 'three';
import { TTFLoader } from 'three/addons/loaders/TTFLoader';
import { OBJLoader } from 'three/addons/loaders/OBJLoader';
import { MTLLoader } from 'three/addons/loaders/MTLLoader';
import { loggerWarning, loggerDebug, loggerInfo } from './Bindings';
import { Image } from './Image';
import { Text } from './Text';
import { Model } from './Model';
import { Settings } from './Settings';

import embeddedDefaultFsUrl from './_embedded/default.fs?url';
import embeddedDefaultVsUrl from './_embedded/default.vs?url';
import embeddedDefault2dFsUrl from './_embedded/default2d.fs?url';
import embeddedDefault2dVsUrl from './_embedded/default2d.vs?url';
import embeddedBillboardVsUrl from './_embedded/billboard.vs?url';
import embeddedDefaultFixedViewVsUrl from './_embedded/defaultFixedView.vs?url';
import embeddedDefaultPlainFsUrl from './_embedded/defaultPlain.fs?url';
import embeddedDefaultTransparentPngUrl from './_embedded/defaultTransparent.png?url';
import embeddedDefaultWhitePngUrl from './_embedded/defaultWhite.png?url';
import embeddedTestUvMapPngUrl from './_embedded/testUvMap.png?url';

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
    this.clearCache();
    this.init();
    FileManager.prototype._singletonInstance = this;
  }

  return FileManager.prototype._singletonInstance;
};

FileManager.prototype.clearCache = function () {
  this.files = {};
  this.fileReferences = {};
  this.refreshFiles = {};
  Text.clearCache();
};

FileManager.prototype.init = function () {
  this.fileReferences = {};
  this.needsUpdateFiles = [];

  this.staticUrls = {
    '_embedded/default.fs': embeddedDefaultFsUrl,
    '_embedded/default.vs': embeddedDefaultVsUrl,
    '_embedded/default2d.fs': embeddedDefault2dFsUrl,
    '_embedded/default2d.vs': embeddedDefault2dVsUrl,
    '_embedded/billboard.vs': embeddedBillboardVsUrl,
    '_embedded/defaultFixedView.vs': embeddedDefaultFixedViewVsUrl,
    '_embedded/defaultPlain.fs': embeddedDefaultPlainFsUrl,
    '_embedded/defaultTransparent.png': embeddedDefaultTransparentPngUrl,
    '_embedded/defaultWhite.png': embeddedDefaultWhitePngUrl,
    '_embedded/testUvMap.png': embeddedTestUvMapPngUrl
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

FileManager.prototype.loadUpdatedFiles = async function () {
  for (const filePath of this.needsUpdateFiles) {
    if (this.getFileFromCache(filePath)) {
      loggerDebug('File updated: ' + filePath);
      const file = this.getFileFromCache(filePath);

      if (filePath.toUpperCase().endsWith('.JS')) {
        try {
          loggerDebug('Executing JavaScript file: ' + filePath);
          /* eslint-disable no-eval */
          eval(file);
        } catch (e) {
          loggerWarning('Error loading JavaScript file: ' + filePath + ' ' + e);
        }
      }
    }
  }

  this.markAsUpdated();
};

FileManager.prototype.checkFiles = async function () {
  try {
    if (!fs) {
      return;
    }

    // loggerDebug(`Checking files for changes: ${Object.keys(fileManager.refreshFiles).join(', ')}`);
    for (const filePath in this.refreshFiles) {
      const path = this.getDiskPath(filePath);
      // loggerDebug('Checking file: ' + path);
      const stats = await fs.stat(path);

      if (this.getRefreshFileFromCache(filePath) === null) {
        this.setRefreshFileFromCache(filePath, stats.mtime);
        continue;
      }

      if (stats.mtime > this.getRefreshFileFromCache(filePath)) {
        loggerDebug('File changed: ' + filePath);

        this.setRefreshFileFromCache(filePath, stats.mtime);
        this.needsDeepUpdate = true;

        if (this.getFileFromCache(filePath)) {
          const file = await fs.readFile(path);
          this.setFileData(filePath, file);
          if (this.updateReferences(filePath)) {
            this.needsDeepUpdate = false;
          }
        }

        this.needsUpdateFiles.push(filePath);
      }
    }
  } catch (e) {
    loggerDebug('Error checking files: ' + e);
  }
};

FileManager.prototype.setReference = function (filePath, reference) {
  if (!reference || !reference.isMaterial) {
    throw new Error(
      'Internal error: invalid reference provided: ' +
        filePath +
        ' - ' +
        JSON.stringify(reference)
    );
  }

  const path = this.getDiskPath(filePath);

  if (this.fileReferences[path]) {
    let newReference = true;
    this.fileReferences[path].forEach((ref) => {
      if (ref === reference) {
        newReference = false;
      }
    });

    if (newReference) {
      this.fileReferences[path].push(reference);
    }
  } else {
    this.fileReferences[path] = [reference];
  }
};

FileManager.prototype.updateReferences = function (filePath) {
  let updated = false;

  const path = this.getDiskPath(filePath);

  if (this.fileReferences[path]) {
    this.fileReferences[path].forEach((ref) => {
      if (ref.isMaterial) {
        if (ref.vertexShader && path.toUpperCase().endsWith('.VS')) {
          loggerInfo('Updating material with vertex shader: ' + path);
          ref.vertexShader = this.getFileFromCache(path);
        }
        if (ref.fragmentShader && path.toUpperCase().endsWith('.FS')) {
          loggerInfo('Updating material with fragment shader: ' + path);
          ref.fragmentShader = this.getFileFromCache(path);
        }
        ref.needsUpdate = true;
        updated = true;
      }
    });
  }

  return updated;
};

FileManager.prototype.isNeedsUpdate = function () {
  return this.needsUpdateFiles.length > 0;
};

FileManager.prototype.isNeedsDeepUpdate = function () {
  return this.needsDeepUpdate || false;
};

FileManager.prototype.markAsUpdated = function () {
  this.needsDeepUpdate = undefined;
  this.needsUpdateFiles = [];
};

FileManager.prototype.setFileData = function (filePath, data) {
  if (filePath instanceof Array) {
    for (let i = 0; i < filePath.length; i++) {
      this.setFileFromCache(filePath[i], data[i]);
    }
  } else {
    this.setFileFromCache(filePath, data);
  }
};

FileManager.prototype.getFileData = function (filePath) {
  return this.getFileFromCache(filePath);
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
  if (filePath.startsWith('src/') || filePath.startsWith('public/')) {
    return filePath.replace(/^(src|public)\//, '');
  }

  if (!filePath.startsWith('_embedded/') && !filePath.startsWith('./')) {
    return settings.engine.demoPathPrefix + filePath;
  }
  return filePath;
};

FileManager.prototype.getDiskPath = function (filePath) {
  if (filePath.startsWith('src/') || filePath.startsWith('public/')) {
    return filePath;
  }

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
  if (this.getRefreshFileFromCache(path)) {
    loggerDebug('Removing file from refresh checking: ' + path);
    this.setRefreshFileFromCache(filePath, null);
  }
};

FileManager.prototype.setRefreshFileTimestamp = function (filePath) {
  if (this.getRefreshFileFromCache(filePath)) {
    return;
  }

  if (fs) {
    const path = this.getDiskPath(filePath);
    fs.stat(path)
      .then((stats) => {
        this.setRefreshFileFromCache(filePath, stats.mtime);
      })
      .catch((e) => {
        loggerDebug(
          `Error setting file refresh timestamp for ${filePath}: ${e}`
        );
        this.setRefreshFileFromCache(filePath, null);
      });
  } else {
    if (settings.engine.tool) {
      loggerWarning(`File watch not available, not checking: ${filePath}`);
    }

    this.setRefreshFileFromCache(filePath, null);
  }
};

FileManager.prototype.getUrl = function (filePath) {
  if (this.staticUrls[filePath]) {
    return this.staticUrls[filePath];
  }

  return this.getPath(filePath);
};

FileManager.prototype.getFileFromCache = function (filePath) {
  return this.files[this.getPath(filePath)];
};

FileManager.prototype.setFileFromCache = function (filePath, data) {
  this.files[this.getPath(filePath)] = data;
};

FileManager.prototype.getRefreshFileFromCache = function (filePath) {
  return this.refreshFiles[this.getDiskPath(filePath)];
};

FileManager.prototype.setRefreshFileFromCache = function (filePath, data) {
  if (data === null) {
    delete this.refreshFiles[this.getDiskPath(filePath)];
  } else {
    this.refreshFiles[this.getDiskPath(filePath)] = data;
  }
};

FileManager.prototype.load = function (filePath, instance, callback) {
  const fileManager = this;
  return new Promise((resolve, reject) => {
    const path = fileManager.getPath(filePath);

    if (this.getFileFromCache(filePath)) {
      fileManager.processPromise(
        resolve,
        reject,
        filePath,
        instance,
        this.getFileFromCache(filePath),
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
