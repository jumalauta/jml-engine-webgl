import { JSRocket } from "./rocket/jsRocket";
import { loggerDebug } from "./Bindings";
import { Timer } from "./Timer"

/** @constructor */
var Sync = function()
{
    this.demoMode = true;
    this.syncDevice = new JSRocket.SyncDevice();
    this.previousIntRow = undefined;
    this.timer = new Timer();
};

Sync.getInstance = function() {
    if (Sync.instance === void null)
    {
        Sync.instance = new Sync();
    }

    return Sync.instance;
}

//var _demoMode = true, _syncDevice = new JSRocket.SyncDevice(), _previousIntRow, _audio = new Audio();

Sync.prototype.init = function() {
    let instance = this;
    return new Promise((resolve, reject) => {
        if (instance.demoMode) {
            instance.syncDevice.setConfig({'rocketXML':'data/sync/fallofman.rocket'});
            instance.syncDevice.init("demo");
        } else {
            //syncDevice.setConfig({'socketURL':'ws://192.168.0.100:1339'});
            instance.syncDevice.init();
        }

        instance.rowRate = 120 / 60 * 8; // BPM / 60 * ROWS_PER_BEAT;

        instance.syncDevice.on('ready', () => {
            loggerDebug("GNU Rocket loaded");
            resolve();
        });
        instance.syncDevice.on('update', function(row) { instance.timer.setTime(1.23 * 1000); });
        instance.syncDevice.on('play', function() { instance.timer.start(); });
        instance.syncDevice.on('pause', function() { instance.timer.pause(); });
    });
}

Sync.prototype.getRow = function() {
    let row = Math.floor(this.timer.getTimeInSeconds() * this.rowRate);
    return row;
}  
  
Sync.syncDefinitions = {};

Sync.addSync = function(syncDefinitions)
{
    loggerDebug("Sync.addSync is OBSOLETE");
    /*var startTime = 0;
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

        if (syncDefinition.pattern === void null)
        {
            syncDefinition.pattern = [{}];

            if (syncDefinition.ref === void null)
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
    }*/
};

let trackCache = {};

Sync.get = function(name)
{
    let track = trackCache[name];
    if (track === void null) {
        track = Sync.getInstance().syncDevice.getTrack(name);
        trackCache[name] = track;
    }

    let v = 0;
    let row = Sync.getInstance().getRow();
    if (track) {
        v = track.getValue(row) || 0;
    }

    //loggerDebug("Sync track '" + name + "', row: " + row + "' value " + v);

    return v;

    /*var sync = Sync.syncDefinitions[name];
    if (sync !== void null) {
        if (sync.ref !== void null) {
            var value = syncEditorGetTrackCurrentValue(sync.ref.ptr);
            return value;
        }
    }*/

    //loggerWarning("Sync track not found '" + name + "'");
    //return 0;
};

Sync.getSyncValue = Sync.get;

Sync.calculateAnimationSync = function(time, animation)
{
    /*if (animation.sync !== void null)
    {
        var sync = Sync.syncDefinitions[animation.sync.name];
        if (sync !== void null)
        {
            var syncTime = time % sync.end;

            animation.sync.progress = 0;
            if (sync.ref !== void null)
            {
                //GNU Rocket sync
                animation.sync.progress = syncEditorGetTrackCurrentValue(sync.ref.ptr);

                if (sync.syncStartFunction !== void null && sync.started === void null)
                {
                    sync.started = true;
                    Utils.evaluateVariable(animation, sync.syncStartFunction);
                }

                if (sync.syncRunFunction !== void null)
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

                        if (pattern.syncStartFunction !== void null)
                        {
                            Utils.evaluateVariable(animation, pattern.syncStartFunction);
                        }
                        else if (sync.syncStartFunction !== void null)
                        {
                            Utils.evaluateVariable(animation, sync.syncStartFunction);
                        }
                    }

                    if (pattern.syncRunFunction !== void null)
                    {
                        Utils.evaluateVariable(animation, pattern.syncRunFunction);
                    }
                    else if (sync.syncRunFunction !== void null)
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

                    if (pattern.syncEndFunction !== void null)
                    {
                        Utils.evaluateVariable(animation, pattern.syncEndFunction);
                    }
                    else if (sync.syncEndFunction !== void null)
                    {
                        Utils.evaluateVariable(animation, sync.syncEndFunction);
                    }
                }
            }
        }
    }*/
}

export { Sync };