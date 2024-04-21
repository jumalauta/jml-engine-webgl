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

THREE.Cache.enabled = false;

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

  if (settings.engine.tool) {
    setInterval(async () => {
      const fileManager = new FileManager();
      await fileManager.checkFiles();
    }, 250);  
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

        const file = await fs.readFile(path);
        if (fileManager.files[filePath]) {
          fileManager.setFileData(filePath, file);
          fileManager.setNeedsUpdate(true);

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
  this.files[filePath] = data;
}

FileManager.prototype.getInstanceName = function(instance) {
  if (instance) {
    return instance.constructor.name;
  }
  return 'Unknown';
}

FileManager.prototype.processPromise = function(resolve, reject, filePath, instance, data, callback) {
  if (callback) {
    try {
      if (callback(instance, data)) {
        if (!(instance instanceof Image) || !(instance instanceof Text) || !(instance instanceof Model)) {
          this.setFileData(filePath, data);
        }
        loggerDebug(`${this.getInstanceName(instance)} file loaded: ${filePath}`);
        resolve(instance);
      } else {
        throw new Error("Callback failed");
      }
    } catch (e) {
      loggerWarning(`${this.getInstanceName(instance)} file could not be loaded: ${filePath}`);
      if (instance) {
        instance.error = true;
      }
      reject(instance);
    }
  } else {
    loggerWarning(`${this.getInstanceName(instance)} file could not be loaded, no callback defined: ${filePath}`);
    if (instance) {
      instance.error = true;
    }
    reject(instance);
  }
}

FileManager.prototype.getPath = function(filePath) {
  if (!filePath.startsWith("_embedded/")) {
    return settings.engine.demoPathPrefix + filePath;
  }
  return filePath;
}

FileManager.prototype.load = function(filePath, instance, callback) {
  const fileManager = this;
  return new Promise((resolve, reject) => {
    const path = fileManager.getPath(filePath);
    if (!fileManager.refreshFiles[filePath]) {
      fs.stat(path).then(stats => {
        fileManager.refreshFiles[filePath] = stats.mtime;
      });
    }

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
    }
  );});
}


export { FileManager };