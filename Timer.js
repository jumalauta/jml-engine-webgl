import { Music } from "./legacy/Music";

var Timer = function() {
  return this.getInstance();
}

Timer.prototype.getInstance = function() {
  if (!Timer.prototype._singletonInstance) {
    this.music = new Music();
    this.time = 0;
    Timer.prototype._singletonInstance = this;
  }

  return Timer.prototype._singletonInstance;
}

Timer.prototype.now = function() {
  // TODO: https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
  return Date.now();
}

Timer.prototype.setEndTime = function(endTime) {
  this.endTime = endTime;
}

Timer.prototype.start = function() {
  this.stop();
  this.startTime = this.now();
  this.music.play();
  this.update();
}

Timer.prototype.stop = function() {
  this.startTime = undefined;
  this.pauseTime = undefined;
  this.music.stop();
}

Timer.prototype.pause = function() {
  if (!this.pauseTime) {
    this.pauseTime = this.now();
  } else {
    this.startTime += this.now() - this.pauseTime;
    this.pauseTime = undefined;
  }
  this.music.pause();
  this.update(true);
}

Timer.prototype.isPaused = function() {
  return this.pauseTime !== undefined;
}

Timer.prototype.setTime = function(time) {
  if (time < 0) {
    time = 0;
  } else if (this.endTime && time > this.endTime) {
    time = this.endTime;
  }

  const now = this.now();
  this.startTime = now - time;
  if (this.pauseTime) {
    this.pauseTime = now;
  }
  this.music.setTime(time / 1000);
  this.update(true);
}

Timer.prototype.update = function(force) {
  if (this.startTime === undefined) {
    return 0;
  }
  
  if (!this.pauseTime || force) {
    const time = (this.now() - this.startTime);
  
    this.time = Math.min(time, this.endTime || time);
  }
}

Timer.prototype.getTime = function() {
    return this.time;
}

Timer.prototype.getTimePercent = function() {
  return this.getTime() / this.endTime;
}

Timer.prototype.setTimePercent = function(percent) {
  this.setTime(percent * this.endTime);
}

Timer.prototype.getTimeInSeconds = function() {
  return this.getTime() / 1000;
}

Timer.prototype.isEnd = function() {
  if (this.endTime === undefined) {
    return false;
  }

  return this.getTime() >= this.endTime;
}
  
// Legacy method for backward compatibility
function getSceneTimeFromStart() {
  return (new Timer()).getTimeInSeconds();
}

export { Timer, getSceneTimeFromStart }
