import { Effect } from './Effect';
import { loggerDebug, loggerInfo, loggerWarning } from './Bindings';
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
const quality = document.getElementById('qualityList');
const fullscreenCheckbox = document.getElementById('fullscreen');
const fullscreenLabel = document.getElementById('fullscreenLabel');

function isFullscreenSupported() {
  return (
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled ||
    document.msFullscreenEnabled
  );
}
const fullscreenDefaultStyleDisplay = isFullscreenSupported()
  ? 'inline'
  : 'none';

if (fullscreenCheckbox) {
  // do not display fullscreen option if it is not supported
  fullscreenCheckbox.style.display = fullscreenDefaultStyleDisplay;
  fullscreenLabel.style.display = fullscreenDefaultStyleDisplay;

  document.addEventListener('fullscreenchange', () => {
    fullscreenCheckbox.checked = document.fullscreenElement !== null;
  });
}

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

function startDemoAnimation() {
  setTimeout(() => {
    console.log('Demo is starting, please wait a moment');
    windowResize();
    reloadDemo();
    animate();
  }, settings.engine.startDelay);
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
  if (fullscreenCheckbox) {
    fullscreenCheckbox.style.display = 'none';
    fullscreenLabel.style.display = 'none';
  }
  if (select) {
    select.style.display = 'none';
  }
  if (quality) {
    quality.style.display = 'none';
    settings.menu.quality = parseFloat(quality.value || 1.0);
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

// Fullscreen toggle is called from checkbox onclick event
// iOS Safari does not support going to fullscreen from start button, so checkbox click event is used to avoid following error:
// Unhandled Promise Rejection: NotAllowedError: The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.
function toggleFullscreen(fullscreen) {
  if (isFullscreenSupported() === false) {
    loggerWarning('Fullscreen not supported, toggle has no effect');
    return;
  }

  if (fullscreen === undefined) {
    fullscreen = fullscreenCheckbox.checked;
  }

  // https://caniuse.com/fullscreen - apparently iPhone iOS does not support Fullscreen API
  const screen = document.documentElement;
  if (fullscreen === true) {
    const requestFullscreen =
      screen.requestFullscreen ||
      screen.webkitRequestFullscreen ||
      screen.msRequestFullscreen;
    if (requestFullscreen) {
      fullscreenCheckbox.checked = true;
      const promise = requestFullscreen.call(screen);
      if (promise instanceof Promise) {
        promise
          .then(() => {
            loggerDebug('Fullscreen entered');
          })
          .catch(() => {
            loggerWarning('Could not enter fullscreen');
          });
      }
    }
  } else {
    const exitFullscreen =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.msExitFullscreen;
    if (exitFullscreen) {
      fullscreenCheckbox.checked = false;
      const promise = exitFullscreen.call(document);
      if (promise instanceof Promise) {
        promise
          .then(() => {
            loggerDebug('Fullscreen exited');
          })
          .catch(() => {
            loggerWarning('Could not exit fullscreen');
          });
      }
    }
  }
}
window.toggleFullscreen = toggleFullscreen;

export function stopDemo() {
  console.log('Stopping demo...');

  timer.stop();
  toolUi.hide();

  demoRenderer.clear();

  cancelAnimationFrame(animationFrameId);

  const startButton = document.getElementById('start');
  if (startButton) {
    startButton.style.display = 'block';
  }
  if (fullscreenCheckbox) {
    fullscreenCheckbox.style.display = fullscreenDefaultStyleDisplay;
    fullscreenLabel.style.display = fullscreenDefaultStyleDisplay;
  }
  if (select && select.children.length > 0) {
    select.style.display = 'block';
  }
  if (quality) {
    quality.style.display = 'block';
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
