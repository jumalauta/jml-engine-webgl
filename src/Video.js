import * as THREE from 'three';
import {
  loggerDebug,
  loggerTrace,
  loggerInfo,
  loggerWarning
} from './Bindings';
import { FileManager } from './FileManager';
import { Timer } from './Timer';

let videos = [];

const SEEK_TIMEOUT_MS = 2000;

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

Video.pause = function (pauseState) {
  videos.forEach((video) => {
    video.pause(pauseState);
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
    const fileManager = new FileManager();
    const filePath = fileManager.getPath(filename);
    fileManager.monitorFile(filename);
    instance.filename = filename;
    instance.videoElement = document.createElement('video');
    instance.videoElement.src = filePath;
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
      loggerInfo(`Video stalled: ${filename} ${event}`);
    };
    instance.videoElement.onwaiting = (event) => {
      loggerDebug(`Video waiting: ${filename} ${event}`);
    };
    instance.videoElement.onabort = (event) => {
      loggerInfo(`Video aborted: ${filename} ${event}`);
    };
    instance.videoElement.onended = (event) => {
      loggerTrace(`Video ended: ${filename} ${event}`);
      this.startTime = undefined;
      this.playStarted = false;
      this.playEnded = true;
    };
    instance.videoElement.onseeked = () => {
      // console.log(`Video seeked: ${filename} ${event}`);
      this.texture.update();
    };
    // instance.videoElement.ontimeupdate = () => {
    //   // console.log(`Video time update: ${filename} ${event} ${this.videoElement.currentTime}`);
    // };

    instance.videoElement.oncanplaythrough = () => {
      instance.texture = new THREE.VideoTexture(instance.videoElement);
      instance.ptr = instance.videoElement;
      instance.startTime = undefined;
      instance.applyDefinition();
      videos.push(instance);
      loggerDebug(
        `Video file loaded: ${filename} (length ${instance.videoElement.duration} seconds)`
      );
      instance.videoElement.oncanplaythrough = null;

      if (callback && !callback(referenceInstance, instance)) {
        reject(instance);
        return;
      }

      instance
        .seekToStartAt()
        .then(() => {
          resolve(instance);
          return true;
        })
        .catch((error) => {
          loggerWarning(`Video file could not be seeked: ${filename} ${error}`);
          resolve(instance);
        });
    };
    instance.videoElement.onerror = () => {
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

Video.prototype.setDefinition = function (videoDefinition) {
  // the "video" object of the animation, used to initialize the video already
  // at load time, i.e. before the animation is played for the first time
  this.definition = videoDefinition;
};

Video.prototype.applyDefinition = function () {
  if (this.definition === undefined) {
    return;
  }

  if (typeof this.definition.startAt === 'number') {
    this.setStartAt(this.definition.startAt);
  }

  if (typeof this.definition.endAt === 'number') {
    this.setEndAt(this.definition.endAt);
  }
};

Video.prototype.seekToStartAt = function () {
  return new Promise((resolve) => {
    const startAt = this.getStartAt();
    if (startAt <= 0 || this.videoElement.currentTime === startAt) {
      resolve(this);
      return;
    }

    const timeout = setTimeout(() => {
      loggerWarning(
        `Video seeking to ${startAt} seconds timed out: ${this.filename}`
      );
      resolve(this);
    }, SEEK_TIMEOUT_MS);

    this.videoElement.addEventListener(
      'seeked',
      () => {
        clearTimeout(timeout);
        resolve(this);
      },
      { once: true }
    );

    this.videoElement.currentTime = startAt;
  });
};

Video.prototype.setStartAt = function (startAt) {
  if (this.startAt === startAt) {
    return;
  }
  this.startAt = startAt;

  if (
    !this.playStarted &&
    this.videoElement.currentTime !== this.getStartAt()
  ) {
    this.seekToStartAt();
  }
};

Video.prototype.setEndAt = function (endAt) {
  this.endAt = endAt;
};

Video.prototype.getStartAt = function () {
  const duration = this.videoElement.duration || 0;
  if (this.startAt === undefined) {
    return 0;
  }
  return Math.min(Math.max(this.startAt, 0), duration);
};

Video.prototype.getEndAt = function () {
  const duration = this.videoElement.duration || 0;
  if (this.endAt === undefined) {
    return duration;
  }
  return Math.min(Math.max(this.endAt, this.getStartAt()), duration);
};

Video.prototype.getLength = function () {
  return this.getEndAt() - this.getStartAt();
};

Video.prototype.setFps = function () {
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

Video.prototype.setLength = function () {
  // videoSetLength(this.ptr, length)
};

Video.prototype.isPlaying = function () {
  // return videoIsPlaying(this.ptr)
  return !this.videoElement.paused;
};

Video.prototype.play = function (forcePlay) {
  // videoPlay(this.ptr)

  if (
    !forcePlay &&
    (this.isPlaying() || (this.playStarted && !this.playEnded))
  ) {
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

      return true;
    })
    .catch((error) => {
      loggerWarning(`Could not play video ${this.filename}: ${error}`);
      this.playStarted = false;
      return false;
    });
};

Video.prototype.pause = function (pauseState) {
  // videoPause(this.ptr)
  if (pauseState === undefined || pauseState === true) {
    if (this.isPlaying()) {
      this.videoElement.pause();
    }
  } else {
    if (this.videoElement.paused && this.playStarted) {
      this.play(true);
    }
  }
};

Video.prototype.stop = function () {
  // videoStop(this.ptr)
  if (!this.videoElement.paused) {
    this.videoElement.pause();
  }
  this.videoElement.currentTime = this.getStartAt();
  this.startTime = undefined;
  this.playStarted = false;
};

Video.prototype.setAnimationTime = function (time) {
  // Note that this might be very sluggish if the video has not buffered properly
  this.currentTime = time;
};

Video.prototype.getDuration = function () {
  // playback duration in seconds, i.e. how long the video is visibly playing
  const speed = this.videoElement.playbackRate;
  return this.getLength() / (speed > 0 ? speed : 1);
};

Video.prototype.getTimeDelta = function () {
  const startAt = this.getStartAt();

  if (this.startTime === undefined) {
    return startAt;
  }

  const length = this.getLength();
  const timeNow = new Timer().getTimeInSeconds();
  let timeDelta = (timeNow - this.startTime) * this.videoElement.playbackRate;

  if (this.currentTime !== undefined) {
    timeDelta = this.currentTime;
  }

  if (this.videoElement.loop && length > 0) {
    timeDelta = timeDelta % length;
  }

  if (timeDelta < 0) {
    timeDelta = 0;
  } else if (timeDelta > length && !this.videoElement.loop) {
    timeDelta = length;
  }

  // time delta is relative to the startAt point of the video
  return startAt + timeDelta;
};

Video.prototype.rewind = function () {
  if (this.startTime === undefined || !this.playStarted) {
    return;
  }
  const timeDelta = this.getTimeDelta();

  const endAt = this.getEndAt();
  if (
    !this.videoElement.loop &&
    timeDelta >= endAt &&
    endAt < this.videoElement.duration
  ) {
    loggerTrace(`Video reached endAt: ${this.filename} ${endAt} seconds`);
    if (!this.videoElement.paused) {
      this.videoElement.pause();
    }
    this.startTime = undefined;
    this.playStarted = false;
    this.playEnded = true;
  }

  // videoSetTime(this.ptr, time)
  const oldTime = this.videoElement.currentTime;
  if (timeDelta === oldTime) {
    return;
  } else if (timeDelta < 0) {
    this.stop();
  }

  this.videoElement.currentTime = timeDelta;

  // console.log(`Rewinding video '${this.filename}' from ${oldTime} to ${this.videoElement.currentTime} seconds (video start ${this.startTime})`);
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
      this.pause(true);
    }
  }
};

export { Video };
