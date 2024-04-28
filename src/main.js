import { Effect } from './Effect';
import { loggerTrace, loggerInfo } from './Bindings';
import { LoadingBar } from './LoadingBar';
import { ToolUi } from './ToolUi';
import { DemoRenderer } from './DemoRenderer';
import { FileManager } from './FileManager';
import { JavaScriptFile } from './JavaScriptFile';
import { Timer } from './Timer';
import { Settings } from './Settings';
import { Music } from './Music';

const settings = new Settings();
const fileManager = new FileManager();
const javaScriptFile = new JavaScriptFile();

const startButton = document.getElementById('start');
const select = document.getElementById('demoList');

const Demo = function () {};
export { Demo };
window.Demo = Demo;

function clearCache() {
  settings.init();
  fileManager.init();
  new Music().init();

  if (select) {
    if (select.value) {
      settings.engine.demoPathPrefix = select.value;
    }
    javaScriptFile.load('Demo.js');
  }
}

window.appendDemoToPlaylist = function (name, path) {
  if (select) {
    select.appendChild(new Option(name, path));
  }
};

if (select) {
  // playlist.js is expected to just list available productions, e.g.:  appendDemoToPlaylist('JUHA 001', 'data_juha001/');
  new JavaScriptFile()
    .load('./playlist.js')
    .then(() => {
      select.style.display = 'block';
      select.addEventListener('change', () => {
        clearCache();
        settings.engine.demoPathPrefix = select.value;
        startButton.classList.add('disabled');
        select.classList.add('disabled');
        javaScriptFile.load('Demo.js').finally(() => {
          startButton.classList.remove('disabled');
          select.classList.remove('disabled');
        });
      });

      if (select.value) {
        clearCache();
        settings.engine.demoPathPrefix = select.value;
      } else {
        select.style.display = 'none';
      }
    })
    .catch(() => {
      loggerTrace('Did not load playlist');
    });
}

javaScriptFile.load('Demo.js').then(() => {
  if (import.meta.env.MODE === 'production') {
    startDemo();
  }
});

const timer = new Timer();

let started = false;

const loadingBar = new LoadingBar();

const toolUi = new ToolUi();
toolUi.init();

const demoRenderer = new DemoRenderer();
demoRenderer.init();

let animationFrameId = null;
let oldTime;

export function animate() {
  timer.update();
  toolUi.update();
  toolUi.stats.begin();

  if (loadingBar.percent < 1.0) {
    loadingBar.render();
    toolUi.stats.end();
    requestAnimationFrame(animate);
    return;
  }

  if (fileManager.isNeedsUpdate() && isStarted()) {
    loggerInfo('File manager refresh');
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

  if (timer.isEnd() && !timer.isPaused()) {
    if (settings.engine.tool) {
      timer.pause();
    } else {
      demoRenderer.renderer.clear();
      stopDemo();
      return;
    }
  }

  animationFrameId = requestAnimationFrame(animate);
}

function startDemo() {
  if (Effect.loading) {
    loggerInfo('Effect is loading, not starting');
    return;
  }

  if (started) {
    stopDemo();
  }
  started = true;

  if (startButton) {
    startButton.style.display = 'none';
  }
  if (select) {
    select.style.display = 'none';
  }

  if (settings.engine.tool) {
    toolUi.show();
  }

  const canvas = document.getElementById('canvas');
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

export function stopDemo() {
  console.log('Stopping demo...');

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

  demoRenderer.clear();

  cancelAnimationFrame(animationFrameId);

  const startButton = document.getElementById('start');
  if (startButton) {
    startButton.style.display = 'block';
  }
  if (select && select.children.length > 0) {
    select.style.display = 'block';
  }
  const canvas = document.getElementById('canvas');
  canvas.style.display = 'none';

  started = false;

  clearCache();

  if (settings.engine.webDemoExe) {
    // magic to make the WebDemoExe exit
    window.location.hash = 'webdemoexe_exit';
  }
}

export function isStarted() {
  return started;
}

function reloadDemo() {
  loggerInfo('Reloading demo');
  demoRenderer.setupScene();
  Effect.init('Demo');
}

function windowResize() {
  demoRenderer.resize();
  if (started) {
    reloadDemo();
  }
}

window.addEventListener('resize', windowResize, false);

document.addEventListener('keydown', (event) => {
  if (event.repeat) {
    return;
  }

  if (event.key === 'Escape') {
    stopDemo();
  } else if (event.key === 'Enter') {
    startDemo();
  } else if (settings.engine.tool) {
    if (event.key === '1' || event.key === 'ArrowLeft') {
      timer.setTime(timer.getTime() - 1000);
    } else if (event.key === '2' || event.key === 'ArrowRight') {
      timer.setTime(timer.getTime() + 1000);
    } else if (event.key === 'ArrowDown') {
      timer.setTime(timer.getTime() - 10000);
    } else if (event.key === 'ArrowUp') {
      timer.setTime(timer.getTime() + 10000);
    } else if (event.key === '3' || event.code === 'Space') {
      timer.pause();
    } else if (event.key === 'End') {
      timer.setTimePercent(0.99);
    } else if (event.key === 'Home') {
      timer.setTimePercent(0.0);
    }
  }
});
