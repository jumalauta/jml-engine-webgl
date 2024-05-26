import * as THREE from 'three';
import { Utils } from './Utils';
import { loggerDebug, loggerWarning } from './Bindings';
import { Timer } from './Timer';
import { FileManager } from './FileManager';

/** @constructor */
const Shader = function (animationDefinition) {
  this.vertexShaderUrl = '_embedded/default.vs';
  this.fragmentShaderUrl = '_embedded/default.fs';
  if (animationDefinition.perspective === '2d') {
    this.vertexShaderUrl = '_embedded/default2d.vs';
    this.fragmentShaderUrl = '_embedded/default2d.fs';
  }
  this.shaderDefinition = animationDefinition.shader;

  if (this.shaderDefinition.name) {
    const name =
      this.shaderDefinition.name instanceof Array
        ? this.shaderDefinition.name
        : [this.shaderDefinition.name];
    name.forEach((shaderUrl) => {
      if (
        shaderUrl.toUpperCase().endsWith('.VS') ||
        shaderUrl.toUpperCase().endsWith('.VERT')
      ) {
        this.vertexShaderUrl = shaderUrl;
      } else if (
        shaderUrl.toUpperCase().endsWith('.FS') ||
        shaderUrl.toUpperCase().endsWith('.FRAG')
      ) {
        this.fragmentShaderUrl = shaderUrl;
      } else {
        // To ensure best possible cross-browser and engine support, supported file formats are being restricted
        throw new Error('Unsupported shader format ' + shaderUrl);
      }
    });
  }
};

Shader.convertToThreeJsUniformValues = function (value) {
  const v = Utils.evaluateVariable(null, value);

  if (v instanceof Array) {
    v.forEach((element, index) => {
      v[index] = Utils.evaluateVariable(null, v[index]);
    });

    switch (v.length) {
      case 1:
        return v[0];
      case 2:
        return new THREE.Vector2(v[0], v[1]);
      case 3:
        return new THREE.Vector3(v[0], v[1], v[2]);
      case 4:
        return new THREE.Vector4(v[0], v[1], v[2], v[3]);
      default:
        loggerWarning('Unsupported uniform value length: ' + v.length);
    }
  }

  return v;
};

Shader.prototype.createThreeJsUniforms = function () {
  const uniforms = {};

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

Shader.prototype.createMaterial = function (vertexData, fragmentData) {
  // Parse uniforms from the fragment shader, note that this does not support excluding commented out uniforms
  const uniforms = fragmentData.match(
    /uniform\s+([a-zA-Z0-9]+)\s+([a-zA-Z0-9_]+)\s*;/g
  );
  if (uniforms) {
    uniforms.forEach((match) => {
      const type = match.split(' ')[1];
      const name = match.split(' ')[2].replace(';', '');

      // This tries to support the automatic variable assignments
      if (name === 'texture0' && type === 'sampler2D') {
        this.shaderDefinition.variable = this.shaderDefinition.variable || [];
        this.shaderDefinition.variable.push({ name, value: undefined });
      } else if (name === 'texture1' && type === 'sampler2D') {
        this.shaderDefinition.variable = this.shaderDefinition.variable || [];
        this.shaderDefinition.variable.push({ name, value: undefined });
      } else if (name === 'texture2' && type === 'sampler2D') {
        this.shaderDefinition.variable = this.shaderDefinition.variable || [];
        this.shaderDefinition.variable.push({ name, value: undefined });
      } else if (name === 'texture3' && type === 'sampler2D') {
        this.shaderDefinition.variable = this.shaderDefinition.variable || [];
        this.shaderDefinition.variable.push({ name, value: undefined });
      } else if (name === 'time' && type === 'float') {
        this.shaderDefinition.variable = this.shaderDefinition.variable || [];
        this.shaderDefinition.variable.push({ name, value: undefined });
      } else if (name === 'timePercent' && type === 'float') {
        this.shaderDefinition.variable = this.shaderDefinition.variable || [];
        this.shaderDefinition.variable.push({ name, value: undefined });
      } else if (name === 'color' && type === 'vec4') {
        this.shaderDefinition.variable = this.shaderDefinition.variable || [];
        this.shaderDefinition.variable.push({ name, value: undefined });
      }
    });
  }

  this.material = new THREE.ShaderMaterial({
    name: this.fragmentShaderUrl,
    glslVersion: THREE.GLSL3,
    uniforms: this.createThreeJsUniforms(),
    vertexShader: vertexData,
    fragmentShader: fragmentData
  });
  this.ptr = this.material;

  loggerDebug(
    'Created shader ' + this.vertexShaderUrl + ' and ' + this.fragmentShaderUrl
  );
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
          fileManager.getFileData(instance.vertexShaderUrl),
          fileManager.getFileData(instance.fragmentShaderUrl)
        );
        resolve(instance);
      } catch (e) {
        console.error(
          'Could not load shader ' +
            instance.vertexShaderUrl +
            ' and ' +
            instance.fragmentShaderUrl
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
          console.error(
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
              console.error(
                'Could not load fragment shader ' + instance.fragmentShaderUrl
              );
              instance.error = true;
              reject(instance);
              return;
            }

            // Ensure we have working updates...
            fileManager.setRefreshFileTimestamp(instance.vertexShaderUrl);
            fileManager.setFileData(instance.vertexShaderUrl, vertexData);

            fileManager.setRefreshFileTimestamp(instance.fragmentShaderUrl);
            fileManager.setFileData(instance.fragmentShaderUrl, fragmentData);

            instance.createMaterial(vertexData, fragmentData);

            resolve(instance);
          },
          // onProgress callback
          undefined,
          // onError callback
          (err) => {
            console.error(
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
        console.error(
          `Could not load vertex shader ${instance.vertexShaderUrl}: ${err}`
        );
        instance.error = true;
        reject(instance);
      }
    );
  });
};

Shader.increaseLoaderResourceCountWithShaders = function () {
  /*    if (Settings.demoScript.shaders !== undefined)
    {
        setResourceCount(Settings.demoScript.shaders.length);
    }

    if (Settings.demoScript.shaderPrograms !== undefined)
    {
        setResourceCount(Settings.demoScript.shaderPrograms.length);
    } */
};

Shader.compileAndLinkShaders = function () {
  Shader.increaseLoaderResourceCountWithShaders();

  /* if (Settings.demoScript.shaders !== undefined)
    {
        for (var shaderI = 0; shaderI < Settings.demoScript.shaders.length; shaderI++)
        {
            if (isUserExit())
            {
                return;
            }

            var shader = Settings.demoScript.shaders[shaderI];
            if (shader.skip === true)
            {
                continue;
            }
            shader.ref = shaderLoad(shader.name, shader.filename);

            notifyResourceLoaded();
        }
    }

    if (Settings.demoScript.shaderPrograms !== undefined)
    {
        for (var programI = 0; programI < Settings.demoScript.shaderPrograms.length; programI++)
        {
            if (isUserExit())
            {
                return;
            }

            var shaderProgram = Settings.demoScript.shaderPrograms[programI];
            if (shaderProgram.skip === true)
            {
                continue;
            }

            shaderProgram.ref = shaderProgramLoad(shaderProgram.name);
            for (var shaderI = 0; shaderI < shaderProgram.shaders.length; shaderI++)
            {
                var shader = shaderProgram.shaders[shaderI];
                shaderProgramAddShaderByName(shaderProgram.name, shader.name);
            }

            shaderProgramAttachAndLink(shaderProgram.ref.ptr);
            notifyResourceLoaded();
        }
    } */
};

/* Shader.load = function(shader)
{
    var shaderProgram = getShaderProgramFromMemory(shader.programName);
    if (shaderProgram.ptr === undefined)
    {
        shaderProgram = shaderProgramLoad(shader.programName);
        for (var i = 0; i < shader.name.length; i++)
        {
            var shaderFilename = shader.name[i];
            var loadedShader = shaderLoad(shaderFilename, shaderFilename);
            if (loadedShader.ok == 1)
            {
                shaderProgramAddShaderByName(shader.programName, shaderFilename);
            }
            else
            {
                return undefined;
            }
        }
        shaderProgramAttachAndLink(shaderProgram.ptr);
    }

    return shaderProgram;
}; */

Shader.enableShader = function (animation) {
  if (animation.shader !== undefined) {
    // shaderProgramUse(animation.shader.ref.ptr);

    if (animation.shader.ref && animation.shader.variable !== undefined) {
      animation.shader.variable.forEach((variable) => {
        if (variable.value !== undefined) {
          // if (variable.name.startsWith('speed')) {
          // }
          animation.shader.ref.material.uniforms[variable.name].value =
            Shader.convertToThreeJsUniformValues([...variable.value]);
        } else {
          if (variable.name === 'texture0' && animation.ref.texture) {
            animation.shader.ref.material.uniforms[variable.name].value =
              animation.ref.texture[0];
          } else if (
            variable.name === 'texture1' &&
            animation.ref.texture.length >= 2
          ) {
            animation.shader.ref.material.uniforms[variable.name].value =
              animation.ref.texture[1];
          } else if (
            variable.name === 'texture2' &&
            animation.ref.texture.length >= 3
          ) {
            animation.shader.ref.material.uniforms[variable.name].value =
              animation.ref.texture[2];
          } else if (
            variable.name === 'texture3' &&
            animation.ref.texture.length >= 4
          ) {
            animation.shader.ref.material.uniforms[variable.name].value =
              animation.ref.texture[3];
          } else if (variable.name === 'time') {
            animation.shader.ref.material.uniforms[variable.name].value =
              new Timer().getTimeInSeconds();
          } else if (variable.name === 'timePercent') {
            animation.shader.ref.material.uniforms[variable.name].value =
              new Timer().getTimePercent();
          } else if (variable.name === 'color') {
            animation.shader.ref.material.uniforms[variable.name].value =
              new THREE.Vector4(1.0, 1.0, 1.0, 1.0);
          }
        }
      });

      /* var _getUniformLocation = getUniformLocation;
            var _glUniformi = glUniformi;
            var _glUniformf = glUniformf;
            var _setUniformFunction = undefined;

            var length = animation.shader.variable.length;
            for (var i = 0; i < length; i++)
            {
                var variable = animation.shader.variable[i];
                var name = _getUniformLocation(variable.name);

                _setUniformFunction = _glUniformf;
                if (variable.type === 'int')
                {
                    _setUniformFunction = _glUniformi;
                }

                var value = [];
                if (Utils.isString(variable.value) === true)
                {
                    value = Utils.evaluateVariable(animation, variable.value);
                }
                else
                {
                    var valueLength = variable.value.length;
                    for (var j = 0; j < valueLength; j++)
                    {
                        value.push(Utils.evaluateVariable(animation, variable.value[j]));
                    }
                }

                var valueLength = value.length;

                switch (valueLength)
                {
                    case 1:
                        _setUniformFunction(name, value[0]);
                        break;
                    case 2:
                        _setUniformFunction(name, value[0], value[1]);
                        break;
                    case 3:
                        _setUniformFunction(name, value[0], value[1], value[2]);
                        break;
                    case 4:
                        _setUniformFunction(name, value[0], value[1], value[2], value[3]);
                        break;
                    default:
                        break;
                }
            } */
    }
  }
};

Shader.disableShader = function (animation) {
  if (animation.shader !== undefined) {
    // disableShaderProgram(animation.shader.ref.ptr);
  }
};

export { Shader };
