import * as THREE from 'three';
import { loggerDebug, loggerTrace, loggerWarning } from './Bindings';
import { FileManager } from './FileManager';
import { Timer } from './Timer';

let videos = [];

const Video = function () {
  this.ptr = undefined;
  this.id = undefined;
  this.filename = undefined;
  this.playStarted = undefined;
  this.playEnded = undefined;
};

Video.clear = function () {
  Video.stop();
  videos = [];
};

Video.play = function () {
  videos.forEach((video) => {
    video.play();
  });
};

Video.pause = function () {
  videos.forEach((video) => {
    video.pause();
  });
};

Video.stop = function () {
  videos.forEach((video) => {
    video.stop();
  });
};

Video.rewind = function () {
  videos.forEach((video) => {
    video.handleState();
    video.rewind();
  });
};

Video.isSeeking = function () {
  return videos.some((video) => {
    return video.videoElement.seeking;
  });
};

Video.prototype.load = function (filename, referenceInstance, callback) {
  const instance = this;

  if (!filename.toUpperCase().endsWith('.MP4')) {
    // To ensure best possible cross-browser and engine support, supported file formats are being restricted
    throw new Error('Unsupported video format ' + filename);
  }

  return new Promise((resolve, reject) => {
    instance.filename = filename;
    instance.videoElement = document.createElement('video');
    instance.videoElement.src = new FileManager().getPath(filename);
    instance.videoElement.crossOrigin = 'anonymous';
    instance.videoElement.autoplay = false;
    instance.videoElement.loop = false;
    instance.videoElement.playsInline = true;
    instance.videoElement.muted = true;
    instance.setSpeed(1.0);
    instance.videoElement.onerror = (event) => {
      loggerWarning(`Video error: ${filename} ${event}`);
    };
    instance.videoElement.onstalled = (event) => {
      loggerWarning(`Video stalled: ${filename} ${event}`);
    };
    instance.videoElement.onwaiting = (event) => {
      loggerWarning(`Video waiting: ${filename} ${event}`);
    };
    instance.videoElement.onabort = (event) => {
      loggerWarning(`Video aborted: ${filename} ${event}`);
    };
    instance.videoElement.onended = (event) => {
      loggerTrace(`Video ended: ${filename} ${event}`);
      this.startTime = undefined;
      this.playStarted = false;
      this.playEnded = true;
    };

    instance.videoElement.oncanplaythrough = (event) => {
      instance.texture = new THREE.VideoTexture(instance.videoElement);
      instance.ptr = instance.videoElement;
      instance.startTime = undefined;
      videos.push(instance);
      loggerDebug(
        `Video file loaded: ${filename} (length ${instance.videoElement.duration} seconds)`
      );
      instance.videoElement.oncanplaythrough = null;

      if (callback) {
        if (callback(referenceInstance, instance)) {
          resolve(instance);
        } else {
          reject(instance);
        }
      } else {
        resolve(instance);
      }
    };
    instance.videoElement.onerror = (event) => {
      loggerWarning(`Video file could not be loaded: ${filename}`);
      reject(instance);
    };
    instance.videoElement.load();
  });

  // const legacy = undefined; // videoLoad(filename)
  // this.ptr = legacy.ptr;
  // this.id = legacy.id;
};

Video.prototype.setStartTime = function (startTime) {
  // videoSetStartTime(this.ptr, startTime)
  this.animationStartTime = startTime;
};

Video.prototype.setFps = function (fps) {
  // videoSetFps(this.ptr, fps)
};

Video.prototype.setSpeed = function (speed) {
  // videoSetSpeed(this.ptr, speed)
  this.videoElement.playbackRate = speed;
};

Video.prototype.setLoop = function (loop) {
  // videoSetLoop(this.ptr, loop)
  this.videoElement.loop = loop;
};

Video.prototype.setLength = function (length) {
  // videoSetLength(this.ptr, length)
};

Video.prototype.isPlaying = function () {
  // return videoIsPlaying(this.ptr)
  return !this.videoElement.paused;
};

Video.prototype.play = function () {
  // videoPlay(this.ptr)
  if (this.isPlaying()) {
    return;
  }

  this.playStarted = true;
  this.playEnded = false;

  this.videoElement
    .play()
    .then(() => {
      if (this.startTime === undefined) {
        this.startTime = new Timer().getTimeInSeconds();
        if (this.animationStartTime !== undefined) {
          this.startTime = this.animationStartTime;
          this.rewind();
        }
        loggerTrace(
          `Starting to play video ${this.filename} from ${this.videoElement.currentTime} seconds`
        );
      }
    })
    .catch((error) => {
      loggerWarning(`Could not play video ${this.filename}: ${error}`);
      this.playStarted = false;
    });
};

Video.prototype.pause = function () {
  // videoPause(this.ptr)
  if (this.isPlaying()) {
    this.videoElement.pause();
  }
};

Video.prototype.stop = function () {
  // videoStop(this.ptr)
  if (!this.videoElement.paused) {
    this.videoElement.pause();
  }
  this.videoElement.currentTime = 0;
  this.startTime = undefined;
  this.playStarted = false;
};

Video.prototype.setAnimationTime = function (time) {
  // Note that this might be very sluggish if the video has not buffered properly
  this.currentTime = time;
};

Video.prototype.getDuration = function () {
  return this.videoElement.duration * this.videoElement.playbackRate;
};

Video.prototype.getTimeDelta = function () {
  if (this.startTime === undefined) {
    return 0;
  }

  const timeNow = new Timer().getTimeInSeconds();
  let timeDelta = (timeNow - this.startTime) * this.videoElement.playbackRate;

  if (this.currentTime !== undefined) {
    timeDelta = this.currentTime;
  }

  if (this.videoElement.loop) {
    timeDelta = timeDelta % this.videoElement.duration;
  }

  if (timeDelta < 0) {
    timeDelta = 0;
  } else if (
    timeDelta > this.videoElement.duration &&
    !this.videoElement.loop
  ) {
    timeDelta = this.videoElement.duration;
  }

  return timeDelta;
};

Video.prototype.rewind = function () {
  if (this.startTime === undefined || !this.playStarted) {
    return;
  }
  const timeDelta = this.getTimeDelta();
  // videoSetTime(this.ptr, time)
  const oldTime = this.videoElement.currentTime;
  if (timeDelta === oldTime) {
    return;
  } else if (timeDelta < 0) {
    this.stop();
  }

  this.videoElement.currentTime = timeDelta;

  // loggerTrace(`Rewinding video '${this.filename}' from ${oldTime} to ${this.videoElement.currentTime} seconds (video start ${this.startTime})`);
  this.texture.update();
};

Video.prototype.handleState = function () {
  const now = new Timer().getTimeInSeconds();
  const musicNow = now - this.animationStartTime;

  if (
    now >= this.animationStartTime &&
    musicNow < this.getDuration() &&
    (!this.playStarted || this.playEnded)
  ) {
    this.play();
    if (new Timer().isPaused()) {
      this.pause();
    }
  }
};

export { Video };
