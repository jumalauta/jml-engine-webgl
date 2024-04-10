import * as THREE from 'three';
import { Utils } from './Utils.js';
import { loggerDebug, loggerWarning } from './Bindings';
import { Timer } from './Graphics.js';

  
/** @constructor */
var Shader = function(animationDefinition)
{
    this.vertexShaderUrl   = '_embedded/default.vs';
    this.fragmentShaderUrl = '_embedded/default.fs';
    this.shaderDefinition  = animationDefinition.shader;

    if (this.shaderDefinition.name) {
        let name = this.shaderDefinition.name instanceof Array ? this.shaderDefinition.name : [this.shaderDefinition.name];
        name.forEach((shaderUrl) => {
            if (shaderUrl.toUpperCase().endsWith('.VS') || shaderUrl.toUpperCase().endsWith('.VERT')) {
                this.vertexShaderUrl = shaderUrl;
            } else {
                this.fragmentShaderUrl = shaderUrl;
            }
        });
    }
};

Shader.convertToThreeJsUniformValues = function(value) {
    let v = Utils.evaluateVariable(null, value);

    if (v instanceof Array) {
        v.forEach((element, index) => {
            v[index] = Utils.evaluateVariable(null, v[index]);
        });

        switch(v.length) {
            case 1:
                return v[0];
            case 2:
                return new THREE.Vector2(v[0], v[1]);
            case 3:
                return new THREE.Vector3(v[0], v[1], v[2]);
            case 4:
                return new THREE.Vector4(v[0], v[1], v[2], v[3]);
            default:
                loggerWarning("Unsupported uniform value length: " + v.length);
        }
    }

    return v;
}

Shader.prototype.createThreeJsUniforms = function() {
    let uniforms = {};

    if (this.shaderDefinition.variable) {
        this.shaderDefinition.variable.forEach((variable) => {
            if (variable.value !== undefined) {
                uniforms[variable.name] = { value: Shader.convertToThreeJsUniformValues([...variable.value]) };
            } else {
                uniforms[variable.name] = { value: undefined };
            }
        });
    }

    return THREE.UniformsUtils.clone(uniforms);
}

Shader.prototype.load = function() {
    let instance = this;

    return new Promise((resolve, reject) => {
        (new THREE.FileLoader()).load(
            instance.vertexShaderUrl,
            // onLoad callback
            (vertexData) => {
                if (vertexData[0] === '<') {
                    console.error( 'Could not load vertex shader ' + instance.vertexShaderUrl );
                    instance.error = true;
                    reject(instance);
                    return;    
                }

                (new THREE.FileLoader()).load(
                    instance.fragmentShaderUrl,
                    // onLoad callback
                    (fragmentData) => {
                        if (fragmentData[0] === '<') {
                            console.error( 'Could not load fragment shader ' + instance.fragmentShaderUrl );
                            instance.error = true;
                            reject(instance);
                            return;    
                        }


                        // Parse uniforms from the fragment shader, note that this does not support excluding commented out uniforms
                        const uniforms = fragmentData.match(/uniform\s+([a-zA-Z0-9]+)\s+([a-zA-Z0-9_]+)\s*;/g);
                        if (uniforms) {
                            uniforms.forEach((match) => {
                                let type = match.split(' ')[1];
                                let name = match.split(' ')[2].replace(';', '');
    
                                // This tries to support the automatic variable assignments
                                if (name === 'texture0' && type === 'sampler2D') {
                                    instance.shaderDefinition.variable = instance.shaderDefinition.variable || [];
                                    instance.shaderDefinition.variable.push({ name: name, value: undefined });
                                } else if (name === 'time' && type === 'float') {
                                    instance.shaderDefinition.variable = instance.shaderDefinition.variable || [];
                                    instance.shaderDefinition.variable.push({ name: name, value: undefined });
                                } else if (name === 'color' && type === 'vec4') {
                                    instance.shaderDefinition.variable = instance.shaderDefinition.variable || [];
                                    instance.shaderDefinition.variable.push({ name: name, value: undefined });
                                }
                            });
                        }

                        instance.material = new THREE.ShaderMaterial({
                            uniforms: instance.createThreeJsUniforms(),
                            vertexShader: vertexData,
                            fragmentShader: fragmentData,
                        });
                        instance.ptr = instance.material;

                        loggerDebug('Downloaded shader ' + instance.vertexShaderUrl + ' and ' + instance.fragmentShaderUrl);

                        resolve(instance);
                    },
                    // onProgress callback
                    undefined,
                    // onError callback
                    (err) => {
                        console.error( 'Could not load fragment shader ' + instance.fragmentShaderUrl );
                        instance.error = true;
                        reject(instance);
                    }
                );
            },
            // onProgress callback
            undefined,
            // onError callback
            (err) => {
                console.error( 'Could not load vertex shader file ' + instance.vertexShaderUrl );
                instance.error = true;
                reject(instance);
            }
        );
    });
}


Shader.increaseLoaderResourceCountWithShaders = function()
{
/*    if (Settings.demoScript.shaders !== void null)
    {
        setResourceCount(Settings.demoScript.shaders.length);
    }

    if (Settings.demoScript.shaderPrograms !== void null)
    {
        setResourceCount(Settings.demoScript.shaderPrograms.length);
    }*/
};

Shader.compileAndLinkShaders = function()
{
    Shader.increaseLoaderResourceCountWithShaders();

    /*if (Settings.demoScript.shaders !== void null)
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

    if (Settings.demoScript.shaderPrograms !== void null)
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
    }*/
};

/*Shader.load = function(shader)
{
    var shaderProgram = getShaderProgramFromMemory(shader.programName);
    if (shaderProgram.ptr === void null)
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
                return void null;
            }
        }
        shaderProgramAttachAndLink(shaderProgram.ptr);
    }

    return shaderProgram;
};*/

Shader.enableShader = function(animation)
{
    if (animation.shader !== void null)
    {
        //shaderProgramUse(animation.shader.ref.ptr);

        if (animation.shader.ref && animation.shader.variable !== void null)
        {
            animation.shader.variable.forEach((variable) => {
                if (variable.value !== undefined) {
                    //if (variable.name.startsWith('speed')) {
                    //}
                    animation.shader.ref.material.uniforms[variable.name].value = Shader.convertToThreeJsUniformValues([...variable.value]);
                } else {
                    if (variable.name === 'texture0' && animation.ref.texture) {
                        animation.shader.ref.material.uniforms[variable.name].value = animation.ref.texture;
                    } else if (variable.name === 'time') {
                        animation.shader.ref.material.uniforms[variable.name].value = (new Timer()).getTimeInSeconds();
                    } else if (variable.name === 'color') {
                        animation.shader.ref.material.uniforms[variable.name].value = new THREE.Vector4(1.0, 1.0, 1.0, 1.0);
                    }
                }
            });

            /*var _getUniformLocation = getUniformLocation;
            var _glUniformi = glUniformi;
            var _glUniformf = glUniformf;
            var _setUniformFunction = void null;

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
            }*/
        }
    }
};

Shader.disableShader = function(animation)
{
    if (animation.shader !== void null)
    {
        //disableShaderProgram(animation.shader.ref.ptr);
    }
}

export { Shader };