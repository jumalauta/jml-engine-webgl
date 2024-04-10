import * as THREE from 'three';
import { loggerDebug } from './Bindings';

var Music = function()
{
    this.listener = new THREE.AudioListener();
    this.audio = new THREE.Audio(this.listener);
};

Music.getInstance = function() {
    if (Music.instance === void null)
    {
        Music.instance = new Music();
    }

    return Music.instance;
}

Music.prototype.load = function(url) {
    let instance = this;
    return new Promise((resolve, reject) => {
        const loader = new THREE.AudioLoader();
        loader.load(url,
            function(buffer) {
                instance.audio.setBuffer(buffer);
                instance.duration = buffer.duration;
                loggerDebug('Loaded music ' + url + ' (length ' + instance.duration + 's)');
                resolve(instance);
            },
            undefined,
            function(err) {
                console.error( 'Could not load ' + url );
                instance.error = true;
                reject(err);
            }
        );
    });
}

Music.prototype.getDuration = function() {
    return this.audio.duration;
}

import {startTimer} from './Bindings';
Music.prototype.play = function() {
    startTimer();
    this.audio.play();
}

Music.prototype.stop = function() {
    this.audio.stop();
}

Music.prototype.pause = function() {
    this.audio.pause();
}

Music.prototype.setTime = function(time) {
    if (this.audio.isPlaying === true) {
        this.audio.stop();
        this.audio.offset = time;
        this.audio.play();
    }
}

Music.prototype.getTime = function() {
    return this.context.currentTime;
}

export { Music };