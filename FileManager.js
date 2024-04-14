import * as THREE from 'three';
import { loggerWarning, loggerDebug } from './legacy/Bindings';
import { Image } from './legacy/Image';

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

FileManager.prototype.setFileData = function(url, data) {
  this.files[url] = data;
}

FileManager.prototype.getInstanceName = function(instance) {
  if (instance) {
    return instance.constructor.name;
  }
  return 'Unknown';
}

FileManager.prototype.processPromise = function(resolve, reject, url, instance, data, callback) {
  if (callback) {
    try {
      if (callback(instance, data)) {
        if (!(instance instanceof Image)) {
          this.setFileData(url, data);
        }
        loggerDebug(`${this.getInstanceName(instance)} file loaded: ${url}`);
        resolve(instance);
      } else {
        throw new Error("Callback failed");
      }
    } catch (e) {
      loggerWarning(`${this.getInstanceName(instance)} file could not be loaded: ${url}`);
      if (instance) {
        instance.error = true;
      }
      reject(instance);
    }
  } else {
    loggerWarning(`${this.getInstanceName(instance)} file could not be loaded, no callback defined: ${url}`);
    if (instance) {
      instance.error = true;
    }
    reject(instance);
  }
}

FileManager.prototype.load = function(url, instance, callback) {
  const fileManager = this;
  return new Promise((resolve, reject) => {
    if (this.files[url]) {
      fileManager.processPromise(resolve, reject, url, instance, this.files[url], callback);
      return;
    }

    let loader = THREE.FileLoader;
    if (instance instanceof Image) {
      loader = THREE.TextureLoader;
    }

    (new loader()).load(
    url,
    // onLoad callback
    (data) => {
      if (data[0] === '<') {
        loggerWarning(`${fileManager.getInstanceName(instance)} file not found: ${url}`);
        if (instance) {
          instance.error = true;
        }
        reject(instance);
        return;    
      }

      fileManager.processPromise(resolve, reject, url, instance, data, callback);
    },
    // onProgress callback
    undefined,
    // onError callback
    (err) => {
      loggerWarning(`${fileManager.getInstanceName(instance)} file could not be loaded: ${url}`);
      if (instance) {
          instance.error = true;
      }
      reject(instance);
    }
  );});
}

export { FileManager };