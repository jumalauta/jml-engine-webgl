import { loggerInfo } from './Bindings';
import { Music } from './Music';
import { FileManager } from './FileManager';
import { Video } from './Video';
import { Sync } from './Sync';

const Timer = function () {
  return this.getInstance();
};

Timer.prototype.getInstance = function () {
  if (!Timer.prototype._singletonInstance) {
    this.music = new Music();
    this.time = 0;
    this.prevTime = 0;
    this.deltaTime = 0;
    this.syncToMusic = true;
    Timer.prototype._singletonInstance = this;
  }

  return Timer.prototype._singletonInstance;
};

Timer.prototype.now = function () {
  if (this.syncToMusic) {
    return this.music.getTime() * 1000;
  }

  return performance.now();
};

Timer.prototype.setEndTime = function (endTime) {
  this.endTime = endTime;
};

Timer.prototype.start = function () {
  loggerInfo('Starting demo timer');
  new FileManager().startWatchFileChanges();
  // this.setTime(0);
  // this.music.play();
  // this.update();
};

Timer.prototype.stop = function () {
  loggerInfo('Stopping demo timer');
  new FileManager().stopWatchFileChanges();
  this.setTime(0);
  this.music.stop();
  this.startTime = undefined;
  this.pauseTime = undefined;
  this.time = 0;
};

Timer.prototype.pause = function (pauseState) {
  if (!this.pauseTime) {
    if (pauseState === false) {
      return;
    }

    loggerInfo('Pausing demo timer');
    this.music.pause(true);
    this.pauseTime = this.now();
    Video.pauseAll();
  } else {
    if (pauseState === true) {
      return;
    }

    loggerInfo('Resuming demo timer');
    if (!this.syncToMusic) {
      this.startTime += this.now() - this.pauseTime;
    }
    this.pauseTime = undefined;
    this.music.pause(false);
    Video.playAll();
  }
  this.prevTime = this.time;
  this.deltaTime = 0.0;
  this.update(true);
};

Timer.prototype.isPaused = function () {
  return this.pauseTime !== undefined;
};

Timer.prototype.isStarted = function () {
  return this.startTime !== undefined;
};

Timer.prototype.setTime = function (time) {
  if (time < 0) {
    time = 0;
  } else if (this.endTime && time > this.endTime) {
    this.prevTime = this.time;
    this.deltaTime = 0.0;
    time = this.endTime;
  }

  this.music.setTime(time / 1000);

  const now = this.now();
  this.startTime = now - time;
  if (this.pauseTime) {
    this.pauseTime = now;
  }
  this.update(true);
  Video.rewindAll();
};

Timer.prototype.update = function (force) {
  if (this.startTime === undefined) {
    this.time = 0;
    return;
  }

  if (!this.pauseTime || force) {
    const time = this.now() - this.startTime;
    this.time = Math.min(time, this.endTime || time);
    this.deltaTime = this.time - this.prevTime;
    this.prevTime = this.time;

    new Sync().update();
  }
};

Timer.prototype.getDeltaTime = function () {
  return this.deltaTime / 1000;
};

Timer.prototype.getTime = function () {
  return this.time;
};

Timer.prototype.getTimePercent = function () {
  return this.getTime() / this.endTime;
};

Timer.prototype.setTimePercent = function (percent) {
  this.setTime(percent * this.endTime);
};

Timer.prototype.getTimeInSeconds = function () {
  return this.getTime() / 1000;
};

Timer.prototype.isEnd = function () {
  if (this.endTime === undefined) {
    return false;
  }

  return this.getTime() >= this.endTime;
};

export { Timer };
