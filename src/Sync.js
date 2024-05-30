import { JSRocket } from './rocket/jsRocket';
import { loggerDebug, loggerTrace, loggerWarning } from './Bindings';
import { Timer } from './Timer';
import { FileManager } from './FileManager';
import { Spectogram } from './Spectogram';
import { Settings } from './Settings';
const settings = new Settings();

const Sync = function () {
  return this.getInstance();
};

Sync.prototype.getInstance = function () {
  if (!Sync.prototype._singletonInstance) {
    Sync.prototype._singletonInstance = this;
  }

  return Sync.prototype._singletonInstance;
};

Sync.prototype.init = async function () {
  if (settings.demo.sync.rocketFile === undefined) {
    loggerTrace('Rocket file not defined, GNU Rocket not enabled');
    return;
  }

  if (settings.engine.tool) {
    try {
      await this.initDevice(true);
    } catch (e) {
      loggerDebug('Error initializing GNU Rocket WebSocket connection');
    }
  }

  try {
    if (!this.ready) {
      await this.initDevice(false);
    }
  } catch (e) {
    loggerWarning('Error initializing GNU Rocket from XML file');
    throw e;
  }
};

Sync.prototype.initDevice = function (webSocket) {
  if (this.ready && webSocket) {
    loggerTrace('GNU Rocket already loaded, not reinitializing');
    return;
  }

  this.syncDevice = new JSRocket.SyncDevice();
  this.previousIntRow = undefined;
  this.timer = new Timer();
  this.ready = false;

  const instance = this;
  return new Promise((resolve, reject) => {
    instance.rowRate =
      (settings.demo.sync.beatsPerMinute / 60) * settings.demo.sync.rowsPerBeat;

    instance.syncDevice.on('ready', () => {
      loggerDebug('GNU Rocket loaded');
      instance.ready = true;
      resolve();
    });
    instance.syncDevice.on('update', function (row) {
      if (!instance.timer.isPaused()) {
        instance.timer.pause();
      }
      const time = (row / instance.rowRate) * 1000;
      instance.timer.setTime(time);
    });
    instance.syncDevice.on('play', function () {
      instance.timer.pause();
    });
    instance.syncDevice.on('pause', function () {
      instance.timer.pause();
    });
    instance.syncDevice.on('error', function () {
      console.log('Error loading GNU Rocket');
      reject(new Error('Error loading GNU Rocket'));
    });

    if (webSocket) {
      // syncDevice.setConfig({'socketURL':'ws://192.168.0.100:1339'});
      loggerDebug('Loading GNU Rocket via WebSocket');
      instance.syncDevice.init();
    } else {
      const path = new FileManager().getPath(settings.demo.sync.rocketFile);
      loggerDebug('Loading GNU Rocket from XML: ' + path);
      instance.syncDevice.setConfig({
        rocketXML: path
      });
      instance.syncDevice.init('demo');
    }
  });
};

Sync.prototype.getRow = function () {
  const row = this.timer.getTimeInSeconds() * this.rowRate;
  return row;
};

Sync.prototype.update = function () {
  if (this.ready && !this.timer.isPaused()) {
    const row = this.getRow();
    this.syncDevice.update(row);
  }
};

Sync.syncDefinitions = {};

Sync.getFftRaw = function () {
  return new Spectogram().readBuffer;
};

Sync.getFft = function (start, end) {
  const buffer = new Spectogram().readBuffer;
  if (buffer === undefined) {
    return 0.0;
  }

  end = end || 1.0;
  start = Math.min(start || 0.0, end);

  let avg = 0;
  const startI = Math.floor(start * buffer.length);
  const endI = Math.floor(end * buffer.length);
  for (let i = startI; i < endI; i++) {
    avg += buffer[i];
  }
  avg /= endI - startI;
  avg /= 255.0;

  return avg;
};

const trackCache = {};

Sync.get = function (name) {
  const sync = new Sync();
  if (!sync.ready) {
    return 0;
  }

  let track = trackCache[name];
  if (track === undefined) {
    track = sync.syncDevice.getTrack(name);
    trackCache[name] = track;
  }

  let v = 0;
  const row = sync.getRow();
  if (track) {
    v = track.getValue(row) || 0;
  }

  return v;
};

Sync.getSyncValue = Sync.get;

export { Sync };
