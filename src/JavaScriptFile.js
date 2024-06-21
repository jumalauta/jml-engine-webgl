import { FileManager } from './FileManager';
import { loggerDebug, loggerWarning } from './Bindings';

const JavaScriptFile = function () {};

JavaScriptFile.prototype.load = function (filename) {
  this.filename = filename;
  const fileManager = new FileManager();
  return fileManager.load(filename, this, (instance, data) => {
    try {
      loggerDebug(
        'Executing JavaScript file: ' + fileManager.getPath(instance.filename)
      );
      // (new DemoRenderer()).setupScene();
      /* eslint-disable no-eval */
      eval(data);
    } catch (e) {
      loggerWarning(
        'Error loading JavaScript file: ' + instance.filename + ' ' + e
      );
      return false;
    }
    return true;
  });
};

function includeFile(filename) {
  return new JavaScriptFile().load(filename);
}

window.includeFile = includeFile;

export { JavaScriptFile };
