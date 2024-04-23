import { FileManager } from './FileManager';
import { loggerDebug, loggerWarning } from './Bindings';

var JavaScriptFile = function() {}

JavaScriptFile.prototype.load = function(filename) {
  this.filename = filename;
  const fileManager = new FileManager();
  return fileManager.load(filename, this, (instance, data) => {
    try {
      loggerDebug('Executing JavaScript file: ' + instance.filename);
      //(new DemoRenderer()).setupScene();
      eval(data);
      //Effect.init("Demo");
      fileManager.setNeedsUpdate(true);
    } catch (e) {
      loggerWarning('Error loading JavaScript file: ' + instance.filename + ' ' + e);
      return false;
    }
    return true;
  });
}

export { JavaScriptFile };
