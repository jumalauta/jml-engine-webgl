import { loggerTrace, loggerDebug, loggerWarning } from './Bindings';
import { Timer } from './Timer';
import { Sync } from './Sync';
import { Utils } from './Utils';
import { FileManager } from './FileManager';
import { Settings } from './Settings';

const settings = new Settings();

const MidiManager = function () {
  return this.getInstance();
};

MidiManager.prototype.getInstance = function () {
  if (!MidiManager.prototype._singletonInstance) {
    this.midiReady = false;
    this.capture = false;
    this.captureOverwrite = false;
    this.callbacks = {};
    MidiManager.prototype._singletonInstance = this;
  }

  return MidiManager.prototype._singletonInstance;
};

// ref. https://ccrma.stanford.edu/~craig/articles/linuxmidi/misc/essenmidi.html

const midiStatus = {
  NOTE_OFF: 0x80,
  NOTE_ON: 0x90,
  AFTERTOUCH: 0xa0,
  CONTROLLER_CHANGE: 0xb0,
  PATCH_CHANGE: 0xc0,
  CHANNEL_PRESSURE: 0xd0,
  PITCH_BEND: 0xe0,
  SYSTEM: 0xf0,
  0x80: 'NOTE_OFF',
  0x90: 'NOTE_ON',
  0xa0: 'AFTERTOUCH',
  0xb0: 'CONTROLLER_CHANGE',
  0xc0: 'PATCH_CHANGE',
  0xd0: 'CHANNEL_PRESSURE',
  0xe0: 'PITCH_BEND',
  0xf0: 'SYSTEM'
};

MidiManager.prototype.decodeMidiMessage = function (data) {
  const status = data[0] & 0xf0;
  const channel = data[0] & 0x0f;

  const message = {
    statusLong: midiStatus[status],
    status,
    channel
  };

  switch (status) {
    case midiStatus.NOTE_OFF:
    case midiStatus.NOTE_ON:
      message.key = data[1];
      message.velocity = data[2];
      break;
    case midiStatus.AFTERTOUCH:
      message.key = data[1];
      message.touch = data[2];
      break;
    case midiStatus.CONTROLLER_CHANGE:
      message.controller = data[1];
      message.value = data[2];
      break;
    case midiStatus.PATCH_CHANGE:
      message.instrument = data[1];
      break;
    case midiStatus.CHANNEL_PRESSURE:
      message.pressure = data[1];
      break;
    case midiStatus.PITCH_BEND:
      message.value = data[1] + (data[2] << 7);
      break;
    case midiStatus.SYSTEM:
    default:
      message.data = data.slice(1);
      break;
  }

  return message;
};

MidiManager.prototype.isCaptureOverwrite = function () {
  return this.captureOverwrite;
};

MidiManager.prototype.setCaptureOverwrite = function (captureOverwrite) {
  this.captureOverwrite = captureOverwrite;
  this.captureOverwriteLastTime = undefined;
  loggerDebug(
    `MIDI capture mode: ${this.captureOverwrite ? 'overwrite' : 'insert'}`
  );
};

MidiManager.prototype.initMidi = async function () {
  this.syncData = settings.demo.sync.midi.sync;
  if (Utils.isString(this.syncData)) {
    const fileManager = new FileManager();
    const data = await fileManager.load(this.syncData);
    this.syncData = JSON.parse(data);
  }

  if (!this.syncData || Utils.isString(this.syncData)) {
    throw new Error(
      'MIDI sync data not found: ' + settings.demo.sync.midi.sync
    );
  }

  this.midiReady = true;
};

MidiManager.prototype.initMidiInput = async function () {
  this.midiAccess = await navigator.requestMIDIAccess();

  if (this.syncData.inputs === undefined) {
    loggerTrace('Initializing blank MIDI sync data');
    this.syncData = {
      inputs: {},
      recordings: {}
    };
  }

  for (const entry of this.midiAccess.inputs) {
    this.capture = true;

    const input = entry[1];

    this.syncData.inputs[input.id] = {
      manufacturer: input.manufacturer,
      name: input.name,
      version: input.version
    };

    loggerDebug(
      `MIDI input: ${JSON.stringify(this.syncData.inputs[input.id])}`
    );

    const recordingName = settings.tool.midi.recordingName || 'default';
    if (this.syncData.recordings[recordingName] === undefined) {
      this.syncData.recordings[recordingName] = {
        events: []
      };
    }

    const recording = this.syncData.recordings[recordingName];
    const events = recording.events;

    const midiManager = this;

    input.onmidimessage = (event) => {
      const message = midiManager.decodeMidiMessage(event.data);

      const timer = new Timer();
      const sync = new Sync();
      const now = timer.getTime();
      const row = sync.getRow(now / 1000.0);

      let midiEvent = {
        time: now,
        row,
        events: [message]
      };

      let insertIndex = 0;

      if (events.length > 0) {
        if (this.captureOverwrite) {
          if (this.captureOverwriteLastTime !== undefined) {
            const overwriteTime = this.captureOverwriteLastTime;
            let deleteIndexBegin;
            let deleteIndexEnd;
            for (let i = 0; i < events.length; i++) {
              if (
                deleteIndexBegin === undefined &&
                events[i].time >= overwriteTime
              ) {
                deleteIndexBegin = i;
              }

              if (events[i].time > now) {
                deleteIndexEnd = i;
                break;
              }
            }

            if (deleteIndexBegin !== undefined) {
              const eventCountBefore = events.length;
              if (deleteIndexEnd === undefined) {
                events.splice(deleteIndexBegin);
              } else {
                events.splice(
                  deleteIndexBegin,
                  deleteIndexEnd - deleteIndexBegin
                );
              }
              const eventCountAfter = events.length;

              if (eventCountBefore !== eventCountAfter) {
                loggerDebug(
                  `MIDI overwrite deleted events ${deleteIndexBegin}-${deleteIndexEnd}: count decreased from ${eventCountBefore} to ${eventCountAfter}`
                );
              }
            }
          }

          this.captureOverwriteLastTime = now + 1;
        }

        const lastEvent = events[events.length - 1];
        if (lastEvent.time < now) {
          insertIndex = events.length;
        } else if (lastEvent.time === now) {
          insertIndex = undefined;
          lastEvent.events.push(message);
          midiEvent = lastEvent;
        } else {
          for (let i = 0; i < events.length; i++) {
            if (events[i].time > now) {
              insertIndex = i;
              break;
            } else if (events[i].time === now) {
              insertIndex = undefined;
              events[i].events.push(message);
              midiEvent = events[i];
              break;
            }
          }
        }
      }

      if (insertIndex !== undefined) {
        events.splice(insertIndex, 0, midiEvent);
      }

      recording.newEvent = true;
      recording.currentEvent = midiEvent;
      loggerDebug(
        `MIDI message (${insertIndex || '-'}): ${JSON.stringify(midiEvent)}`
      );
    };
  }
};

MidiManager.prototype.initMidiCapture = async function () {
  if (navigator.permissions) {
    try {
      const result = await navigator.permissions.query({
        name: 'midi',
        sysex: true
      });
      if (result.state === 'granted' || result.state === 'prompt') {
        loggerTrace(`Midi access state: ${result.state}`);

        await this.initMidiInput();
      } else {
        loggerWarning('Midi access denied');
      }
    } catch (e) {
      loggerWarning(`Could not access MIDI: ${e}`);
    }
  }
};

MidiManager.prototype.update = function () {
  if (!this.syncData || !this.syncData.recordings) {
    return;
  }

  const timer = new Timer();
  const now = timer.getTime();

  for (const recording of Object.values(this.syncData.recordings)) {
    if (
      recording.currentEvent !== undefined &&
      recording.currentEvent.time > now
    ) {
      recording.currentEvent = undefined;
      recording.i = undefined;
    }
    recording.newEvent = false;

    for (let i = recording.i || 0; i < recording.events.length; i++) {
      const event = recording.events[i];
      const approximateFrameDelay = 17 * 2;
      if (Math.abs(event.time - now) < approximateFrameDelay) {
        recording.currentEvent = event;
        recording.newEvent = true;
        recording.i = i + 1;
        if (settings.tool.midi.playbackLogging) {
          loggerDebug(`MIDI playback: ${JSON.stringify(event)}`);
        }

        if (recording.callback) {
          recording.callback(event);
        }

        break;
      }
    }
  }
};

MidiManager.prototype.setPlaybackCallback = function (callback, options) {
  options = options || {};
  const recordingName = options.recordingName || 'default';

  const recording = this.syncData.recordings[recordingName];

  if (recording === undefined) {
    throw new Error(`MIDI recording ${recordingName} not found`);
  }

  recording.callback = callback;
};

MidiManager.prototype.setSync = function (name, callback, options) {
  options = options || {};
  const recordingName = options.recordingName || 'default';
  const single = !!options.single;
  const onlyNew = !!options.onlyNew;
  const acceptedStatus = options.acceptedStatus;
  const defaultReturn = options.default;

  const processMidiEvent = (events) => {
    const recording = new MidiManager().syncData.recordings[recordingName];
    if (recording === undefined) {
      throw new Error(`MIDI recording ${recordingName} not found`);
    }

    let filteredEvents = events.filter((event) => {
      if (acceptedStatus && !acceptedStatus.includes(event.statusLong)) {
        return false;
      }

      return true;
    });

    if (filteredEvents.length === 0) {
      filteredEvents = undefined;
    } else if (single) {
      filteredEvents = filteredEvents[0];
    }

    if (onlyNew && !recording.newEvent) {
      filteredEvents = undefined;
    }

    if (defaultReturn !== undefined && filteredEvents === undefined) {
      return defaultReturn;
    }

    return callback(filteredEvents);
  };

  const fullName = `${recordingName}:${name}`;
  this.callbacks[fullName] = processMidiEvent;
  loggerDebug(`MIDI sync set: ${fullName}`);
};

MidiManager.prototype.callSync = function (name) {
  if (!this.midiReady || !this.syncData || !this.syncData.recordings) {
    return undefined;
  }

  const parts = name.split(':');
  const recordingName = parts.length === 1 ? 'default' : parts[0];
  const callbackName = parts[parts.length - 1];

  const recording = this.syncData.recordings[recordingName];

  if (recording === undefined) {
    return undefined;
  }

  const events = recording.currentEvent ? recording.currentEvent.events : [];
  const fullName = `${recordingName}:${callbackName}`;
  const callback = this.callbacks[fullName];

  if (callback) {
    return callback(events);
  }

  return undefined;
};

MidiManager.prototype.init = async function () {
  await this.initMidi();

  if (settings.engine.tool && settings.tool.midi.capture) {
    this.initMidiCapture();
  }
};

export { MidiManager };

window.MidiManager = MidiManager;
