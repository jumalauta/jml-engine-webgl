import * as THREE from 'three';
import fs from 'vite-plugin-fs/browser';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader';
import { MTLLoader } from 'three/addons/loaders/MTLLoader';
import { loggerWarning, loggerDebug } from './legacy/Bindings';
import { Image } from './legacy/Image';
import { Text } from './legacy/Text';
import { Model } from './legacy/Model';
import { Settings } from './Settings';

THREE.Cache.enabled = true;

const settings = new Settings();

var FileManager = function() {
  return this.getInstance();
}

FileManager.prototype.getInstance = function() {
  if (!FileManager.prototype._singletonInstance) {
    this.init();
    FileManager.prototype._singletonInstance = this;
  }

  return FileManager.prototype._singletonInstance;
}

FileManager.prototype.init = function() {
  this.files = {};
  this.refreshFiles = {};
  this.needsUpdate = false;
}

FileManager.prototype.stopWatchFileChanges = async function() {
  if (this.intervalFunction) {
    clearInterval(this.intervalFunction);
  }
}

FileManager.prototype.startWatchFileChanges = async function() {
  if (settings.engine.tool) {
    this.stopWatchFileChanges();

    this.intervalFunction = setInterval(async () => {
      const fileManager = new FileManager();
      await fileManager.checkFiles();
    }, settings.engine.fileWatchInterval);
  }
}

FileManager.prototype.checkFiles = async function() {
  try {
    const fileManager = new FileManager();
    for (const filePath in fileManager.refreshFiles) {
      const path = fileManager.getPath(filePath);
      const stats = await fs.stat(path);
      if (stats.mtime > fileManager.refreshFiles[filePath]) {
        loggerDebug("File changed: " + filePath);

        fileManager.refreshFiles[filePath] = stats.mtime;
        fileManager.setNeedsUpdate(true);

        const file = await fs.readFile(path);
        if (fileManager.files[filePath]) {
          fileManager.setFileData(filePath, file);

          if (path.toUpperCase().endsWith(".JS")) {
            try {
              loggerDebug('Executing JavaScript file: ' + filePath);
              eval(file);
            } catch (e) {
              loggerWarning('Error loading JavaScript file: ' + filePath + ' ' + e);
            }
          }
        }  
      }
    }
  } catch (e) {
    loggerDebug('Error checking files: ' + e);
  }
}

FileManager.prototype.setNeedsUpdate = function(needsUpdate) {
  this.needsUpdate = needsUpdate;
}

FileManager.prototype.isNeedsUpdate = function() {
  return this.needsUpdate;
}

FileManager.prototype.setFileData = function(filePath, data) {
  if (filePath instanceof Array) {
    for (let i = 0; i < filePath.length; i++) {
      this.files[filePath[i]] = data[i];
    }
  } else {
    this.files[filePath] = data;
  }
}

FileManager.prototype.getFileData = function(filePath) {
  return this.files[filePath];
}

FileManager.prototype.getInstanceName = function(instance) {
  if (instance) {
    return instance.constructor.name;
  }
  return 'Unknown';
}

FileManager.prototype.processPromise = function(resolve, reject, filePath, instance, data, callback) {
  let filePathString = filePath;
  if (filePathString instanceof Array) {
    filePathString = filePathString.join(", ");
  }

  if (callback) {
    try {
      if (callback(instance, data)) {
        if (!((instance instanceof Image) || (instance instanceof Text) || (instance instanceof Model))) {
          this.setFileData(filePath, data);
        }
        loggerDebug(`${this.getInstanceName(instance)} file(s) loaded: ${filePathString}`);
        resolve(data);
      } else {
        throw new Error("Callback failed");
      }
    } catch (e) {
      loggerWarning(`${this.getInstanceName(instance)} file(s) could not be loaded: ${filePathString}`);
      if (instance) {
        instance.error = true;
      }
      reject(data);
    }
  } else {
    loggerWarning(`${this.getInstanceName(instance)} file(s) could not be loaded, no callback defined: ${filePathString}`);
    if (instance) {
      instance.error = true;
    }
    reject(data);
  }
}

FileManager.prototype.getPath = function(filePath) {
  if (!filePath.startsWith("_embedded/")) {
    return settings.engine.demoPathPrefix + filePath;
  }
  return filePath;
}

FileManager.prototype.loadFiles = function(filePaths, instance, callback) {
  const fileManager = this;
  if (!(filePaths instanceof Array)) {
    filePaths = [filePaths];
  }

  return new Promise((resolve, reject) => {
    let promises = [];
    for (let i = 0; i < filePaths.length; i++) {
      promises.push(this.load(filePaths[i], instance, (instance, data) => { return true; }));
    }

    Promise.all(promises).then((values) => {
      fileManager.processPromise(resolve, reject, filePaths, instance, values, callback);
    }).catch((e) => {
      loggerWarning(`File(s) could not be loaded: ${filePaths.join(", ")}: ${e}`);
      reject(e);
    });
  });

}


FileManager.prototype.setRefreshFileTimestamp = function(filePath) {
  if (this.refreshFiles[filePath]) {
    return null;
  }

  const path = this.getPath(filePath);
  fs.stat(path).then(stats => {
    this.refreshFiles[filePath] = stats.mtime;
  });
}

FileManager.prototype.load = function(filePath, instance, callback) {
  const fileManager = this;
  return new Promise((resolve, reject) => {
    const path = fileManager.getPath(filePath);
    fileManager.setRefreshFileTimestamp(filePath);

    if (this.files[filePath]) {
      fileManager.processPromise(resolve, reject, filePath, instance, this.files[filePath], callback);
      return;
    }

    let loader = THREE.FileLoader;
    if (instance instanceof Image) {
      loader = THREE.TextureLoader;
    } else if (instance instanceof Text) {
      loader = TTFLoader;
    } else if (instance instanceof Model) {
      if (filePath.toUpperCase().endsWith(".OBJ")) {
        loader = OBJLoader;
      } else if (filePath.toUpperCase().endsWith(".MTL")) {
        loader = MTLLoader;
      } else {
        throw new Error("3D Model fileformat not supported: " + filePath);
      }
    }

    (new loader()).load(
    path,
    // onLoad callback
    (data) => {
      if (data[0] === '<') {
        loggerWarning(`${fileManager.getInstanceName(instance)} file not found: ${path}`);
        if (instance) {
          instance.error = true;
        }
        reject(instance);
        return;    
      }

      fileManager.processPromise(resolve, reject, filePath, instance, data, callback);
    },
    // onProgress callback
    undefined,
    // onError callback
    (err) => {
      loggerWarning(`${fileManager.getInstanceName(instance)} file could not be loaded: ${path}`);
      if (instance) {
          instance.error = true;
      }
      reject(instance);
    });
  });
}


export { FileManager };