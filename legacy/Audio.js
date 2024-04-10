var Audio = function() {
}

Audio.prototype.load = function(filename) {
    audioLoad(filename);
}

Audio.prototype.play = function(filename) {
    audioPlay(filename);
}

Audio.prototype.stop = function() {
    audioStop();
}

Audio.prototype.setDuration = function(filename, duration) {
    audioSetDuration(filename, duration);
}

export { Audio };