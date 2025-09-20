import { Effect } from './Effect';
import {
  loggerDebug,
  loggerInfo,
  loggerTrace,
  loggerWarning,
  loggerError,
  windowSetTitle,
  windowSetTitleTime,
  showAlertBanner
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
import { Utils } from './Utils';
import { ToolClient } from './ToolClient';
import { MidiManager } from './MidiManager';
import { Video } from './Video';

const toolClient = new ToolClient();
toolClient.init();

const fullscreen = new Fullscreen();

const settings = new Settings();
const fileManager = new FileManager();
const javaScriptFile = new JavaScriptFile();

const startButton = document.getElementById('start');
const select = document.getElementById('demoList');
const quality = document.getElementById('qualityList');

const playlistOptions = {};
function setDemoPathPrefix(prefix) {
  const options = playlistOptions[prefix];
  if (options) {
    toggleDemoPlayer();
    const playerLink = document.getElementById('playerLink');
    if (playerLink) {
      playerLink.style.display = 'none';
    }
    const youtubeLink = document.getElementById('youtubeLink');
    if (youtubeLink) {
      if (options.youtube) {
        youtubeLink.style.display = 'block';
        playerLink.style.display = 'none';
      } else {
        youtubeLink.style.display = 'none';
      }
    }
  }

  settings.engine.demoPathPrefix = prefix;
  if (toolClient.isConnected()) {
    toolClient.synchronizeSettings();
  }
}

function setPlayerTimes() {
  const startTime = new URLSearchParams(window.location.search).get(
    'startTime'
  );
  if (startTime) {
    settings.engine.startTime = parseInt(startTime);
  }

  const loopAtTime = new URLSearchParams(window.location.search).get(
    'loopAtTime'
  );
  if (loopAtTime) {
    settings.engine.loopAtTime = parseInt(loopAtTime);
  }
}

function customizeSettings() {
  setPlayerTimes();

  const queryParams = new URLSearchParams(window.location.search);

  const enabledLogLevels = queryParams.get('enabledLogLevels');
  if (enabledLogLevels) {
    settings.engine.enabledLogLevels = enabledLogLevels.split(',');
  }

  const preload = queryParams.get('preload');
  if (preload) {
    settings.engine.preload = preload === 'true';
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
    javaScriptFile.load('Demo.js').catch(() => {
      windowSetTitle('LOADING ERROR');
      loggerError('Could not load demo');
    });
  }
}

window.toggleDemoPlayer = function () {
  const startButton = document.getElementById('start');
  if (startButton) {
    startButton.style.display = 'block';
  }

  const oldScreenshot = document.getElementById('screenshot');
  if (oldScreenshot) {
    oldScreenshot.remove();
  }

  const options = playlistOptions[settings.engine.demoPathPrefix];
  if (options?.screenshot) {
    const screenshot = document.createElement('img');
    screenshot.id = 'screenshot';
    screenshot.src = options.screenshot;
    screenshot.style.width = '20em';
    const startButton = document.getElementById('start');
    if (startButton.parentNode) {
      startButton.parentNode.insertBefore(
        screenshot,
        startButton.previousSibling
      );
    }
  }

  const youtubePlayer = document.getElementById('youtubePlayer');
  if (youtubePlayer) {
    youtubePlayer.remove();
  }

  const playerLink = document.getElementById('playerLink');
  if (playerLink) {
    playerLink.style.display = 'none';
  }

  const youtubeLink = document.getElementById('youtubeLink');
  if (youtubeLink) {
    youtubeLink.style.display = 'block';
  }
};

window.toggleYouTubePlayer = function () {
  const youtubePlayer = document.getElementById('youtubePlayer');
  if (youtubePlayer) {
    youtubePlayer.remove();
  }

  const options = playlistOptions[settings.engine.demoPathPrefix];
  if (!options?.youtube) {
    return;
  }

  const oldScreenshot = document.getElementById('screenshot');
  if (oldScreenshot) {
    oldScreenshot.remove();
  }

  const videoId = options.youtube;

  const startButton = document.getElementById('start');
  if (startButton) {
    startButton.style.display = 'none';
  }

  const playerLink = document.getElementById('playerLink');
  if (playerLink) {
    playerLink.style.display = 'block';
  }

  const youtubeLink = document.getElementById('youtubeLink');
  if (youtubeLink) {
    youtubeLink.style.display = 'none';
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'youtubePlayer';
  iframe.style.width = '20em';
  iframe.src = `https://www.youtube.com/embed/${videoId}`;
  iframe.title = 'YouTube video player';
  iframe.allow =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allowFullscreen = true;

  if (startButton.parentNode) {
    startButton.parentNode.insertBefore(iframe, startButton.nextSibling);
  }
};

window.appendDemoToPlaylist = function (name, path, options = {}) {
  if (select) {
    select.appendChild(new Option(name, path));
    playlistOptions[path] = options;
  }
};

// auto-select the demo from the URL parameter if given
const selectValue = new URLSearchParams(window.location.search).get('select');
const customDemoPath = selectValue ? `${selectValue}/` : undefined;
if (customDemoPath) {
  setDemoPathPrefix(customDemoPath);
}

if (select) {
  // playlist.js is expected to just list available productions, e.g., appendDemoToPlaylist('JUHA 001', 'data_juha001/');
  new JavaScriptFile()
    .load('./playlist.js')
    .then(() => {
      loggerDebug('Initializing playlist');

      if (customDemoPath) {
        select.value = customDemoPath;
      }

      // if select has only one option, hide the select element
      if (select.options.length === 1) {
        select.style.display = 'none';
      } else {
        select.style.display = 'block';
      }

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

      return true;
    })
    .catch((e) => {
      loggerDebug('No playlist.js found, loading default demo...: ' + e);
      select.style.display = 'none';
      return false;
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
  const canvas = document.getElementById('canvas');
  Utils.takeCanvasScreenshot(canvas);
}

let animationFrameId;
let oldTime;
let capture = false;
let frame = -1;
let captureStartTime;
let waitingForFrame = false;
const fps = settings.engine.fps;
const oneFrame = 1000 / fps;

export function setWaitingForFrame(wait) {
  waitingForFrame = wait;
}

function captureStop() {
  if (capture) {
    capture = false;
    toolClient.request('capture.stop').catch((err) => {
      loggerWarning('Failed to stop capture: ' + err.message);
    });
    const captureSeconds = (Date.now() - captureStartTime) / 1000;
    loggerInfo(
      `Capture ending. Captured ${frame} frames in ${(captureSeconds / 60).toFixed(2)} m, capture fps: ${(frame / captureSeconds).toFixed(2)}`
    );

    alert('Capture ended');
  }
}

function captureFrame() {
  if (settings.engine.tool && capture && waitingForFrame) {
    const roundingSkew = 0.1;
    const newFrame = Math.floor(timer.getTime() / oneFrame + roundingSkew);
    if (newFrame <= frame || Video.isSeeking()) {
      return false;
    }

    if (!toolClient.canQueueMessage()) {
      return false;
    }

    const oldFrame = frame;
    frame = newFrame;
    // setWaitingForFrame(false);

    toolClient
      .request('capture.frame', {
        dataUrl: canvasToDataUrl(),
        frame,
        time: timer.getTime()
      })
      .then((result) => {
        if (result && result.status === 'written') {
          setWaitingForFrame(true);
          return true;
        } else {
          loggerInfo(`Frame ${frame} not written properly`);
          return false;
        }
      })
      .catch((err) => {
        loggerInfo(`Failed to send frame ${frame}: ${err.message}`);
        frame = oldFrame; // reset frame on error
        return false;
      });

    /* console.log(
      `Frame ${frame} captured at time ${(timer.getTime() / 1000).toFixed(4)} s`
    ); */
    timer.setTime(((frame + 1) * 1000) / fps);
    const checkFrame = Math.floor(timer.getTime() / oneFrame + roundingSkew);
    if (checkFrame !== frame + 1) {
      loggerInfo(
        `Unexpected new frame ${(timer.getTime() / 1000).toFixed(4)} s, oldFrame: ${frame}, newFrame: ${checkFrame}`
      );

      const allowedSkipFrameCount = 7;
      if (checkFrame >= frame && checkFrame <= frame + allowedSkipFrameCount) {
        loggerTrace(
          `Timer inaccuracy detected. Adding frame ${frame - 1} as frames ${frame} to ${checkFrame}`
        );
        for (let i = frame + 1; i < checkFrame; i++) {
          toolClient
            .request('capture.frame', {
              dataUrl: canvasToDataUrl(),
              frame: i,
              time: timer.getTime()
            })
            .then((result) => {
              if (!(result && result.status === 'written')) {
                loggerWarning(`Additional frame ${i} not written properly`);
              }
              return result && result.status === 'written';
            })
            .catch((err) => {
              loggerWarning(
                `Failed to send additional frame ${i}: ${err.message}`
              );
              return false;
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

  if (fileManager.isNeedsUpdate() && isStarted() && Effect.loading === false) {
    if (fileManager.isNeedsDeepUpdate()) {
      deepReloadDemo();
    } else {
      loggerInfo('Shallow refresh');
      demoRenderer.setRenderNeedsUpdate(true);
      fileManager.markAsUpdated();
    }
  }

  timer.handleLoopAt();
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

    if (settings.engine.tool) {
      toolUi.updateFboPreviews();
    }
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
  started = true;
}

function startDemo() {
  return javaScriptFile
    .load('Demo.js')
    .then(() => {
      loggerTrace('Demo.js loaded');
      customizeSettings();
      restartDemo();
      return true;
    })
    .catch((err) => {
      windowSetTitle('LOADING ERROR');
      loggerError('Could not load demo: ' + err);
      return false;
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

function isAppleMobileDevice() {
  return /iPad|iPhone/.test(navigator.userAgent);
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

  demoRenderer.init();

  togglePlayerUserInterface(true);

  // HTML5 audio tag needs to be used so that WebAudio can be played also when Apple device hardware mute switch is ON
  const appleSilence = document.getElementById('appleSilence');
  if (appleSilence && isAppleMobileDevice()) {
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
    // without 100ms delay this explodes - maybe demoRendered should be awaited? Bindings.js:40 0.00 (1043 ms) [ERROR]: Error in loading demo: this.sceneIntro is not a function, stack: TypeError: this.sceneIntro is not a function at Demo.init (eval at <anonymous> (http://127.0.0.1:5173/src/JavaScriptFile.js:16:7), <anonymous>:198:8) at http://127.0.0.1:5173/src/Effect.js:93:16
    setTimeout(() => {
      startDemoAnimation();
    }, 100);
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

  if (document.title.includes('ERROR')) {
    showAlertBanner(
      `<strong>${document.title}</strong> Please check the console for details.`,
      'error'
    );
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

// The error event is fired on a Window object when a resource failed to load or couldn't be used
// for example if a script has an execution error
window.addEventListener('error', (event) => {
  if (event.error) {
    loggerError(`${event.error.name}: ${event.message}`);
  }
});

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
    if (!isStarted() || Effect.loading) {
      return;
    }

    loggerDebug(`Visibility changed to ${document.hidden}`);
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

  if (toolUi.isDialogOpen()) {
    if (event.key === 'Escape') {
      toolUi.defaultModalDialogAction();
    } else if (event.key === 'Enter' || event.key === ' ') {
      toolUi.defaultModalDialogAction();
    }

    return;
  }

  if (event.key === 'Escape') {
    const youtubePlayer = document.getElementById('youtubePlayer');
    if (!youtubePlayer) {
      stopDemo();
    }
  } else if (event.key === 'Enter') {
    const youtubePlayer = document.getElementById('youtubePlayer');
    if (!youtubePlayer) {
      startDemo();
    }
  } else if (event.key === 'f') {
    fullscreen.toggleFullscreen(!fullscreen.isFullscreen());
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
      if (!toolClient.isConnected()) {
        alert('Tool server not connected, cannot capture');
        return;
      }

      if (!confirm('Want to start video capture?')) {
        return;
      }

      timer.pause(true);
      timer.setTime(0);
      captureStartTime = Date.now();
      toolClient
        .request('capture.start', {
          fps: settings.engine.fps,
          width: 1920,
          height: 1080
        })
        .then((result) => {
          loggerInfo('Capture started successfully');

          setTimeout(() => {
            frame = -1;
            capture = true;
            setWaitingForFrame(true);
            captureFrame();
          }, 1000);

          return result;
        })
        .catch((err) => {
          loggerError('Failed to start capture: ' + err.message);
          alert('Failed to start video capture');
          throw err;
        });
    }
  }
});

function checkWebGlSupport() {
  const temporaryCanvas = document.createElement('canvas');

  let gl = temporaryCanvas.getContext('webgl2');
  if (!gl) {
    // we omit experimental-webgl as it is deprecated
    gl = temporaryCanvas.getContext('webgl');
  }

  const isSupported = !!gl;

  temporaryCanvas.remove();

  return isSupported;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!checkWebGlSupport()) {
    loggerError(`WebGL not supported by the browser: ${navigator.userAgent}`);
    showAlertBanner(
      '<strong>WebGL Not Supported:</strong> Your browser does not support WebGL. Please use a modern browser like Chrome, Firefox, or Edge to run this application.',
      'error'
    );
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('autoStart') === 'true') {
    settings.engine.autoStart = true;
  }

  if (settings.engine.autoStart) {
    startDemo();
  }
});
