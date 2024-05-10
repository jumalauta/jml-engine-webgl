import * as THREE from 'three';
import { loggerDebug, loggerTrace, loggerWarning } from './Bindings';
import { FileManager } from './FileManager';
import { Timer } from './Timer';

let videos = [];

const Video = function () {
  this.ptr = undefined;
  this.id = undefined;
  this.filename = undefined;
};

Video.clear = function () {
  Video.stopAll();
  videos = [];
};

Video.playAll = function () {
  videos.forEach((video) => {
    video.play();
  });
};

Video.pauseAll = function () {
  videos.forEach((video) => {
    video.pause();
  });
};

Video.stopAll = function () {
  videos.forEach((video) => {
    video.stop();
  });
};

Video.rewindAll = function () {
  videos.forEach((video) => {
    video.rewind();
  });
};

Video.prototype.load = function (filename, referenceInstance, callback) {
  const instance = this;

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
  return !this.videoElement.paused && this.startTime !== undefined;
};

Video.prototype.play = function () {
  // videoPlay(this.ptr)
  if (this.isPlaying()) {
    return;
  }

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
    });
};

Video.prototype.pause = function () {
  // videoPause(this.ptr)
  this.videoElement.pause();
};

Video.prototype.stop = function () {
  // videoStop(this.ptr)
  this.videoElement.pause();
  this.videoElement.currentTime = 0;
  this.startTime = undefined;
};

Video.prototype.setAnimationTime = function (time) {
  // Note that this might be very sluggish if the video has not buffered properly
  this.currentTime = time;
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
  const timeDelta = this.getTimeDelta();
  // videoSetTime(this.ptr, time)

  // loggerTrace(`Rewinding video ${this.filename} from ${this.videoElement.currentTime} to ${timeDelta} seconds (video start ${this.startTime})`);
  this.videoElement.currentTime = timeDelta;
  this.texture.update();
};

Video.prototype.draw = function () {
  // videoDraw(this.ptr)
  if (this.isPlaying()) {
    const timeDelta = this.getTimeDelta();
    if (
      this.currentTime !== undefined ||
      (!this.videoElement.loop && timeDelta >= this.videoElement.duration)
    ) {
      this.videoElement.currentTime = timeDelta;
    }
  }
};

export { Video };
