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
import { MidiManager } from './MidiManager';

const toolClient = new ToolClient();
toolClient.init();

const fullscreen = new Fullscreen();

const settings = new Settings();
const fileManager = new FileManager();
const javaScriptFile = new JavaScriptFile();

const startButton = document.getElementById('start');
const select = document.getElementById('demoList');
const quality = document.getElementById('qualityList');

function setDemoPathPrefix(prefix) {
  settings.engine.demoPathPrefix = prefix;
  if (toolClient.isEnabled()) {
    toolClient.synchronizeSettings();
  }
}

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
      setDemoPathPrefix(select.value);
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
        setDemoPathPrefix(select.value);
        startButton.classList.add('disabled');
        select.classList.add('disabled');
      });

      if (select.value) {
        clearCache();
        setDemoPathPrefix(select.value);
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

function canvasToDataUrl() {
  const canvas = document.getElementById('canvas');
  const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
  return dataUrl;
}

function screenshot() {
  window.open(canvasToDataUrl(), '_blank');
}

let animationFrameId;
let oldTime;
let capture = false;
let frame = -1;
let captureStartTime;
let waitingForFrame = false;
const fps = 60;
const oneFrame = 1000 / fps;

export function setWaitingForFrame(wait) {
  waitingForFrame = wait;
}

function captureStop() {
  if (capture) {
    capture = false;
    toolClient.send({ type: 'CAPTURE_STOP' });
    loggerInfo(
      `Capture ending. Captured ${frame} frames in ${((Date.now() - captureStartTime) / 1000 / 60).toFixed(2)} m`
    );

    alert('Capture ended');
  }
}

function captureFrame() {
  if (settings.engine.tool && capture && waitingForFrame) {
    const roundingSkew = 0.1;
    const newFrame = Math.floor(timer.getTime() / oneFrame + roundingSkew);
    if (newFrame <= frame) {
      return false;
    }

    frame = newFrame;
    // setWaitingForFrame(false);

    toolClient.send({
      type: 'CAPTURE_FRAME',
      dataUrl: canvasToDataUrl(),
      frame,
      time: timer.getTime()
    });

    /* console.log(
      `Frame ${frame} captured at time ${(timer.getTime() / 1000).toFixed(4)} s`
    ); */
    timer.setTime(((frame + 1) * 1000) / fps);
    const checkFrame = Math.floor(timer.getTime() / oneFrame + roundingSkew);
    if (checkFrame !== frame + 1) {
      loggerWarning(
        `Unexpected new frame ${(timer.getTime() / 1000).toFixed(4)} s, oldFrame: ${frame}, newFrame: ${checkFrame}`
      );

      const allowedSkipFrameCount = 7;
      if (checkFrame >= frame && checkFrame <= frame + allowedSkipFrameCount) {
        loggerTrace(
          `Timer inaccuracy detected. Adding frame ${frame - 1} as frames ${frame} to ${checkFrame}`
        );
        for (let i = frame + 1; i < checkFrame; i++) {
          toolClient.send({
            type: 'CAPTURE_FRAME',
            dataUrl: canvasToDataUrl(),
            frame: i,
            time: timer.getTime()
          });
        }
      } else {
        loggerWarning('Timer too inaccurate, ending recording');
        stopDemo();
      }
    }

    return true;
  }

  return false;
}

function animate() {
  toolUi.update();

  if (!capture) {
    toolUi.stats.begin();
  }

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

  if (capture && settings.engine.tool) {
    if (captureFrame()) {
      toolUi.stats.end();
      toolUi.stats.begin();
    }
  } else {
    toolUi.stats.end();
  }

  if (timer.isEnd()) {
    if (settings.engine.tool) {
      captureStop();
      timer.pause(true);
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

  captureStop();

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

window.addEventListener('resize', windowResize, false);

function rewindTime(time) {
  if (Effect.loading) {
    settings.engine.preload = false; // skip preloading
  } else {
    timer.setTime(timer.getTime() + time);
  }
}

if (settings.engine.pauseOnInvisibility) {
  // Especially prevents audio from going onward in iOS or so if requestAnimationFrame is suspended by the OS/browser
  let timerPausedBeforeVisibilityChange = false;
  document.addEventListener('visibilitychange', () => {
    if (!isStarted()) {
      return;
    }

    loggerInfo(`Visibility changed to ${document.hidden}`);
    if (document.hidden) {
      timerPausedBeforeVisibilityChange = timer.isPaused();
    } else {
      if (timerPausedBeforeVisibilityChange) {
        return;
      }
    }

    timer.pause(document.hidden);
  });
}

document.addEventListener('keydown', (event) => {
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
    } else if (event.key === 'Insert') {
      const midiManager = new MidiManager();
      if (midiManager.capture) {
        midiManager.setCaptureOverwrite(!midiManager.isCaptureOverwrite());
      }
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
      if (!toolClient.isEnabled()) {
        alert('Tool server not enabled, cannot capture');
        return;
      }

      if (!confirm('Want to start video capture?')) {
        return;
      }

      timer.pause(true);
      timer.setTime(0);
      captureStartTime = Date.now();
      toolClient.send({ type: 'CAPTURE_START' });

      setTimeout(() => {
        frame = -1;
        capture = true;
        setWaitingForFrame(true);
        captureFrame();
      }, 1000);
    }
  }
});
