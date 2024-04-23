import {Effect} from './Effect';
import { loggerInfo } from './Bindings';
import { LoadingBar } from './LoadingBar';
import { ToolUi } from './ToolUi';
import { DemoRenderer  } from './DemoRenderer';
import { FileManager } from './FileManager';
import { JavaScriptFile } from './JavaScriptFile';
import { Timer } from './Timer';
import { Settings } from './Settings';

const settings = new Settings();
const fileManager = new FileManager();
const javaScriptFile = new JavaScriptFile();
javaScriptFile.load("Demo.js").then(() => {  
  if (import.meta.env.MODE === 'production') {
    startDemo();
  }
});

const timer = new Timer();

let started = false;

var Demo = function() {};
export {Demo};
window.Demo = Demo;

const loadingBar = new LoadingBar();

const toolUi = new ToolUi();
toolUi.init();

const demoRenderer = new DemoRenderer();
demoRenderer.init();


let animationFrameId = null;
let oldTime = undefined;

export function animate() {
  timer.update();
  toolUi.update();
  toolUi.stats.begin();

  if (loadingBar.percent < 1.0) {
    loadingBar.render();
	  toolUi.stats.end();
    requestAnimationFrame( animate );
    return;
  }

  if (fileManager.isNeedsUpdate()) {
    loggerInfo("File manager refresh")
    fileManager.setNeedsUpdate(false);
    reloadDemo();
  }

  const time = timer.getTime();
  if (oldTime !== time) {
    oldTime = time;
    demoRenderer.setRenderNeedsUpdate(true);
  }

  if (demoRenderer.isRenderNeedsUpdate()) {
    demoRenderer.render();
  }

  toolUi.stats.end();

  if (timer.isEnd() && !timer.isPaused()){
    if (settings.engine.tool) {
      timer.pause();
    } else {
	    demoRenderer.renderer.clear();
	    stopDemo();
	    return;
    }
	
  }

  animationFrameId = requestAnimationFrame( animate );
}

function startDemo() {
  if (started) {
    stopDemo();
  }
  started = true;

	const startButton = document.getElementById('start');
	if (startButton) {
		startButton.style.display = 'none';
	}

  if (settings.engine.tool) {
    toolUi.show();
  }

	canvas.style.display = 'block';
	canvas.style.margin = '0px';
  if (!settings.engine.tool) {
    canvas.style.cursor = 'none'; 
  }
	
  if (settings.menu.fullscreen) {
    if (canvas.requestFullscreen) {
      canvas.requestFullscreen();
    } else if (canvas.webkitRequestFullscreen) {
      canvas.webkitRequestFullscreen();
    } else if (canvas.msRequestFullscreen) {
      canvas.msRequestFullscreen();
    }
  }

  setTimeout(() => {
    windowResize();
    animate();  
  }, settings.engine.startDelay);
}
window.startDemo = startDemo;

function stopDemo() {
  console.log("Stopping demo...");
  
  timer.stop();
  toolUi.hide();
  
  if (settings.menu.fullscreen) {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  cancelAnimationFrame(animationFrameId);
  
  const startButton = document.getElementById('start');
  if (startButton) {
	  startButton.style.display = 'block';
  }
  canvas.style.display = 'none';

  started=false;

  if (settings.engine.webDemoExe) {
    // magic to make the WebDemoExe exit
    window.location.hash='webdemoexe_exit';
  }
}

function reloadDemo() {
  loggerInfo("Reloading demo");
  demoRenderer.setupScene();
  Effect.init("Demo");
}

function windowResize() {
  demoRenderer.resize();
  if (started) {
    reloadDemo();
  }
}

window.addEventListener( 'resize', windowResize, false );

document.addEventListener('keydown', (event) => {
	if (event.repeat) {
		return;
	}
	
	if (event.key === 'Escape') {
	  stopDemo();
	} else if (event.key === 'Enter') {
	  startDemo();
	} else if (event.altKey && settings.engine.tool) {
		if (event.key === '1') {
			timer.setTime(timer.getTime() - 1000);
		} else if (event.key === '2') {
			timer.setTime(timer.getTime() + 1000);
		} else if (event.key === '3') {
			timer.pause();
		} else if (event.ctrlKey && event.key === 'End') {
			timer.setTimePercent(0.99);
		} else if (event.ctrlKey && event.key === 'Home') {
			timer.setTimePercent(0.0);
		}
	}	
});

