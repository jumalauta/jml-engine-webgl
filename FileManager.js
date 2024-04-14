import * as THREE from 'three';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader';
import { MTLLoader } from 'three/addons/loaders/MTLLoader';
import { loggerWarning, loggerDebug } from './legacy/Bindings';
import { Image } from './legacy/Image';
import { Text } from './legacy/Text';
import { Model } from './legacy/Model';
import { Settings } from './Settings';

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

FileManager.prototype.load = function(filePath, instance, callback) {
  const fileManager = this;
  return new Promise((resolve, reject) => {
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

    let path = filePath;
    if (!path.startsWith("_embedded/")) {
      path = settings.engine.demoPathPrefix + filePath;
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