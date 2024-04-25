import { getSceneTimeFromStart } from './Player';
import { Sync } from './Sync';

window.getSceneTimeFromStart = getSceneTimeFromStart;
window.Sync = Sync;

/*eslint no-extend-native: "off"*/
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

/** @constructor */
var Utils = function()
{
};

Utils.updateProperties = function(animation) {
    const object = animation.light;
    if (!object) {
        return;
    }
    const threeObject = animation.ref.mesh;
    if (!threeObject) {
        return;
    }
    const properties = object.properties;
    if (!properties) {
        return;
    }

    for (var key in properties) {
        if (threeObject.hasOwnProperty(key)) {
            threeObject[key] = Utils.evaluateVariable(animation, properties[key]);
        }
    }

}

Utils.clamp = function(value)
{
    return Utils.clampRange(value, 0.0, 1.0);
};

Utils.clampRange = function(value, min, max)
{
    return Math.min(Math.max(value, min), max);
};

Utils.mix = function(value1, value2, percent)
{
    var a = value1;
    var b = value2;
    return a + (b - a) * percent;
};


Utils.calculateProgress = function(start, duration, noClamp)
{
    var time = getSceneTimeFromStart();
    var p = (time - start) / duration;
    if (noClamp !== true)
    {
        p = Utils.clamp(p);
    }

    return p;
};

Utils.debugPrintStackTrace = function()
{
    var stackTrace = ['stack trace:'];

    //start from stackPosition -3 to skip printing of debugPrintStackTrace()
    for (var i = 0, stackPosition = -3;; stackPosition--)
    {
        var info = Duktape.act(stackPosition);
        if (!info)
        {
            break;
        }

        if (info.function.name == '')
        {
            continue;
        }

        var string = '\tstack: ' + stackPosition;
        string += ', function: ' + info.function.name;
        string += ', line: ' + info.lineNumber;
        string += ', info: ' + Duktape.enc('jx', info);
        stackTrace[++i] = string;
    }

    if (stackTrace.length > 1)
    {
        debugPrint(stackTrace.join('\n'));
    }
};

Utils.isArray = function(variable)
{
    if (variable.constructor === Array)
    {
        return true;
    }

    return false;
};

Utils.isObject = function(variable)
{
    if (variable !== null && typeof variable === 'object')
    {
        return true;
    }

    return false;
};

Utils.isEmptyObject = function(variable)
{
    if (Utils.isObject(variable) && Object.getOwnPropertyNames(variable).length === 0)
    {
        return true;
    }

    return false;
};

Utils.isFunction = function(variable)
{
    return typeof(variable) === 'function';
};

Utils.isString = function(variable)
{
    if (typeof variable === 'string' || variable instanceof String)
    {
        return true;
    }

    return false;
};

Utils.isNumeric = function(variable)
{
    if (!isNaN(parseFloat(variable)) && isFinite(variable))
    {
        return true;
    }

    return false;
};

Utils.isVideo = function(filename)
{
    if (filename.endsWith('.ogv') || filename.endsWith('.ogg'))
    {
        return true;
    }

    return false;
};

Utils.evaluateVariable = function(animation, variable)
{
    if (Utils.isFunction(variable)){
        return variable(animation);
    } else if (Utils.isString(variable) && variable.charAt(0) === '{') {
        var func = new Function('animation', variable);
        return func(animation);
    }

    return variable;
};

Utils.deepCopyJson = function(jsonObject)
{
    var object = JSON.parse(JSON.stringify(jsonObject));

    if (jsonObject.ptr !== void null)
    {
        object.ptr = jsonObject.ptr;
    }

    if (jsonObject.ref !== void null)
    {
        if (jsonObject.ref.ptr !== void null)
        {
            object.ref.ptr = jsonObject.ref.ptr;
        }
    }

    return object;
};

Utils.getRandomArrayIndex = function(array)
{
    if (array.length !== void null)
    {
        return Math.floor(random() * array.length);
    }

    return undefined;
};

Utils.setTimeVariables = function(variable, animStart, animEnd, animDuration)
{
    if (Utils.isString(variable.start))
    {
        variable.start = convertTimeToSeconds(variable.start);
    }
    if (Utils.isString(variable.duration))
    {
        variable.duration = convertTimeToSeconds(variable.duration);
    }
    if (Utils.isString(variable.end))
    {
        variable.end = convertTimeToSeconds(variable.end);
    }

    if (variable.start === void null)
    {
        variable.start = animStart;
    }
    if (variable.duration === void null)
    {
        if (variable.end !== void null)
        {
            variable.duration = variable.end - variable.start;
        }
        else if (animDuration !== void null)
        {
            variable.duration = animDuration;
            variable.end = variable.start + variable.duration;
        }
    }
    if (variable.end === void null && variable.duration !== void null)
    {
        variable.end = variable.start + variable.duration;
    }
};

Utils.preprocessTimeAnimation = function(animStart, animDuration, animEnd, animationDefinition)
{
    if (animationDefinition !== void null)
    {
        for (var i = 0; i < animationDefinition.length; i++)
        {
            var time = animationDefinition[i];
            Utils.setTimeVariables(time, animStart, animEnd, animDuration);

            animStart = time.end;
            animDuration = time.duration;
            animEnd = animStart + animDuration;
        }
    }
};


Utils.interpolateLinear = function(p, a, b) {
    return ((p)*((b)-(a)) + (a));
}

Utils.interpolateSmoothStep = function(p, a, b)
{
    let x = Utils.clampRange((Utils.interpolateLinear(p, a, b) - a)/(b - a), 0.0, 1.0);
    return x*x*(3 - 2*x);
}

Utils.interpolateSmootherStep = function(p, a, b)
{
    let x = Utils.clampRange((Utils.interpolateLinear(p, a, b) - a)/(b - a), 0.0, 1.0);
    return x*x*x*(x*(x*6 - 15) + 10);
}

Utils.interpolate = function(p,a,b,type)
{
    p = Utils.clampRange(p, 0.0, 1.0);
    
    let value = 0.0;
    switch(type)
    {
        case 2:
            value = Utils.interpolateSmootherStep(p, a, b);
            break;

        case 1:
            value = Utils.interpolateSmoothStep(p, a, b);
            break;

        case 0:
        default:
            value = Utils.interpolateLinear(p, a, b);
            break;
    }

    return value;
}

var Constants = function()
{
};

Constants.Align = {
    'NONE': 0 ,
    'CENTER': 1 ,
    'HORIZONTAL': 2 ,
    'VERTICAL': 3 ,
    'LEFT': 4 ,
    'RIGHT': 5
};

export { Utils, Constants };
