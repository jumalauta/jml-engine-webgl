import { FileManager } from './FileManager';

const JavaScriptFile = function () {};

JavaScriptFile.prototype.load = function (filename) {
  this.filename = filename;
  const fileManager = new FileManager();
  return fileManager.load(filename, this, (instance, data) => {
    return true;
  });
};

function includeFile(filename) {
  const promise = new JavaScriptFile().load(filename);
  const fileManager = new FileManager();
  fileManager.addFileToWait(promise);
  return promise;
}

window.includeFile = includeFile;

export { JavaScriptFile };
