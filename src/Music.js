import * as THREE from 'three';
import { loggerDebug } from './Bindings';
import { Timer } from './Timer';

var Music = function() {
    return this.getInstance();
};

Music.prototype.getInstance = function() {
    if (!Music.prototype._singletonInstance) {
        Music.prototype._singletonInstance = this;
    }

    return Music.prototype._singletonInstance;
}


Music.prototype.load = function(url) {
    let instance = this;
    return new Promise((resolve, reject) => {
        if (instance.duration) {
            loggerDebug('Loaded music from cache ' + url + ' (length ' + instance.duration + 's)');
            resolve(instance);
            return;
        }
        const loader = new THREE.AudioLoader();
        loader.load(url,
            function(buffer) {
                instance.listener = new THREE.AudioListener();
                instance.audio = new THREE.Audio(instance.listener);            
                instance.audio.setBuffer(buffer);
                instance.duration = buffer.duration;
                (new Timer()).setEndTime(instance.duration * 1000);
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

Music.prototype.play = function() {
    this.audio.play();
}

Music.prototype.stop = function() {
    this.audio.stop();
}

Music.prototype.pause = function() {
    if ((new Timer()).isPaused()) {
        this.audio.pause();
    } else {
        this.audio.play();
    }
}

Music.prototype.setTime = function(time) {
    this.stop();
    this.audio.offset = time;
    this.play();
    if ((new Timer()).isPaused()) {
        this.pause();
    }
}

Music.prototype.getTime = function() {
    return this.context.currentTime;
}

export { Music };