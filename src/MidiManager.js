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
  SYSTEM_EXCLUSIVE: 0xf0,
  MIDI_TIME_CODE_QUARTER_FRAME: 0xf1,
  SONG_POSITION_POINTER: 0xf2,
  SONG_SELECT: 0xf3,
  TUNE_REQUEST: 0xf6,
  END_OF_EXCLUSIVE: 0xf7,
  TIMING_CLOCK: 0xf8,
  START: 0xfa,
  CONTINUE: 0xfb,
  STOP: 0xfc,
  ACTIVE_SENSING: 0xfe,
  RESET: 0xff,

  0x80: 'NOTE_OFF',
  0x90: 'NOTE_ON',
  0xa0: 'AFTERTOUCH',
  0xb0: 'CONTROLLER_CHANGE',
  0xc0: 'PATCH_CHANGE',
  0xd0: 'CHANNEL_PRESSURE',
  0xe0: 'PITCH_BEND',
  0xf0: 'SYSTEM_EXCLUSIVE',
  0xf1: 'MIDI_TIME_CODE_QUARTER_FRAME',
  0xf2: 'SONG_POSITION_POINTER',
  0xf3: 'SONG_SELECT',
  0xf6: 'TUNE_REQUEST',
  0xf7: 'END_OF_EXCLUSIVE',
  0xf8: 'TIMING_CLOCK',
  0xfa: 'START',
  0xfb: 'CONTINUE',
  0xfc: 'STOP',
  0xfe: 'ACTIVE_SENSING',
  0xff: 'RESET'
};

MidiManager.prototype.convertMidiToJson = (midi) => {
  const timeToRow = (time) => {
    return (
      (time / 60.0) *
      settings.demo.sync.beatsPerMinute *
      settings.demo.sync.rowsPerBeat
    );
  };

  const createStatusByte = (messageType, channel) => {
    if (messageType >= 0xf0) {
      return messageType;
    }
    return messageType | (channel & 0x0f);
  };

  const getStatusName = (statusByte) => {
    const messageType = statusByte & 0xf0;
    return midiStatus[messageType] || 'UNKNOWN';
  };

  const result = {
    inputs: {
      default_midi_input: {
        manufacturer: midi.header?.manufacturer || '',
        name: midi.header?.name || 'MIDI File',
        version: midi.header?.version || ''
      }
    },
    recordings: {
      default: {
        callbacks: {},
        events: []
      }
    }
  };

  const eventsByTime = new Map();

  midi.tracks.forEach((track) => {
    const channel = track.channel || 0;

    track.notes.forEach((note) => {
      const timeMs = Math.round(note.time * 1000);
      const row = timeToRow(note.time);

      if (!eventsByTime.has(timeMs)) {
        eventsByTime.set(timeMs, {
          time: timeMs,
          row: row,
          events: []
        });
      }

      eventsByTime.get(timeMs).events.push({
        statusLong: getStatusName(
          createStatusByte(midiStatus.NOTE_ON, channel)
        ),
        status: createStatusByte(midiStatus.NOTE_ON, channel),
        channel: channel,
        key: note.midi,
        velocity: Math.round(note.velocity * 127)
      });

      const noteOffTime = Math.round((note.time + note.duration) * 1000);
      const noteOffRow = timeToRow(note.time + note.duration);

      if (!eventsByTime.has(noteOffTime)) {
        eventsByTime.set(noteOffTime, {
          time: noteOffTime,
          row: noteOffRow,
          events: []
        });
      }

      eventsByTime.get(noteOffTime).events.push({
        statusLong: getStatusName(
          createStatusByte(midiStatus.NOTE_OFF, channel)
        ),
        status: createStatusByte(midiStatus.NOTE_OFF, channel),
        channel: channel,
        key: note.midi,
        velocity: 0
      });
    });

    if (track.controlChanges) {
      Object.keys(track.controlChanges).forEach((ccNumber) => {
        track.controlChanges[ccNumber].forEach((cc) => {
          const timeMs = Math.round(cc.time * 1000);
          const row = timeToRow(cc.time);

          if (!eventsByTime.has(timeMs)) {
            eventsByTime.set(timeMs, {
              time: timeMs,
              row: row,
              events: []
            });
          }

          eventsByTime.get(timeMs).events.push({
            statusLong: getStatusName(
              createStatusByte(midiStatus.CONTROLLER_CHANGE, channel)
            ),
            status: createStatusByte(midiStatus.CONTROLLER_CHANGE, channel),
            channel: channel,
            controller: parseInt(ccNumber),
            value: Math.round(cc.value * 127)
          });
        });
      });
    }

    if (track.aftertouch) {
      track.aftertouch.forEach((aftertouch) => {
        const timeMs = Math.round(aftertouch.time * 1000);
        const row = timeToRow(aftertouch.time);

        if (!eventsByTime.has(timeMs)) {
          eventsByTime.set(timeMs, {
            time: timeMs,
            row: row,
            events: []
          });
        }

        eventsByTime.get(timeMs).events.push({
          statusLong: getStatusName(
            createStatusByte(midiStatus.AFTERTOUCH, channel)
          ),
          status: createStatusByte(midiStatus.AFTERTOUCH, channel),
          channel: channel,
          key: aftertouch.key || aftertouch.midi,
          pressure: Math.round(
            (aftertouch.value || aftertouch.pressure || 0) * 127
          )
        });
      });
    }

    if (track.instrument && track.instrument.number !== undefined) {
      const timeMs = 0;
      const row = 0;

      if (!eventsByTime.has(timeMs)) {
        eventsByTime.set(timeMs, {
          time: timeMs,
          row: row,
          events: []
        });
      }

      eventsByTime.get(timeMs).events.push({
        statusLong: getStatusName(
          createStatusByte(midiStatus.PATCH_CHANGE, channel)
        ),
        status: createStatusByte(midiStatus.PATCH_CHANGE, channel),
        channel: channel,
        program: track.instrument.number
      });
    }

    if (track.channelPressure) {
      track.channelPressure.forEach((pressure) => {
        const timeMs = Math.round(pressure.time * 1000);
        const row = timeToRow(pressure.time);

        if (!eventsByTime.has(timeMs)) {
          eventsByTime.set(timeMs, {
            time: timeMs,
            row: row,
            events: []
          });
        }

        eventsByTime.get(timeMs).events.push({
          statusLong: getStatusName(
            createStatusByte(midiStatus.CHANNEL_PRESSURE, channel)
          ),
          status: createStatusByte(midiStatus.CHANNEL_PRESSURE, channel),
          channel: channel,
          pressure: Math.round((pressure.value || pressure.pressure || 0) * 127)
        });
      });
    }

    if (track.pitchBend) {
      track.pitchBend.forEach((bend) => {
        const timeMs = Math.round(bend.time * 1000);
        const row = timeToRow(bend.time);

        if (!eventsByTime.has(timeMs)) {
          eventsByTime.set(timeMs, {
            time: timeMs,
            row: row,
            events: []
          });
        }

        const pitchBendValue = Math.round((bend.value || 0) * 16383);
        const lsb = pitchBendValue & 0x7f;
        const msb = (pitchBendValue >> 7) & 0x7f;

        eventsByTime.get(timeMs).events.push({
          statusLong: getStatusName(
            createStatusByte(midiStatus.PITCH_BEND, channel)
          ),
          status: createStatusByte(midiStatus.PITCH_BEND, channel),
          channel: channel,
          lsb: lsb,
          msb: msb,
          value: pitchBendValue
        });
      });
    }

    if (track.meta) {
      track.meta.forEach((metaEvent) => {
        const timeMs = Math.round(metaEvent.time * 1000);
        const row = timeToRow(metaEvent.time);

        if (!eventsByTime.has(timeMs)) {
          eventsByTime.set(timeMs, {
            time: timeMs,
            row: row,
            events: []
          });
        }

        let statusLong = 'SYSTEM';
        let status = midiStatus.SYSTEM;
        let eventData = {
          statusLong: statusLong,
          status: status,
          type: metaEvent.type || 'meta'
        };

        if (metaEvent.type === 'tempo') {
          eventData.tempo = metaEvent.bpm || metaEvent.microsecondsPerBeat;
        } else if (metaEvent.type === 'timeSignature') {
          eventData.numerator = metaEvent.numerator;
          eventData.denominator = metaEvent.denominator;
        } else if (
          metaEvent.type === 'text' ||
          metaEvent.type === 'trackName'
        ) {
          eventData.text = metaEvent.text;
        } else if (metaEvent.data) {
          eventData.data = metaEvent.data;
        }

        eventsByTime.get(timeMs).events.push(eventData);
      });
    }

    if (track.sysex) {
      track.sysex.forEach((sysexEvent) => {
        const timeMs = Math.round(sysexEvent.time * 1000);
        const row = timeToRow(sysexEvent.time);

        if (!eventsByTime.has(timeMs)) {
          eventsByTime.set(timeMs, {
            time: timeMs,
            row: row,
            events: []
          });
        }

        eventsByTime.get(timeMs).events.push({
          statusLong: 'SYSTEM',
          status: 0xf0,
          data: sysexEvent.data || []
        });
      });
    }
  });

  result.recordings.default.events = Array.from(eventsByTime.values()).sort(
    (a, b) => a.time - b.time
  );

  return result;
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
  this.syncData = settings.demo.sync.midi.syncData;

  const parseData = async (file) => {
    if (Utils.isString(file)) {
      loggerDebug(`Loading MIDI sync data file: ${file}`);
      const fileManager = new FileManager();
      if (file.toUpperCase().endsWith('.MID')) {
        const data = await fileManager.load(file);
        return this.convertMidiToJson(data);
      } else if (file.toUpperCase().endsWith('.JSON')) {
        const data = await fileManager.load(file);
        return JSON.parse(data);
      } else {
        throw new Error(`Unknown MIDI sync data file type: ${file}`);
      }
    } else {
      throw new Error(`Unknown MIDI sync data. file: ${file}`);
    }
  };

  if (settings.demo.sync.midi.sync !== undefined) {
    if (Utils.isString(settings.demo.sync.midi.sync)) {
      this.syncData = await parseData(settings.demo.sync.midi.sync);
    } else {
      for (const key in settings.demo.sync.midi.sync) {
        const file = settings.demo.sync.midi.sync[key];
        if (Utils.isString(file)) {
          const syncData = await parseData(file);
          if (!this.syncData) {
            this.syncData = syncData;
            if (key !== 'default') {
              this.syncData.recordings[key] = this.syncData.recordings.default;
              delete this.syncData.recordings.default;
            }
          } else {
            this.syncData.recordings[key] = syncData.recordings.default;
          }
        } else {
          throw new Error(`Unknown MIDI sync data. file: ${file}, key: ${key}`);
        }
      }
    }
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

  for (const key in this.syncData.recordings) {
    const recording = this.syncData.recordings[key];
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
          loggerDebug(`MIDI playback [${key}]: ${JSON.stringify(event)}`);
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
