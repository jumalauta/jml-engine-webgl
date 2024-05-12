import { JSRocket } from './rocket/jsRocket';
import { loggerDebug, loggerTrace, loggerWarning } from './Bindings';
import { Timer } from './Timer';
import { FileManager } from './FileManager';
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

Sync.addSync = function (syncDefinitions) {
  loggerDebug('Sync.addSync is OBSOLETE');
  /* var startTime = 0;
    var endTime = 0;
    var durationTime = 0;

    for (var syncI = 0; syncI < syncDefinitions.length; syncI++)
    {
        var syncDefinition = syncDefinitions[syncI];

        Utils.setTimeVariables(syncDefinition, startTime, endTime, durationTime);

        startTime = syncDefinition.start;
        endTime = syncDefinition.end;
        durationTime = endTime - startTime;

        if (syncDefinition.type === 'rocket')
        {
            syncDefinition.ref = syncEditorGetTrack(syncDefinition.name);
            loggerTrace("Rocket sync track '"+syncDefinition.name+"'/'"+syncDefinition.ref.ptr+"' added");
        }

        if (syncDefinition.pattern === undefined)
        {
            syncDefinition.pattern = [{}];

            if (syncDefinition.ref === undefined)
            {
                syncDefinition.pattern = [{'start': startTime, 'duration': durationTime}];
            }
        }

        Utils.preprocessTimeAnimation(startTime, durationTime, endTime, syncDefinition.pattern);
        for (var patternI = 0; patternI < syncDefinition.pattern.length; patternI++)
        {
            var pattern = syncDefinition.pattern[patternI];
            pattern.started = false;
            pattern.counter = 0;
        }

        Sync.syncDefinitions[syncDefinition.name] = syncDefinition;
    } */
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

  // loggerDebug("Sync track '" + name + "', row: " + row + "' value " + v);

  return v;

  /* var sync = Sync.syncDefinitions[name];
    if (sync !== undefined) {
        if (sync.ref !== undefined) {
            var value = syncEditorGetTrackCurrentValue(sync.ref.ptr);
            return value;
        }
    } */

  // loggerWarning("Sync track not found '" + name + "'");
  // return 0;
};

Sync.getSyncValue = Sync.get;

Sync.calculateAnimationSync = function (time, animation) {
  /* if (animation.sync !== undefined)
    {
        var sync = Sync.syncDefinitions[animation.sync.name];
        if (sync !== undefined)
        {
            var syncTime = time % sync.end;

            animation.sync.progress = 0;
            if (sync.ref !== undefined)
            {
                //GNU Rocket sync
                animation.sync.progress = syncEditorGetTrackCurrentValue(sync.ref.ptr);

                if (sync.syncStartFunction !== undefined && sync.started === undefined)
                {
                    sync.started = true;
                    Utils.evaluateVariable(animation, sync.syncStartFunction);
                }

                if (sync.syncRunFunction !== undefined)
                {
                    Utils.evaluateVariable(animation, sync.syncRunFunction);
                }

                return;
            }

            var syncPatternLength = sync.pattern.length;
            for (var patternI = 0; patternI < syncPatternLength; patternI++)
            {
                var pattern = sync.pattern[patternI];

                if (syncTime >= pattern.start && syncTime < pattern.end)
                {
                    animation.sync.progress = (syncTime - pattern.start) / pattern.duration;
                    if (animation.sync.progress > 1.0)
                    {
                        animation.sync.progress = 1.0;
                    }

                    if (!pattern.started)
                    {
                        pattern.started = true;
                        pattern.startTime = time;

                        if (pattern.syncStartFunction !== undefined)
                        {
                            Utils.evaluateVariable(animation, pattern.syncStartFunction);
                        }
                        else if (sync.syncStartFunction !== undefined)
                        {
                            Utils.evaluateVariable(animation, sync.syncStartFunction);
                        }
                    }

                    if (pattern.syncRunFunction !== undefined)
                    {
                        Utils.evaluateVariable(animation, pattern.syncRunFunction);
                    }
                    else if (sync.syncRunFunction !== undefined)
                    {
                        Utils.evaluateVariable(animation, sync.syncRunFunction);
                    }
                }

                if (pattern.started &&
                    (time >= pattern.startTime + pattern.duration ||
                    pattern.startTime > time))
                {
                    pattern.started = false;
                    animation.sync.progress = 0;

                    if (pattern.syncEndFunction !== undefined)
                    {
                        Utils.evaluateVariable(animation, pattern.syncEndFunction);
                    }
                    else if (sync.syncEndFunction !== undefined)
                    {
                        Utils.evaluateVariable(animation, sync.syncEndFunction);
                    }
                }
            }
        }
    } */
};

export { Sync };
