import { AudioFile } from './AudioFile';
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
  this.audioFile = new AudioFile();
};

Music.prototype.load = function (url) {
  this.audioFile.setVolume(settings.demo.music.volume);
  this.audioFile.setLoop(settings.demo.music.loop);

  return this.audioFile.load(url);
};

Music.prototype.getDuration = function () {
  return this.audioFile.getDuration();
};

Music.prototype.play = function () {
  this.audioFile.play();
};

Music.prototype.stop = function () {
  this.audioFile.stop();
};

Music.prototype.pause = function () {
  this.audioFile.pause();
};

Music.prototype.setTime = function (time) {
  this.audioFile.setTime(time);
};

Music.prototype.getTime = function () {
  return this.audioFile.getTime();
};

export { Music };
