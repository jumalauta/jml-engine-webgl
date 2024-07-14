import * as THREE from 'three';
import { loggerWarning } from './Bindings';
import { Settings } from './Settings';

const settings = new Settings();

// var lights = {};

/*
      {
        type: 'Ambient',
        color: { r: 0.5, g: 0.5, b: 0.5 },
        intensity: 1.0,
      } */ /*,
      {
        type: 'Directional',
        castShadow: true,
        color: { r: 1.0, g: 1.0, b: 1.0 },
        intensity: 1.0,
        position: { x: 0.0, y: 1.0, z: 2.0 },
      },

Settings.prototype.createLight = function(light) {
  const lightType = THREE[light.type + 'Light'];
  if (!lightType || !lightType.prototype instanceof THREE.Light) {
    loggerWarning('Unsupported light type: ' + light.type);
    return;
  }

  let lightObj = new lightType(this.toThreeJsColor(light.color), light.intensity);
  this.setXyz(light.position, lightObj.position);

  if (light.castShadow) {
    lightObj.castShadow = light.castShadow;
    lightObj.shadow.mapSize.width = this.demo.shadow.mapSize.width;
    lightObj.shadow.mapSize.height = this.demo.shadow.mapSize.height;
    lightObj.shadow.camera.near = this.demo.camera.near;
    lightObj.shadow.camera.far = this.demo.camera.far;
  }

  return lightObj;
}

*/

const Light = function (animationDefinition) {
  /* if (typeof index != 'number' || index < 0 || index > 4) {
        loggerError("Light index is incorrect. index:" + index);
        return undefined;
    }

    if (!(index in lights)) {
        lights[index] = this;
    }

    this.index = index;

    return lights[index]; */

  const lightDefinition = animationDefinition.light;

  if (!lightDefinition) {
    throw new Error(
      'Light definition is missing! ' + JSON.stringify(animationDefinition)
    );
  }

  const LightType = THREE[lightDefinition.type + 'Light'];
  if (!LightType || (!LightType.prototype) instanceof THREE.Light) {
    loggerWarning('Unsupported light type: ' + lightDefinition.type);
    throw new Error(
      'Incorrect light definition: ' + JSON.stringify(lightDefinition)
    );
  }

  const light = new LightType(0xffffff, 1.0);
  if (lightDefinition.castShadow === true) {
    light.castShadow = true;
    light.shadow.mapSize.width = settings.demo.shadow.mapSize.width;
    light.shadow.mapSize.height = settings.demo.shadow.mapSize.height;
    light.shadow.camera.near = settings.demo.camera.near;
    light.shadow.camera.far = settings.demo.camera.far;
  }

  this.mesh = light;
};

Light.type = {
  // enum values duplicated in C
  DIRECTIONAL: 1,
  POINT: 2,
  SPOT: 3
};

Light.prototype.setType = function (type) {
  // lightSetType(this.index, type);
};

Light.prototype.setGenerateShadowMap = function (generateShadowMap) {
  // lightSetGenerateShadowMap(this.index, generateShadowMap === true ? 1 : 0);
};

Light.prototype.enable = function () {
  // lightSetOn(this.index);
  this.mesh.visible = true;
};

Light.prototype.disable = function () {
  // lightSetOff(this.index);
  this.mesh.visible = false;
};

Light.prototype.setAmbientColor = function (r, g, b, a) {
  // lightSetAmbientColor(this.index, r, g, b, a);
};

Light.prototype.setDiffuseColor = function (r, g, b, a) {
  // lightSetDiffuseColor(this.index, r, g, b, a);
};

Light.prototype.setSpecularColor = function (r, g, b, a) {
  // lightSetSpecularColor(this.index, r, g, b, a);
};

Light.prototype.setPosition = function (x, y, z) {
  // lightSetPosition(this.index, x, y, z);
  this.mesh.position.x = x;
  this.mesh.position.y = y;
  this.mesh.position.z = z;
};

Light.prototype.setDirection = function (x, y, z) {
  // lightSetDirection(this.index, x, y, z);
};

Light.prototype.setColor = function (r, g, b, a) {
  // setObjectColor(this.ptr, r/255, g/255, b/255, a/255);
  let nr = r;
  let ng = g;
  let nb = b;
  // let na = a
  if (settings.demo.compatibility.oldColors) {
    nr = r / 0xff;
    ng = g / 0xff;
    nb = b / 0xff;
    // na = a / 0xff
  }

  this.mesh.color = new THREE.Color(nr, ng, nb);
  // this.mesh.needsUpdate = true;
};

export { Light };
