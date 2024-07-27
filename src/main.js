import { Effect } from './Effect';
import {
  loggerDebug,
  loggerInfo,
  loggerTrace,
  loggerWarning,
  loggerError,
  windowSetTitle,
  windowSetTitleTime
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
import { ToolClient } from './ToolClient';

const toolClient = new ToolClient();
toolClient.init();

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

function customizeSettings() {
  setStartTime();

  const enabledLogLevels = new URLSearchParams(window.location.search).get(
    'enabledLogLevels'
  );
  if (enabledLogLevels) {
    settings.engine.enabledLogLevels = enabledLogLevels.split(',');
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
        fileManager.clearCache();
        settings.engine.demoPathPrefix = select.value;
        startButton.classList.add('disabled');
        select.classList.add('disabled');
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
      if (settings.engine.webDemoExe) {
        startDemo();
      }
    });
}

const timer = new Timer();

let started = false;

const loadingBar = new LoadingBar();

const toolUi = new ToolUi();
toolUi.init();

const demoRenderer = new DemoRenderer();

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
    if (fileManager.isNeedsDeepUpdate()) {
      deepReloadDemo();
    } else {
      loggerInfo('Shallow refresh');
      demoRenderer.setRenderNeedsUpdate(true);
      fileManager.markAsUpdated();
    }
  }

  timer.update();
  const time = timer.getTime();
  if (oldTime !== time) {
    if (settings.engine.tool) {
      windowSetTitleTime();
    }
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
  if (canvas) {
    canvas.style.margin = '0px';
    canvas.style.cursor = 'auto';
    canvas.onclick = null;
  }

  if (settings.engine.tool) {
    if (!show) {
      toolUi.hide();
    }
  } else {
    if (canvas && show) {
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

  if (canvas) {
    canvas.style.display = canvasStyle;
  }
}

function stopAnimate() {
  if (animationFrameId !== undefined) {
    loggerTrace('Stopping animation frame');
    cancelAnimationFrame(animationFrameId);
    animationFrameId = undefined;
  }
}

export function startAnimate(time) {
  stopAnimate();
  if (time !== undefined) {
    new Timer().setTime(time);
  }
  animate();
  demoRenderer.resize();
  demoRenderer.setRenderNeedsUpdate(true);
}
window.startAnimate = startAnimate;

function startDemoAnimation() {
  windowResize();
  reloadDemo();
  startAnimate();
}

function startDemo() {
  javaScriptFile
    .load('Demo.js')
    .then(() => {
      loggerTrace('Demo.js loaded');
      customizeSettings();
      restartDemo();
    })
    .catch(() => {
      windowSetTitle('LOADING ERROR');
      loggerError('Could not load demo');
    })
    .finally(() => {
      if (startButton) {
        startButton.classList.remove('disabled');
      }
      if (select) {
        select.classList.remove('disabled');
      }
    });
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

  demoRenderer.init();

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
  demoRenderer.deinit();
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
  settings.engine.preload = false; // deep reload should not do preloading
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

function captureFrame() {
  const canvas = document.getElementById('canvas');
  const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
  return dataUrl;
}

function screenshot() {
  window.open(captureFrame(), '_blank');
}

window.addEventListener('resize', windowResize, false);

function rewindTime(time) {
  if (Effect.loading) {
    settings.engine.preload = false; // skip preloading
  } else {
    timer.setTime(timer.getTime() + time);
  }
}

document.addEventListener('keydown', (event) => {
  const fps = 60;
  const oneFrame = 1000 / fps;
  if (event.repeat) {
    return;
  }

  if (event.key === 'Escape') {
    stopDemo();
  } else if (event.key === 'Enter') {
    startDemo();
  } else if (settings.engine.tool) {
    if (event.key === 'ArrowLeft') {
      rewindTime(-1000);
    } else if (event.key === 'ArrowRight') {
      rewindTime(1000);
    } else if (event.key === 'ArrowDown') {
      rewindTime(-oneFrame);
    } else if (event.key === 'ArrowUp') {
      rewindTime(oneFrame);
    } else if (event.key === 'PageDown') {
      rewindTime(-10000);
    } else if (event.key === 'PageUp') {
      rewindTime(10000);
    } else if (event.code === 'Space') {
      timer.pause();
    } else if (event.key === '0') {
      /* performance.measureUserAgentSpecificMemory().finally((result) => {
        console.log(result);
      }); */

      console.log(demoRenderer.renderer.info);
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
    } else if (event.key === 'p' && isStarted()) {
      const frameDelay = 20;
      const estimate = (frameDelay * timer.getEndTime()) / 1000 / 60;
      if (
        !confirm(
          `Want to start video capture? Estimated time: ${estimate.toFixed(2)} m`
        )
      ) {
        return;
      }

      timer.pause(true);
      timer.setTime(0);
      let frame = 0;
      const startTime = Date.now();
      toolClient.send({ type: 'CAPTURE_START' });

      setTimeout(() => {
        const intervalId = setInterval(() => {
          toolClient.send({
            type: 'CAPTURE_FRAME',
            dataUrl: captureFrame(),
            frame: frame++
          });
          timer.setTime(timer.getTime() + oneFrame);
          if (timer.isEnd() || !isStarted()) {
            toolClient.send({ type: 'CAPTURE_STOP' });
            clearInterval(intervalId);
            loggerInfo(
              `Capture ending. Captured ${frame} frames in ${Date.now() - startTime} ms`
            );
          }
        }, frameDelay);
      }, 1000);
    }
  }
});
