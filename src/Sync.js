import { JSRocket } from './rocket/jsRocket';
import {
  loggerDebug,
  loggerTrace,
  loggerWarning,
  loggerError
} from './Bindings';
import { Timer } from './Timer';
import { FileManager } from './FileManager';
import { Spectogram } from './Spectogram';
import { MidiManager } from './MidiManager';
import { Settings } from './Settings';
const settings = new Settings();

const Sync = function () {
  return this.getInstance();
};

Sync.prototype.getInstance = function () {
  if (!Sync.prototype._singletonInstance) {
    this.midiManager = new MidiManager();
    Sync.prototype._singletonInstance = this;
  }

  return Sync.prototype._singletonInstance;
};

Sync.prototype.initRocket = async function () {
  if (settings.demo.sync.rocketFile === undefined) {
    loggerTrace('Rocket file not defined, GNU Rocket not enabled');
    return;
  }

  if (settings.engine.tool) {
    try {
      await this.initDevice(true);
    } catch (e) {
      loggerDebug(`Error initializing GNU Rocket WebSocket connection: ${e}`);
    }
  }

  try {
    if (!this.rocketReady) {
      await this.initDevice(false);
    }
  } catch (e) {
    loggerError('Error initializing GNU Rocket from XML file');
    throw e;
  }
};

Sync.prototype.initMidi = async function () {
  if (settings.demo.sync.midi.sync === undefined) {
    loggerTrace('Midi sync not defined, MIDI not enabled');
    return;
  }

  await this.midiManager.init();

  this.midiReady = true;
};

Sync.prototype.getBpmSegments = function () {
  const bpm = settings.demo.sync.beatsPerMinute;
  if (Array.isArray(bpm)) {
    return bpm;
  }
  return [[0, bpm]];
};

Sync.prototype.timeToRow = function (time) {
  const segments = this.getBpmSegments();
  const rowsPerBeat = settings.demo.sync.rowsPerBeat;
  let row = 0;
  for (let i = 0; i < segments.length; i++) {
    const segEnd = i + 1 < segments.length ? segments[i + 1][0] : Infinity;
    if (time <= segments[i][0]) break;
    const deltaTime = Math.min(time, segEnd) - segments[i][0];
    row += deltaTime * (segments[i][1] / 60) * rowsPerBeat;
  }
  return row;
};

Sync.prototype.rowToTime = function (row) {
  const segments = this.getBpmSegments();
  const rowsPerBeat = settings.demo.sync.rowsPerBeat;
  let remainingRows = row;
  for (let i = 0; i < segments.length; i++) {
    const rate = (segments[i][1] / 60) * rowsPerBeat;
    const segEnd = i + 1 < segments.length ? segments[i + 1][0] : Infinity;
    const segRows =
      segEnd === Infinity ? Infinity : (segEnd - segments[i][0]) * rate;
    if (remainingRows <= segRows) {
      return segments[i][0] + remainingRows / rate;
    }
    remainingRows -= segRows;
  }
  return 0;
};

Sync.prototype.init = async function () {
  this.rowRate =
    (this.getBpmSegments()[0][1] / 60) * settings.demo.sync.rowsPerBeat;

  await this.initMidi();

  await this.initRocket();
};

Sync.prototype.initDevice = function (webSocket) {
  if (this.rocketReady && webSocket) {
    loggerTrace('GNU Rocket already loaded, not reinitializing');
    return;
  }

  this.syncDevice = new JSRocket.SyncDevice();
  this.previousIntRow = undefined;
  this.timer = new Timer();
  this.rocketReady = false;

  const instance = this;
  return new Promise((resolve, reject) => {
    instance.syncDevice.on('ready', () => {
      loggerDebug('GNU Rocket loaded');
      instance.rocketReady = true;
      resolve();
    });
    instance.syncDevice.on('update', function (row) {
      if (!instance.timer.isPaused()) {
        instance.timer.pause(false);
      }
      const time = instance.rowToTime(row) * 1000;
      instance.timer.setTime(time);
    });
    instance.syncDevice.on('play', function () {
      instance.timer.pause(false);
    });
    instance.syncDevice.on('pause', function () {
      instance.timer.pause(true);
    });
    instance.syncDevice.on('error', function () {
      loggerDebug('Error loading GNU Rocket');
      reject(new Error('Error loading GNU Rocket'));
    });

    if (webSocket) {
      // syncDevice.setConfig({'socketURL':'ws://192.168.0.100:1339'});
      loggerDebug('Loading GNU Rocket via WebSocket');
      instance.syncDevice.init();
    } else {
      const fileManager = new FileManager();
      const filePath = settings.demo.sync.rocketFile;
      const path = fileManager.getPath(filePath);
      fileManager.monitorFile(filePath);

      loggerDebug('Loading GNU Rocket from XML: ' + path);
      instance.syncDevice.setConfig({
        rocketXML: path
      });
      instance.syncDevice.init('demo');
    }
  });
};

Sync.prototype.getRow = function (time) {
  const currentTime = time !== undefined ? time : this.timer.getTimeInSeconds();
  return this.timeToRow(currentTime);
};

Sync.prototype.update = function () {
  if (this.rocketReady) {
    const row = this.getRow();
    this.syncDevice.update(row);
  }

  if (this.midiReady) {
    this.midiManager.update();
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

Sync.setMidiSync = function (variable, callback, options) {
  const sync = new Sync();

  if (sync.midiManager) {
    sync.midiManager.setSync(variable, callback, options);
  } else {
    loggerWarning(`MIDI not enabled, not setting MIDI sync for ${variable}`);
  }
};

Sync.get = function (name, defaultValue = 0.0) {
  const sync = new Sync();

  if (sync.rocketReady) {
    let track = trackCache[name];
    if (track === undefined) {
      track = sync.syncDevice.getTrack(name);
      trackCache[name] = track;
    }

    if (track) {
      const row = sync.getRow();
      const value = track.getValue(row);
      if (value !== undefined) {
        return value;
      } else {
        return defaultValue;
      }
    }
  }

  if (sync.midiReady) {
    const value = sync.midiManager.callSync(name);
    if (value !== undefined) {
      return value;
    } else {
      return defaultValue;
    }
  }

  return defaultValue;
};

Sync.getSyncValue = Sync.get;

export { Sync };
