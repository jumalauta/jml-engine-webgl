// import * as THREE from 'three';
import Stats from 'stats.js';
// import { GUI } from 'dat.gui';
// import ace from 'ace-builds';
// import 'ace-builds/src-noconflict/mode-javascript';
// import 'ace-builds/src-noconflict/theme-monokai';
// import jsWorkerUrl from "file-loader!ace-builds/src-noconflict/worker-javascript";
// ace.config.setModuleUrl("ace/mode/javascript_worker", jsWorkerUrl)
// editor multiple tabs example: https://codepen.io/zymawy/pen/QRLXNE

import { Timer } from './Timer';
// import { FileManager } from './FileManager'
// import { Settings } from './Settings'

// const settings = new Settings()

/* const gui = new GUI()
const cubeFolder = gui.addFolder('Cube')
cubeFolder.add(cube.rotation, 'x', 0, Math.PI * 2)
cubeFolder.add(cube.rotation, 'y', 0, Math.PI * 2)
cubeFolder.add(cube.rotation, 'z', 0, Math.PI * 2)
cubeFolder.open()
*/
// const cameraFolder = gui.addFolder('Camera')
// cameraFolder.add(camera.position, 'z', 0, 10)
// cameraFolder.open()

const ToolUi = function () {
  return this.getInstance();
};

ToolUi.prototype.getInstance = function () {
  if (!ToolUi.prototype._singletonInstance) {
    ToolUi.prototype._singletonInstance = this;
  }

  return ToolUi.prototype._singletonInstance;
};

ToolUi.prototype.init = function () {
  this.stats = new Stats();
  this.stats.showPanel(0);
  document.body.appendChild(this.stats.dom);

  // const fileManager = new FileManager()

  /* this.editor = ace.edit("editor");
    ace.config.set("basePath",  "ace-builds/src-noconflict");
    this.editor.setTheme("ace/theme/monokai");
    this.editor.session.setMode("ace/mode/javascript");
    this.editor.commands.addCommand({
        name: 'myCommand',
        bindKey: {win: 'Ctrl-S',  mac: 'Command-S'},
        exec: function(editor) {
            for(let i = 0; i < editor.session.getAnnotations().length; i++) {
                let annotation = editor.session.getAnnotations()[i];
                if (annotation.type === "error") {
                    loggerWarning("Not reloading. error on line " + annotation.row + ": " + annotation.text);
                    editor.gotoLine(annotation.row + 1);
                    return;
                }
            }

            fileManager.setFileData("Demo.js", editor.session.getValue());
            fileManager.setNeedsUpdate(true);
            const javaScriptFile = new JavaScriptFile();
            javaScriptFile.load("Demo.js");
        },
        readOnly: true, // false if this command should not apply in readOnly mode
        // multiSelectAction: "forEach", optional way to control behavior with multiple cursors
        // scrollIntoView: "cursor", control how cursor is scolled into view after the command
    });

    fileManager.load('Demo.js', null, (instance, data) => {
        (new ToolUi()).editor.session.setValue(data);
        return true;
    }); */

  this.timelineSlider = document.getElementById('timeline-slider');
  this.timelineSlider.addEventListener(
    'input',
    () => {
      const percentage = this.timelineSlider.value / this.timelineSlider.max;
      new Timer().setTimePercent(percentage);
      // console.log("Manual time change to percentage: " + percentage);
    },
    false
  );

  this.hide();
};

ToolUi.prototype.show = function () {
  this.stats.dom.style.display = 'block';
  this.timelineSlider.style.display = 'block';
};

ToolUi.prototype.hide = function () {
  this.stats.dom.style.display = 'none';
  this.timelineSlider.style.display = 'none';
};

ToolUi.prototype.update = function () {
  this.timelineSlider.value =
    new Timer().getTimePercent() * this.timelineSlider.max;
};

export { ToolUi };
