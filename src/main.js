import { Effect } from './Effect';
import {
  loggerDebug,
  loggerInfo,
  loggerTrace,
  loggerWarning,
  windowSetTitle
} from './Bindings';
import { LoadingBar } from './LoadingBar';
import { ToolUi } from './ToolUi';
import { DemoRenderer } from './DemoRenderer';
import { FileManager } from './FileManager';
import { JavaScriptFile } from './JavaScriptFile';
import { Timer } from './Timer';
import { Settings } from './Settings';
import { Music } from './Music';
import { Fullscreen } from './Fullscreen';

const fullscreen = new Fullscreen();

const settings = new Settings();
const fileManager = new FileManager();
const javaScriptFile = new JavaScriptFile();

const startButton = document.getElementById('start');
const select = document.getElementById('demoList');
const quality = document.getElementById('qualityList');

function setStartTime() {
  const startTime = new URLSearchParams(window.location.search).get('time');
  if (startTime) {
    settings.engine.startTime = parseInt(startTime);
  }
}

const Demo = function () {};
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
  // playlist.js is expected to just list available productions, e.g., appendDemoToPlaylist('JUHA 001', 'data_juha001/');
  new JavaScriptFile()
    .load('./playlist.js')
    .then(() => {
      loggerDebug('Initializing playlist');

      // auto-select the demo from the URL parameter if given
      const selectValue = new URLSearchParams(window.location.search).get(
        'select'
      );
      if (selectValue) {
        select.value = `${selectValue}/`;
      }

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
    .catch((e) => {
      loggerDebug('No playlist.js found, loading default demo...: ' + e);
      select.style.display = 'none';
      // load Demo from default path if playlist.js is not defined
      javaScriptFile.load('Demo.js').then(() => {
        if (settings.engine.webDemoExe) {
          startDemo();
        }
      });
    });
}

const timer = new Timer();

let started = false;

const loadingBar = new LoadingBar();

const toolUi = new ToolUi();
toolUi.init();

const demoRenderer = new DemoRenderer();
demoRenderer.init();

let animationFrameId;
let oldTime;

function animate() {
  toolUi.update();
  toolUi.stats.begin();

  if (loadingBar.percent < 1.0) {
    loadingBar.render();
    toolUi.stats.end();
    animationFrameId = requestAnimationFrame(animate);
    return;
  }

  if (fileManager.isNeedsUpdate() && isStarted()) {
    loggerInfo('File manager refresh');
    reloadDemo();
  }

  timer.update();
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

function togglePlayerUserInterface(show) {
  const canvas = document.getElementById('canvas');
  canvas.style.margin = '0px';
  canvas.style.cursor = 'auto';
  canvas.onclick = null;

  if (settings.engine.tool) {
    if (!show) {
      toolUi.hide();
    }
  } else {
    if (show) {
      canvas.style.cursor = 'none';
      if (!settings.engine.webDemoExe) {
        canvas.onclick = () => {
          // have a gesture mainly for the touch devices to stop the demo
          stopDemo();
        };
      }
    }
  }

  const elementStyle = !show ? 'block' : 'none';
  const canvasStyle = show ? 'block' : 'none';

  fullscreen.toggleFullscreenCheckboxVisibility(!show);

  if (startButton) {
    startButton.style.display = elementStyle;
  }
  if (select && select.value) {
    select.style.display = elementStyle;
  }
  if (quality) {
    quality.style.display = elementStyle;
    settings.menu.quality = parseFloat(quality.value || 1.0);
  }
  canvas.style.display = canvasStyle;
}

function stopAnimate() {
  if (animationFrameId !== undefined) {
    loggerTrace('Stopping animation frame');
    cancelAnimationFrame(animationFrameId);
    animationFrameId = undefined;
  }
}

function startAnimate() {
  stopAnimate();
  animate();
}

function startDemoAnimation() {
  windowResize();
  reloadDemo();
  startAnimate();
}

function startDemo() {
  setStartTime();
  restartDemo();
}

function restartDemo() {
  if (Effect.loading) {
    loggerInfo('Effect is loading, not starting');
    return;
  }

  windowSetTitle('JML Engine');

  if (started) {
    stopDemo();
  }
  started = true;

  togglePlayerUserInterface(true);

  // HTML5 audio tag needs to be used so that WebAudio can be played also when Apple device hardware mute switch is ON
  const appleSilence = document.getElementById('appleSilence');
  if (appleSilence) {
    appleSilence.onseeked = () => {
      loggerDebug('AppleSilence ended');
      appleSilence.onseeked = null;
      startDemoAnimation(); // now we should have WebAudio context assuming silence is playing in the background
    };
    appleSilence.onerror = () => {
      // this might mean that audio won't play with Apple hardware mute switch ON
      loggerWarning('error in playing silence');
      if (appleSilence.onseeked) {
        appleSilence.onseeked();
      }
    };

    appleSilence.load();
    appleSilence.play();
  } else {
    startDemoAnimation();
  }
}
window.startDemo = startDemo;

export function stopDemo() {
  loggerInfo('Stopping demo...');

  timer.stop();

  demoRenderer.clear();

  stopAnimate();

  togglePlayerUserInterface(false);

  started = false;

  demoRenderer.cleanScene(true);
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

function deepReloadDemo() {
  loggerInfo('Deep reload demo');
  const isPause = timer.isPaused();
  const time = timer.getTime();
  stopDemo();
  restartDemo();
  settings.engine.startTime = time;
  if (isPause) {
    timer.pause();
  }
}

function windowResize() {
  demoRenderer.resize();
  demoRenderer.setRenderNeedsUpdate(true);
}

function screenshot() {
  const canvas = document.getElementById('canvas');
  const dataUrl = canvas.toDataURL('image/png');
  window.open(dataUrl, '_blank');
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
    } else if (event.key === 'r') {
      deepReloadDemo();
    } else if (event.key === 'f') {
      fullscreen.toggleFullscreen(!fullscreen.isFullscreen());
    } else if (event.key === 's') {
      screenshot();
    } else if (event.key === 't') {
      if (toolUi.isVisible()) {
        toolUi.hide();
      } else {
        toolUi.show();
      }

      windowResize();
    } else if (event.key === 'End') {
      timer.setTimePercent(0.99);
    } else if (event.key === 'Home') {
      timer.setTimePercent(0.0);
    }
  }
});
