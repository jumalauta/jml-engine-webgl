import * as THREE from 'three';
import { Utils } from './Utils';
import {
  loggerDebug,
  loggerInfo,
  loggerWarning,
  loggerError
} from './Bindings';
import { Timer } from './Timer';
import { FileManager } from './FileManager';
import { Settings } from './Settings';

const settings = new Settings();

/** @constructor */
const Shader = function (animationDefinition) {
  this.shaderDefinition = animationDefinition.shader;

  let vsPrefix = this.shaderDefinition.vertexShaderPrefix;
  let fsPrefix = this.shaderDefinition.fragmentShaderPrefix;
  let vsSuffix = this.shaderDefinition.vertexShaderSuffix;
  let fsSuffix = this.shaderDefinition.fragmentShaderSuffix;
  this.inlineShader = vsPrefix || fsPrefix || vsSuffix || fsSuffix;

  if (this.shaderDefinition.name) {
    this.vertexShaderUrl = '_embedded/default.vs';
    this.fragmentShaderUrl = '_embedded/default.fs';
    if (animationDefinition.billboard === true) {
      this.vertexShaderUrl = '_embedded/billboard.vs';
    }

    if (animationDefinition.perspective === '2d') {
      this.vertexShaderUrl = '_embedded/default2d.vs';
      this.fragmentShaderUrl = '_embedded/default2d.fs';
    }

    if (animationDefinition.text) {
      if (animationDefinition.perspective === '2d') {
        this.vertexShaderUrl = '_embedded/defaultFixedView.vs';
      }
      this.fragmentShaderUrl = '_embedded/defaultPlain.fs';
    }

    const name =
      this.shaderDefinition.name instanceof Array
        ? this.shaderDefinition.name
        : [this.shaderDefinition.name];
    name.forEach((shaderUrl) => {
      if (shaderUrl.toUpperCase().endsWith('.VS')) {
        this.vertexShaderUrl = shaderUrl;
      } else if (shaderUrl.toUpperCase().endsWith('.FS')) {
        this.fragmentShaderUrl = shaderUrl;
      } else {
        // To ensure best possible cross-browser and engine support, supported file formats are being restricted
        throw new Error('Unsupported shader format ' + shaderUrl);
      }
    });
  }
};

Shader.convertToThreeJsUniformValues = function (value) {
  const evaluateValue = (val) => {
    const evaluated = Utils.evaluateVariable(null, val);

    if (!Array.isArray(evaluated)) {
      return evaluated;
    }

    return evaluated.map((item) => evaluateValue(item));
  };

  const convertVector = (val) => {
    switch (val.length) {
      case 1:
        return val[0];
      case 2:
        return new THREE.Vector2(val[0], val[1]);
      case 3:
        return new THREE.Vector3(val[0], val[1], val[2]);
      case 4:
        return new THREE.Vector4(val[0], val[1], val[2], val[3]);
      default:
        loggerWarning('Unsupported uniform value length: ' + val.length);
    }
  };

  const convertValue = (val) => {
    if (!Array.isArray(val)) {
      return val;
    }

    if (val.length === 0) {
      return val;
    }

    const hasNestedArrays = val.some((item) => Array.isArray(item));
    const converted = val.map((item) => convertValue(item));

    if (hasNestedArrays) {
      if (converted.length === 1) {
        return converted[0];
      }

      return converted;
    }

    return convertVector(converted);
  };

  return convertValue(evaluateValue(value));
};

Shader.prototype.createThreeJsUniforms = function (uniforms) {
  if (this.shaderDefinition.variable) {
    this.shaderDefinition.variable.forEach((variable) => {
      if (variable.value !== undefined) {
        uniforms[variable.name] = {
          value: Shader.convertToThreeJsUniformValues([...variable.value])
        };
      } else {
        uniforms[variable.name] = { value: undefined };
      }
    });
  }

  return THREE.UniformsUtils.clone(uniforms);
};

Shader.prototype.getInlineUniforms = function () {
  if (!this.inlineUniforms) {
    this.inlineUniforms = this.createThreeJsUniforms({});
  }
  return this.inlineUniforms;
};

Shader.prototype.extendVariables = function (data) {
  // Parse uniforms from the fragment shader, note that this does not support excluding commented out uniforms
  const uniforms = data.match(
    /uniform\s+([a-zA-Z0-9]+)\s+([a-zA-Z0-9_]+)\s*;/g
  );
  if (uniforms) {
    uniforms.forEach((match) => {
      const type = match.split(' ')[1];
      const name = match.split(' ')[2].replace(';', '');

      this.uniformTypes = this.uniformTypes || {};
      this.uniformTypes[name] = type;

      // This tries to support the automatic variable assignments
      if (name === 'texture0' && type === 'sampler2D') {
        this.addAutoBoundVariable(name);
      } else if (name === 'texture1' && type === 'sampler2D') {
        this.addAutoBoundVariable(name);
      } else if (name === 'texture2' && type === 'sampler2D') {
        this.addAutoBoundVariable(name);
      } else if (name === 'texture3' && type === 'sampler2D') {
        this.addAutoBoundVariable(name);
      } else if (name === 'time' && type === 'float') {
        this.addAutoBoundVariable(name);
      } else if (name === 'timePercent' && type === 'float') {
        this.addAutoBoundVariable(name);
      } else if (name === 'color' && type === 'vec4') {
        this.addAutoBoundVariable(name);
      }
    });
  }
};

Shader.prototype.addAutoBoundVariable = function (name) {
  this.shaderDefinition.variable = this.shaderDefinition.variable || [];

  // Inline shaders are parsed on every compile, do not add the same variable twice
  const exists = this.shaderDefinition.variable.some(
    (variable) => variable.name === name
  );
  if (exists) {
    return;
  }

  this.shaderDefinition.variable.push({ name, value: undefined });
};

Shader.prototype.createMaterial = function (
  vertexShaderUrl,
  fragmentShaderUrl
) {
  const fileManager = new FileManager();
  const vertexData = fileManager.getFileData(vertexShaderUrl);
  const fragmentData = fileManager.getFileData(fragmentShaderUrl);

  if (this.inlineShader) {
    const vsPrefix = this.shaderDefinition.vertexShaderPrefix;
    const fsPrefix = this.shaderDefinition.fragmentShaderPrefix;
    const vsSuffix = this.shaderDefinition.vertexShaderSuffix;
    const fsSuffix = this.shaderDefinition.fragmentShaderSuffix;

    let logData = '';
    if (!vertexShaderUrl.startsWith('_embedded/')) {
      this.extendVariables(vertexData);
      this.shaderDefinition.vertexShaderPrefix = vertexData;
      logData = 'vertexShaderPrefix: ' + vertexShaderUrl;
      fileManager.setReference(vertexShaderUrl, this);
    }

    if (!fragmentShaderUrl.startsWith('_embedded/')) {
      this.extendVariables(fragmentData);
      this.shaderDefinition.fragmentShaderPrefix = fragmentData;
      logData = 'fragmentShaderPrefix: ' + fragmentShaderUrl;
      fileManager.setReference(fragmentShaderUrl, this);
    }

    loggerDebug(
      `Created inline shader, vsPrefix: ${!!vsPrefix}, vsSuffix: ${!!vsSuffix}, fsPrefix: ${!!fsPrefix}, fsSuffix: ${!!fsSuffix} - ${logData}`
    );
  } else {
    this.extendVariables(vertexData);
    this.extendVariables(fragmentData);

    const uniforms = {};
    this.material = new THREE.ShaderMaterial({
      name: fragmentShaderUrl,
      glslVersion: THREE.GLSL3,
      uniforms: this.createThreeJsUniforms(uniforms),
      vertexShader: vertexData,
      fragmentShader: fragmentData
    });
    this.ptr = this.material;

    fileManager.setReference(vertexShaderUrl, this);
    fileManager.setReference(fragmentShaderUrl, this);

    loggerDebug(
      `Created shader ${this.vertexShaderUrl} and ${this.fragmentShaderUrl}`
    );
  }
};

Shader.prototype.load = function () {
  const instance = this;

  const fileManager = new FileManager();

  if (
    fileManager.getFileData(instance.vertexShaderUrl) &&
    fileManager.getFileData(instance.fragmentShaderUrl)
  ) {
    return new Promise((resolve, reject) => {
      try {
        instance.createMaterial(
          instance.vertexShaderUrl,
          instance.fragmentShaderUrl
        );
        resolve(instance);
      } catch (e) {
        loggerError(
          `Could not load shader ${instance.vertexShaderUrl} and ${instance.fragmentShaderUrl}: ${e}`
        );
        instance.error = true;
        reject(instance);
      }
    });
  }

  return new Promise((resolve, reject) => {
    new THREE.FileLoader().load(
      fileManager.getUrl(instance.vertexShaderUrl),
      // onLoad callback
      (vertexData) => {
        if (vertexData[0] === '<') {
          loggerError(
            'Could not load vertex shader ' + instance.vertexShaderUrl
          );
          instance.error = true;
          reject(instance);
          return;
        }

        new THREE.FileLoader().load(
          fileManager.getUrl(instance.fragmentShaderUrl),
          // onLoad callback
          (fragmentData) => {
            if (fragmentData[0] === '<') {
              loggerError(
                'Could not load fragment shader ' + instance.fragmentShaderUrl
              );
              instance.error = true;
              reject(instance);
              return;
            }

            fileManager.setFileData(instance.vertexShaderUrl, vertexData);
            fileManager.setFileData(instance.fragmentShaderUrl, fragmentData);

            instance.createMaterial(
              instance.vertexShaderUrl,
              instance.fragmentShaderUrl
            );

            resolve(instance);
          },
          // onProgress callback
          undefined,
          // onError callback
          (err) => {
            loggerError(
              `Could not load fragment shader ${instance.fragmentShaderUrl}: ${err}`
            );
            instance.error = true;
            reject(instance);
          }
        );
      },
      // onProgress callback
      undefined,
      // onError callback
      (err) => {
        loggerError(
          `Could not load vertex shader ${instance.vertexShaderUrl}: ${err}`
        );
        instance.error = true;
        reject(instance);
      }
    );
  });
};

Shader.increaseLoaderResourceCountWithShaders = function () {
  // NOP - obsolete
};

Shader.compileAndLinkShaders = function () {
  Shader.increaseLoaderResourceCountWithShaders();
};

function insertBeforeLastOccurrence(str, insert, find) {
  if (!str) {
    loggerError(`Shader source code is empty, cannot search: '${find}'`);
    return undefined;
  }
  const index = str.lastIndexOf(find);
  if (index === -1) {
    loggerError(
      `Could not find place to inject shader code: '${find}', source: ${str}`
    );
    return str;
  }
  return str.substring(0, index) + insert + '\n' + str.substring(index);
}

function insertAfterFirstOccurrence(str, insert, find) {
  if (!str) {
    loggerError(`Shader source code is empty, cannot search: '${find}'`);
    return undefined;
  }
  const index = str.indexOf(find);
  if (index === -1) {
    loggerError(
      `Could not find place to inject shader code: '${find}', source: ${str}`
    );
    return str;
  }
  const at = index + find.length;
  return str.substring(0, at) + '\n' + insert + '\n' + str.substring(at);
}

// Detects whether a vertex suffix uses the object-space convention
// Use 'transformed' instead of 'gl_Position' because it also supports point light distance shadows
// gl_Position only works with directional and spot lights, not point lights
Shader.isObjectSpaceVertexSuffix = function (vsSuffix) {
  return (
    !!vsSuffix &&
    /\btransformed\b/.test(vsSuffix) &&
    !/\bgl_Position\b/.test(vsSuffix)
  );
};

Shader.setSourceMaterialPropertiesToShader = function (animationDefinition) {
  const sourceMaterial = animationDefinition.ref.mesh
    ? animationDefinition.ref.mesh.material
    : undefined;
  const shaderMaterial = animationDefinition.shader.ref.material;

  const propertiesToCopy = [
    'blending',
    'depthTest',
    'depthWrite',
    'transparent',
    'side'
  ];

  if (sourceMaterial && shaderMaterial) {
    propertiesToCopy.forEach((property) => {
      if (sourceMaterial[property] !== undefined) {
        shaderMaterial[property] = sourceMaterial[property];
      }
    });
  }
};

Shader.prototype.hotreload = function (path) {
  if (path && this.material && this.material.isMaterial) {
    const fileManager = new FileManager();
    loggerDebug('Updating material reference for: ' + path);
    if (this.material.fragmentShader && path.toUpperCase().endsWith('.FS')) {
      loggerInfo(`Updating material with fragment shader: ${path}`);
      this.material.fragmentShader = fileManager.getFileFromCache(path);
    } else if (
      this.material.vertexShader &&
      path.toUpperCase().endsWith('.VS')
    ) {
      loggerInfo(`Updating material with vertex shader: ${path}`);
      this.material.vertexShader = fileManager.getFileFromCache(path);
    } else if (this.inlineShader) {
      this.createMaterial(this.vertexShaderUrl, this.fragmentShaderUrl);
      loggerDebug(`Refreshing inline shader: ${this.name}`);
    } else {
      loggerInfo(`Shader path not recognized, will not hotreload - ${path}`);
      return false;
    }

    this.material.needsUpdate = true;

    return true;
  } else {
    loggerDebug(`Shader not found for hotreload - ${path || this.name}`);
  }

  return false;
};

Shader.injectInlineShaderCode = function (shader, ref, options) {
  const opts = options || {};
  const def = ref.shaderDefinition;
  const vsPrefix = def.vertexShaderPrefix;
  const vsSuffix = def.vertexShaderSuffix;
  const fsPrefix = def.fragmentShaderPrefix;
  const fsSuffix = def.fragmentShaderSuffix;

  if (vsPrefix) {
    ref.extendVariables(vsPrefix);
    shader.vertexShader = insertBeforeLastOccurrence(
      shader.vertexShader,
      vsPrefix,
      'void main'
    );
  }

  if (vsSuffix) {
    if (Shader.isObjectSpaceVertexSuffix(vsSuffix)) {
      // Use 'transformed' instead of 'gl_Position' because it also supports point light distance shadows
      shader.vertexShader = insertAfterFirstOccurrence(
        shader.vertexShader,
        vsSuffix,
        '#include <begin_vertex>'
      );
    } else {
      // Legacy (non object space) convention: the suffix overwrites gl_Position directly
      let suffix = vsSuffix;
      if (opts.vertexSuffixAppend) {
        suffix = `${suffix}\n${opts.vertexSuffixAppend}\n`;
      }
      shader.vertexShader = insertBeforeLastOccurrence(
        shader.vertexShader,
        suffix,
        '}'
      );
    }
  }

  if (fsPrefix) {
    ref.extendVariables(fsPrefix);
    shader.fragmentShader = insertBeforeLastOccurrence(
      shader.fragmentShader,
      fsPrefix,
      'void main'
    );
  }

  if (fsSuffix) {
    shader.fragmentShader = insertBeforeLastOccurrence(
      shader.fragmentShader,
      fsSuffix,
      '}'
    );
  }

  // Point every derived material at the same uniform so uniform update affects the color and shadow pass
  const shared = ref.getInlineUniforms();
  Object.keys(shared).forEach((name) => {
    shader.uniforms[name] = shared[name];
  });
};

// Ensures the shadow map is rendered with the same vertex shader
// Directional/spot lights use MeshDepthMaterial
Shader.assignShadowDepthMaterial = function (obj, animation, cacheKey) {
  const ref = animation.shader.ref;
  if (
    obj.customDepthMaterial &&
    obj.customDepthMaterial.userData.shaderRef === ref
  ) {
    return;
  }

  const properties = {};
  settings.toThreeJsProperties(
    settings.demo.shadow.meshMaterial.depth,
    properties
  );
  const depthMaterial = new THREE.MeshDepthMaterial(properties);
  depthMaterial.userData.shaderRef = ref;
  depthMaterial.customProgramCacheKey = cacheKey;
  depthMaterial.onBeforeCompile = function (shader) {
    Shader.injectInlineShaderCode(shader, ref, {
      vertexSuffixAppend: 'vHighPrecisionZW = gl_Position.zw;'
    });
  };

  obj.customDepthMaterial = depthMaterial;
};

// Point lights use MeshDistanceMaterial, which uses the world position 'transformed' instead of raw 'gl_Position'
Shader.assignShadowDistanceMaterial = function (obj, animation, cacheKey) {
  const ref = animation.shader.ref;
  if (
    obj.customDistanceMaterial &&
    obj.customDistanceMaterial.userData.shaderRef === ref
  ) {
    return;
  }

  const properties = {};
  settings.toThreeJsProperties(
    settings.demo.shadow.meshMaterial.distance,
    properties
  );
  const distanceMaterial = new THREE.MeshDistanceMaterial(properties);
  distanceMaterial.userData.shaderRef = ref;
  distanceMaterial.customProgramCacheKey = cacheKey;
  distanceMaterial.onBeforeCompile = function (shader) {
    Shader.injectInlineShaderCode(shader, ref, {});
  };

  obj.customDistanceMaterial = distanceMaterial;
};

Shader.assignToMaterial = function (obj, animation) {
  if (obj && animation && animation.shader && animation.shader.ref) {
    if (animation.shader.ref.inlineShader) {
      const ref = animation.shader.ref;
      const def = ref.shaderDefinition;

      // Ensure recompiling of shader on custom changes
      const cacheKey = function () {
        return btoa(
          `${def.vertexShaderPrefix}${def.vertexShaderSuffix}${def.fragmentShaderPrefix}${def.fragmentShaderSuffix}`
        );
      };
      obj.material.customProgramCacheKey = cacheKey;

      obj.material.onBeforeCompile = function (shader) {
        Shader.injectInlineShaderCode(shader, ref, {});
        ref.material = obj.material;
        obj.material.userData.shader = shader;
      };

      // A vertex shader must also be used in shadow/depth pass
      const hasVertexChange = def.vertexShaderPrefix || def.vertexShaderSuffix;
      if (hasVertexChange && obj.castShadow) {
        Shader.assignShadowDepthMaterial(obj, animation, cacheKey);
        if (Shader.isObjectSpaceVertexSuffix(def.vertexShaderSuffix)) {
          Shader.assignShadowDistanceMaterial(obj, animation, cacheKey);
        }
      }
    }
  }
};

Shader.enableShader = function (animation) {
  if (animation.shader !== undefined) {
    // shaderProgramUse(animation.shader.ref.ptr);

    if (
      animation.shader.ref &&
      animation.shader.ref.material &&
      animation.shader.variable !== undefined
    ) {
      const uniforms =
        animation.shader.ref.material.uniforms ||
        animation.shader.ref.material.userData.shader.uniforms;
      animation.shader.variable.forEach((variable) => {
        if (uniforms[variable.name] === undefined) {
          loggerWarning(
            `Uniform '${variable.name}' not found, cannot set value. Available uniforms: ${Object.keys(uniforms).join(', ')}`
          );
          return;
        }

        if (variable.value !== undefined) {
          uniforms[variable.name].value = Shader.convertToThreeJsUniformValues([
            ...variable.value
          ]);
        } else {
          if (variable.name === 'texture0' && animation.ref.texture) {
            uniforms[variable.name].value = animation.ref.texture[0];
          } else if (
            variable.name === 'texture1' &&
            animation.ref.texture &&
            animation.ref.texture.length >= 2
          ) {
            uniforms[variable.name].value = animation.ref.texture[1];
          } else if (
            variable.name === 'texture2' &&
            animation.ref.texture &&
            animation.ref.texture.length >= 3
          ) {
            uniforms[variable.name].value = animation.ref.texture[2];
          } else if (
            variable.name === 'texture3' &&
            animation.ref.texture &&
            animation.ref.texture.length >= 4
          ) {
            uniforms[variable.name].value = animation.ref.texture[3];
          } else if (variable.name === 'time') {
            uniforms[variable.name].value = new Timer().getTimeInSeconds();
          } else if (variable.name === 'timePercent') {
            uniforms[variable.name].value = new Timer().getTimePercent();
          } else if (variable.name === 'color') {
            uniforms[variable.name].value = new THREE.Vector4(
              1.0,
              1.0,
              1.0,
              1.0
            );
          }
        }
      });
    }
  }
};

Shader.disableShader = function () {
  // NOP - obsolete
};

export { Shader };
