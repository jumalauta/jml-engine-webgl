import { loggerDebug, loggerWarning } from './Bindings';

const Fullscreen = function () {
  return this.getInstance();
};

Fullscreen.prototype.getInstance = function () {
  if (!Fullscreen.prototype._singletonInstance) {
    Fullscreen.prototype._singletonInstance = this;
    this.init();
  }

  return Fullscreen.prototype._singletonInstance;
};

Fullscreen.prototype.init = function () {
  this.fullscreenCheckbox = document.getElementById('fullscreen');
  this.fullscreenLabel = document.getElementById('fullscreenLabel');
  this.toggleFullscreenCheckboxVisibility(true);

  document.addEventListener('fullscreenchange', () => {
    this.fullscreenCheckbox.checked = document.fullscreenElement !== null;
  });

  window.toggleFullscreen = (fullscreen) => {
    new Fullscreen().toggleFullscreen(fullscreen);
  };
};

Fullscreen.prototype.isFullscreenSupported = function () {
  return (
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled ||
    document.msFullscreenEnabled
  );
};

Fullscreen.prototype.isFullscreen = function () {
  return document.fullscreenElement !== null;
};

Fullscreen.prototype.toggleFullscreenCheckboxVisibility = function (visible) {
  // Fullscreen API is not supported in phone iOS Safari
  // iPhone fullscreen can be done by adding the page to iOS Home Screen and opening it from there
  const fullscreenCheckboxStyle =
    this.isFullscreenSupported() && visible ? 'inline' : 'none';

  if (this.fullscreenCheckbox) {
    this.fullscreenCheckbox.style.display = fullscreenCheckboxStyle;
    this.fullscreenLabel.style.display = fullscreenCheckboxStyle;
  }
};

// Fullscreen toggle is called from checkbox onclick event
// iOS Safari does not support going to fullscreen from start button, so checkbox click event is used to avoid following error:
// Unhandled Promise Rejection: NotAllowedError: The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.
Fullscreen.prototype.toggleFullscreen = function (fullscreen) {
  if (this.isFullscreenSupported() === false) {
    loggerWarning('Fullscreen not supported');
    return;
  }

  if (fullscreen === undefined) {
    fullscreen = this.fullscreenCheckbox.checked;
  }

  // https://caniuse.com/fullscreen - apparently iPhone iOS does not support Fullscreen API
  const screen = document.documentElement;
  if (fullscreen === true) {
    const requestFullscreen =
      screen.requestFullscreen ||
      screen.webkitRequestFullscreen ||
      screen.msRequestFullscreen;
    if (requestFullscreen) {
      this.fullscreenCheckbox.checked = true;
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
      this.fullscreenCheckbox.checked = false;
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
};

export { Fullscreen };
