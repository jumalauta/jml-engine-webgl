import * as THREE from 'three';
import { loggerDebug, loggerWarning, loggerError } from './Bindings';
import { Timer } from './Timer';
import { Settings } from './Settings';
const settings = new Settings();

const Music = function () {
  return this.getInstance();
};

Music.prototype.getInstance = function () {
  if (!Music.prototype._singletonInstance) {
    Music.prototype._singletonInstance = this;
    this.init();
  }

  return Music.prototype._singletonInstance;
};

Music.prototype.init = function () {
  this.stop();
  this.listener = undefined;
  this.audio = undefined;
  this.duration = undefined;
  this.error = undefined;
  this.pauseTime = undefined;
  this.startTime = undefined;
};

Music.prototype.load = function (url) {
  if (!url.toUpperCase().endsWith('.MP3')) {
    // To ensure best possible cross-browser and engine support, supported file formats are being restricted
    throw new Error('Unsupported music format ' + url);
  }

  const instance = this;
  return new Promise((resolve, reject) => {
    if (instance.duration) {
      loggerDebug(
        'Loaded music from cache ' +
          url +
          ' (length ' +
          instance.duration +
          's)'
      );
      resolve(instance);
      return;
    }
    const loader = new THREE.AudioLoader();
    loader.load(
      url,
      function (buffer) {
        instance.listener = new THREE.AudioListener();
        instance.audio = new THREE.Audio(instance.listener);
        instance.audio.setBuffer(buffer);
        instance.audio.setVolume(settings.menu.volume);
        instance.duration = buffer.duration;
        new Timer().setEndTime(instance.duration * 1000);
        loggerDebug(
          'Loaded music ' + url + ' (length ' + instance.duration + 's)'
        );
        resolve(instance);
      },
      undefined,
      function (err) {
        loggerError('Could not load ' + url);
        instance.error = true;
        reject(err);
      }
    );
  });
};

Music.prototype.getDuration = function () {
  return this.audio.duration;
};

Music.prototype.play = function () {
  this.audio.play();
};

Music.prototype.setStartTime = function () {
  if (this.audio && this.audio.context) {
    this.startTime = this.audio.context.currentTime;
  }
};

Music.prototype.stop = function () {
  if (!this.audio) {
    return;
  }
  this.audio.stop();
};

Music.prototype.pause = function (pauseState) {
  if (!this.audio) {
    return;
  }

  if (pauseState) {
    this.audio.pause();
    this.pauseTime = this.getTime();
  } else {
    this.startTime += this.getTime() - this.pauseTime;
    this.setTime(this.pauseTime);
    this.pauseTime = undefined;
  }
};

Music.prototype.setTime = function (time) {
  if (!this.audio) {
    loggerWarning('No audio, cannot set time');
    return;
  }
  this.stop();
  this.audio.offset = time;
  this.play();

  if (this.pauseTime) {
    this.pauseTime = this.getTime();
  }
  if (new Timer().isPaused()) {
    this.pause(true);
  }
};

Music.prototype.getTime = function () {
  if (this.audio && this.audio.context) {
    return this.audio.context.currentTime - this.startTime || 0;
  }

  return 0;
};

export { Music };
