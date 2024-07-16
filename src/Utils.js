import * as THREE from 'three';
import { loggerWarning, loggerTrace } from './Bindings';
import { getSceneTimeFromStart } from './Player';
import { Sync } from './Sync';
import { Random } from './Random';
import { Shader } from './Shader';

window.Sync = Sync;

/* eslint no-extend-native: "off" */
String.prototype.endsWith = function (suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

/** @constructor */
const Utils = function () {};

Utils.random = new Random().value;
Utils.setSeed = function (seed) {
  const random = new Random();
  random.setSeed(seed);
  Utils.random = random.value;
};

Utils.updateProperties = function (animation) {
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

  for (const key in properties) {
    if (threeObject[key] !== undefined) {
      threeObject[key] = Utils.evaluateVariable(animation, properties[key]);
    }
  }
};

Utils.setMaterialProperties = function (animation) {
  if (
    !animation.material &&
    (!animation.shader ||
      (!animation.shader.vertexShaderSuffix &&
        !animation.shader.fragmentShaderSuffix))
  ) {
    return;
  }

  if (!animation.ref && !animation.ref.mesh) {
    loggerWarning(
      'No mesh found for material properties, cannot set material properties'
    );
    return;
  }

  animation.ref.mesh.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      for (const key in animation.material) {
        if (obj.material[key] !== undefined) {
          const oldValue = obj.material[key];
          let newValue = Utils.evaluateVariable(
            animation,
            animation.material[key]
          );

          if (typeof newValue === 'string') {
            if (THREE[newValue] !== undefined) {
              newValue = THREE[newValue];
            }
          }

          if (oldValue !== newValue) {
            obj.material[key] = newValue;
            loggerTrace(
              `Replaced material property ${key} from ${oldValue} to ${newValue}`
            );
          }
        }
      }

      Shader.assignToMaterial(obj, animation);

      obj.material.needsUpdate = true;
    }
  });
};

Utils.clamp = function (value) {
  return Utils.clampRange(value, 0.0, 1.0);
};

Utils.clampRange = function (value, min, max) {
  return Math.min(Math.max(value, min), max);
};

Utils.mix = function (value1, value2, percent) {
  const a = value1;
  const b = value2;
  return a + (b - a) * percent;
};

Utils.calculateProgress = function (start, duration, noClamp) {
  const time = getSceneTimeFromStart();
  let p = (time - start) / duration;
  if (noClamp !== true) {
    p = Utils.clamp(p);
  }

  return p;
};

Utils.debugPrintStackTrace = function () {
  /* const stackTrace = ['stack trace:']

  // start from stackPosition -3 to skip printing of debugPrintStackTrace()
  for (let i = 0, stackPosition = -3; ; stackPosition--) {
    const info = Duktape.act(stackPosition)
    if (!info) {
      break
    }

    if (info.function.name == '') {
      continue
    }

    let string = '\tstack: ' + stackPosition
    string += ', function: ' + info.function.name
    string += ', line: ' + info.lineNumber
    string += ', info: ' + Duktape.enc('jx', info)
    stackTrace[++i] = string
  }

  if (stackTrace.length > 1) {
    debugPrint(stackTrace.join('\n'))
  }
    */
};

Utils.isArray = function (variable) {
  if (variable.constructor === Array) {
    return true;
  }

  return false;
};

Utils.isObject = function (variable) {
  if (variable !== null && typeof variable === 'object') {
    return true;
  }

  return false;
};

Utils.isEmptyObject = function (variable) {
  if (
    Utils.isObject(variable) &&
    Object.getOwnPropertyNames(variable).length === 0
  ) {
    return true;
  }

  return false;
};

Utils.isFunction = function (variable) {
  return typeof variable === 'function';
};

Utils.isString = function (variable) {
  if (typeof variable === 'string' || variable instanceof String) {
    return true;
  }

  return false;
};

Utils.isNumeric = function (variable) {
  if (!isNaN(parseFloat(variable)) && isFinite(variable)) {
    return true;
  }

  return false;
};

Utils.isVideo = function (filename) {
  if (filename.endsWith('.ogv') || filename.endsWith('.ogg')) {
    return true;
  }

  return false;
};

Utils.evaluateVariable = function (animation, variable) {
  if (Utils.isFunction(variable)) {
    return variable(animation);
  } else if (Utils.isString(variable) && variable.charAt(0) === '{') {
    /* eslint-disable no-new-func */
    const func = new Function('animation', variable);
    return func(animation);
  }

  return variable;
};

Utils.deepCopyJson = function (jsonObject) {
  const object = JSON.parse(JSON.stringify(jsonObject));

  if (jsonObject.ptr !== undefined) {
    object.ptr = jsonObject.ptr;
  }

  if (jsonObject.ref !== undefined) {
    if (jsonObject.ref.ptr !== undefined) {
      object.ref.ptr = jsonObject.ref.ptr;
    }
  }

  return object;
};

Utils.getRandomArrayIndex = function (array) {
  if (array.length !== undefined) {
    return Math.floor(Math.random() * array.length);
  }

  return undefined;
};

Utils.setTimeVariables = function (variable, animStart, animEnd, animDuration) {
  /* if (Utils.isString(variable.start)) {
    variable.start = convertTimeToSeconds(variable.start)
  }
  if (Utils.isString(variable.duration)) {
    variable.duration = convertTimeToSeconds(variable.duration)
  }
  if (Utils.isString(variable.end)) {
    variable.end = convertTimeToSeconds(variable.end)
  } */

  if (variable.start === undefined) {
    variable.start = animStart;
  }
  if (variable.duration === undefined) {
    if (variable.end !== undefined) {
      variable.duration = variable.end - variable.start;
    } else if (animDuration !== undefined) {
      variable.duration = animDuration;
      variable.end = variable.start + variable.duration;
    }
  }
  if (variable.end === undefined && variable.duration !== undefined) {
    variable.end = variable.start + variable.duration;
  }
};

Utils.preprocessTimeAnimation = function (
  animStart,
  animDuration,
  animEnd,
  animationDefinition
) {
  if (animationDefinition !== undefined) {
    for (let i = 0; i < animationDefinition.length; i++) {
      const time = animationDefinition[i];
      Utils.setTimeVariables(time, animStart, animEnd, animDuration);

      animStart = time.end;
      animDuration = time.duration;
      animEnd = animStart + animDuration;
    }
  }
};

Utils.interpolateLinear = function (p, a, b) {
  return p * (b - a) + a;
};

Utils.interpolateSmoothStep = function (p, a, b) {
  const x = Utils.clampRange(
    (Utils.interpolateLinear(p, a, b) - a) / (b - a),
    0.0,
    1.0
  );
  return x * x * (3 - 2 * x);
};

Utils.interpolateSmootherStep = function (p, a, b) {
  const x = Utils.clampRange(
    (Utils.interpolateLinear(p, a, b) - a) / (b - a),
    0.0,
    1.0
  );
  return x * x * x * (x * (x * 6 - 15) + 10);
};

Utils.interpolate = function (p, a, b, type) {
  p = Utils.clampRange(p, 0.0, 1.0);

  let value = 0.0;
  switch (type) {
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
};

const Constants = function () {};

Constants.Align = {
  NONE: 0,
  CENTER: 1,
  HORIZONTAL: 2,
  VERTICAL: 3,
  LEFT: 4,
  RIGHT: 5
};

window.Utils = Utils;

export { Utils, Constants };
