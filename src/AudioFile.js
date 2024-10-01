import * as THREE from 'three';
import { loggerDebug, loggerError } from './Bindings';
import { Timer } from './Timer';
import { Loader } from './Loader';

const AudioFile = function () {
  this.init();
};

AudioFile.prototype.init = function () {
  this.stop();
  this.listener = undefined;
  this.audio = undefined;
  this.duration = undefined;
  this.error = undefined;
  this.volume = 1.0;
  this.loop = false;
};

AudioFile.prototype.setVolume = function (volume) {
  this.volume = volume;
};

AudioFile.prototype.setLoop = function (loop) {
  this.loop = loop;
};

AudioFile.prototype.load = function (url) {
  if (!url.toUpperCase().endsWith('.MP3')) {
    // To ensure best possible cross-browser and engine support, supported file formats are being restricted
    throw new Error('Unsupported AudioFile format ' + url);
  }

  const instance = this;
  return new Loader().newPromise((resolve, reject) => {
    if (instance.duration) {
      loggerDebug(
        'Loaded AudioFile from cache ' +
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
        instance.audio.setVolume(instance.volume);
        instance.audio.setLoop(instance.loop);
        instance.duration = buffer.duration;
        loggerDebug(
          'Loaded AudioFile ' + url + ' (length ' + instance.duration + 's)'
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

AudioFile.prototype.getDuration = function () {
  return this.duration;
};

AudioFile.prototype.play = function () {
  if (!this.audio) {
    return;
  }
  this.audio.play();
};

AudioFile.prototype.stop = function () {
  if (!this.audio) {
    return;
  }
  this.audio.stop();
};

AudioFile.prototype.pause = function () {
  if (!this.audio) {
    return;
  }

  if (new Timer().isPaused()) {
    this.audio.pause();
  } else {
    this.audio.play();
  }
};

AudioFile.prototype.setTime = function (time) {
  if (!this.audio) {
    return;
  }
  this.stop();
  this.audio.offset = time;
  this.play();
  if (new Timer().isPaused()) {
    this.pause();
  }
};

AudioFile.prototype.getTime = function () {
  if (!this.context) {
    return undefined;
  }

  return this.context.currentTime;
};

export { AudioFile };
