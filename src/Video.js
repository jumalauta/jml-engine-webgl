var Video = function() {
    this.ptr = undefined;
    this.id = undefined;
    this.filename = undefined;
}

Video.prototype.load = function(filename) {
    this.filename = filename;
    var legacy = videoLoad(filename);
    this.ptr = legacy.ptr;
    this.id = legacy.id;
}

Video.prototype.setStartTime = function(startTime) {
    videoSetStartTime(this.ptr, startTime);
}

Video.prototype.setFps = function(fps) {
    videoSetFps(this.ptr, fps);
}

Video.prototype.setSpeed = function(speed) {
    videoSetSpeed(this.ptr, speed);
}

Video.prototype.setLoop = function(loop) {
    videoSetLoop(this.ptr, loop);
}

Video.prototype.setLength = function(length) {
    videoSetLength(this.ptr, length);
}

Video.prototype.play = function() {
    videoPlay(this.ptr);
}

Video.prototype.draw = function() {
    videoDraw(this.ptr);
}

export { Video };