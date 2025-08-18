import * as THREE from 'three';
import { TTFLoader } from 'three/addons/loaders/TTFLoader';
import { OBJLoader } from 'three/addons/loaders/OBJLoader';
import { MTLLoader } from 'three/addons/loaders/MTLLoader';
import {
  loggerTrace,
  loggerDebug,
  loggerInfo,
  loggerWarning
} from './Bindings';
import { Image } from './Image';
import { Text } from './Text';
import { Model } from './Model';
import { ToolClient } from './ToolClient';
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
import { Shader } from './Shader';

THREE.Cache.enabled = true;

const settings = new Settings();

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
  this.promises = [];
  Text.clearCache();
};

FileManager.prototype.addFileToWait = function (promise) {
  if (!(promise instanceof Promise)) {
    throw new Error('Invalid promise provided to FileManager');
  }
  this.promises.push(promise);
};

FileManager.prototype.waitForFilesToLoad = async function () {
  const promises = this.promises;
  this.promises = [];
  if (promises.length === 0) {
    return true;
  }

  return Promise.all(promises)
    .then(() => {
      loggerTrace('All files loaded: ' + promises.length);
      return true;
    })
    .catch((e) => {
      loggerWarning('Encountered issues when loading files: ' + e);
      return false;
    });
};

FileManager.prototype.init = function () {
  this.fileReferences = {};
  if (!this.needsUpdateFiles) {
    this.needsUpdateFiles = [];
  }

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
  if (!settings.engine.tool) return;
  try {
    const toolClient = new ToolClient();
    await toolClient.request('fs.stopWatch');
  } catch (e) {
    loggerInfo('Failed to stop file watching: ' + e);
  }
};

FileManager.prototype.loadJavaScriptFile = async function (filePath) {
  return new Promise(async (resolve, reject) => {
    const path = this.getPath(filePath);
    const cacheBuster = Date.now();

    try {
      const response = await fetch(`${path}?t=${cacheBuster}`);
      const sourceCode = await response.text();

      // trying to avoid "Identifier has already been declared" type of errors
      // other way would be to wrap and call the source code using eval()
      // but that would make stack traces more difficult to read - we want to maintain readability
      const transformedCode = sourceCode
        .replace(/^(\s*)const\s+/gm, '$1var ')
        .replace(/^(\s*)let\s+/gm, '$1var ')
        .replace(/^(\s*)class\s+(\w+)/gm, '$1var $2 = class $2')
        .replace(/^(\s*)function\s+(\w+)/gm, '$1var $2 = function $2');

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.innerHTML = transformedCode;
      script.innerHTML += `\n//# sourceURL=${path}?t=${cacheBuster}`;

      script.onerror = () => {
        loggerWarning(`Failed to load script: ${path}`);
        reject(`Failed to load script: ${path}`);
      };

      const existingScript = document.querySelector(
        `script[data-file-path="${path}"]`
      );
      if (existingScript) {
        existingScript.remove();
      }

      script.setAttribute('data-file-path', path);
      document.head.appendChild(script);

      loggerDebug(`Loaded JavaScript file: ${path}`);
      resolve();
    } catch (error) {
      loggerWarning(
        `Failed to load JavaScript file: ${path} - ${error.message}`
      );
      reject(error);
    }
  });
};

FileManager.prototype.loadUpdatedFiles = async function () {
  for (const filePath of this.needsUpdateFiles) {
    if (this.getFileFromCache(filePath)) {
      loggerTrace('File updated: ' + filePath);
      if (filePath.toUpperCase().endsWith('.JS')) {
        try {
          await this.loadJavaScriptFile(filePath);
        } catch (e) {
          loggerWarning('Error loading JavaScript file: ' + filePath + ' ' + e);
        }
      }
    }
  }

  this.markAsUpdated();
};

FileManager.prototype.setReference = function (filePath, reference) {
  if (!(reference instanceof Shader)) {
    throw new Error('Internal error: invalid reference provided: ' + filePath);
  }

  const path = filePath;
  this.monitorFile(path);

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

  const path = filePath;

  if (this.fileReferences[path]) {
    this.fileReferences[path].forEach((ref) => {
      if (ref instanceof Shader) {
        if (ref.hotreload(path)) {
          updated = true;
        }
      } else {
        loggerDebug(
          `Unrecognized reference type for: ${path} - ${ref.constructor?.name}`
        );
      }
    });
  }

  return updated;
};

FileManager.prototype.setFileChanged = function (
  filePath,
  content,
  diffContent
) {
  if (!content) {
    loggerTrace(`File changed but no content provided: ${filePath}`);
    return;
  }

  loggerInfo(`File changed: ${filePath}`);

  if (diffContent) {
    loggerInfo(`File change diff: ${filePath}\n${diffContent}`);
  }

  const data = atob(content);

  const loaderPath = this.getUrl(filePath);
  THREE.Cache.remove('file:' + loaderPath);
  THREE.Cache.remove('image:' + loaderPath);

  this.setFileFromCache(filePath, data);
  this.setFileNeedsUpdate(filePath);

  if (!this.updateReferences(filePath)) {
    this.needsDeepUpdate = true;
  }
};

FileManager.prototype.setFileNeedsUpdate = function (filePath) {
  this.needsUpdateFiles.push(filePath);
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
        rejectPromise = false;
      } else {
        loggerWarning('Callback failed');
      }
    } catch (e) {
      loggerWarning(`Received exception: ${e}`);
    }
  } else {
    rejectPromise = false;
  }

  if (!rejectPromise) {
    loggerDebug(
      `${this.getInstanceName(instance)} file(s) loaded: ${filePathString}`
    );
    rejectPromise = false;
    resolve(data);
  } else {
    loggerWarning(
      `${this.getInstanceName(instance)} file(s) could not be loaded: ${filePathString}`
    );

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

FileManager.prototype.getPathDirectory = function (filePath) {
  const path = this.getPath(filePath);
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash === -1) {
    return '';
  }
  return path.substring(0, lastSlash + 1);
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

        return true;
      })
      .catch((e) => {
        loggerWarning(
          `File(s) could not be loaded: ${filePaths.join(', ')}: ${e}`
        );
        reject(e);
      });
  });
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

FileManager.prototype.monitorFile = function (filePath) {
  if (
    settings.engine.tool &&
    !filePath.startsWith('_embedded/') &&
    !filePath.endsWith('.fbo') &&
    filePath !== 'spectogram.png' &&
    filePath !== './playlist.js'
  ) {
    try {
      const toolClient = new ToolClient();
      toolClient.notify('fs.monitorFile', { path: filePath });
    } catch (err) {
      loggerDebug(`Failed to start monitoring file: ${filePath}: ${err}`);
    }
  }
};

FileManager.prototype.load = function (filePath, instance, callback) {
  const fileManager = this;
  return new Promise(async (resolve, reject) => {
    const path = fileManager.getPath(filePath);
    fileManager.monitorFile(filePath);

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

    const cacheData = this.getFileFromCache(filePath);
    if (Loader === THREE.FileLoader) {
      if (filePath.toUpperCase().endsWith('.JS')) {
        try {
          await this.loadJavaScriptFile(filePath);
        } catch (err) {
          loggerWarning(`Failed to load JavaScript file: ${filePath}: ${err}`);
          reject(instance);
        }
      }

      if (cacheData) {
        fileManager.processPromise(
          resolve,
          reject,
          filePath,
          instance,
          cacheData,
          callback
        );
        return;
      }
    }

    new Loader().load(
      this.getUrl(filePath),
      // onLoad callback
      (data) => {
        if (data[0] === '<') {
          const logMethod =
            path === './playlist.js' ? loggerTrace : loggerWarning;
          logMethod(
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
      },
      // onProgress callback
      undefined,
      // onError callback
      (err) => {
        // spectogram.png is an info message not a warning
        const instanceName = fileManager.getInstanceName(instance);
        const logMethod =
          instanceName === 'Image' &&
          path.endsWith(`/${settings.demo.music.spectogramFile}`)
            ? loggerInfo
            : loggerWarning;
        logMethod(`${instanceName} file could not be loaded: ${path}: ${err}`);
        if (instance) {
          instance.error = true;
        }
        reject(instance);
      }
    );
  });
};

export { FileManager };
