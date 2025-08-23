import * as THREE from 'three';
import { Settings } from './Settings';
import { loggerDebug } from './Bindings';

const settings = new Settings();

const defaultName = 'default';

const cache = new Map();

const CubeMap = function (cubeMapSettings) {
  if (cubeMapSettings === undefined) {
    throw new Error('cubeMapSettings undefined');
  }

  if (cubeMapSettings.name === undefined) {
    cubeMapSettings.name = defaultName;
  }

  if (!cache.has(cubeMapSettings.name)) {
    cache.set(cubeMapSettings.name, this.create(cubeMapSettings));
  }

  return CubeMap.get(cubeMapSettings.name);
};

CubeMap.get = function (name) {
  const cubeMapName = (name || defaultName).replace('.cube.map', '');

  if (!cache.has(cubeMapName)) {
    throw new Error(`CubeMap '${cubeMapName}' not found`);
  }

  return cache.get(cubeMapName);
};

CubeMap.prototype.create = function (cubeMapSettings) {
  this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(
    cubeMapSettings.renderTarget.size
  );
  settings.toThreeJsProperties(
    cubeMapSettings.renderTarget.options,
    this.cubeRenderTarget
  );
  settings.toThreeJsProperties(
    cubeMapSettings.renderTarget.texture,
    this.cubeRenderTarget.texture
  );
  this.cubeCamera = new THREE.CubeCamera(
    cubeMapSettings.camera.near,
    cubeMapSettings.camera.far,
    this.cubeRenderTarget
  );

  loggerDebug(`Created CubeMap: ${JSON.stringify(cubeMapSettings)}`);

  return this;
};

CubeMap.prototype.getTexture = function () {
  const texture = this.cubeRenderTarget.texture;
  if (!texture) {
    throw new Error('CubeMap texture not created');
  }
  return texture;
};

CubeMap.prototype.update = function (renderer, scene) {
  if (!renderer) {
    throw new Error('Renderer is not defined');
  }
  if (!scene) {
    throw new Error('Scene is not defined');
  }

  this.cubeCamera.update(renderer, scene);
};

CubeMap.prototype.dispose = function () {
  if (this.cubeRenderTarget) {
    this.cubeRenderTarget.dispose();
    this.cubeRenderTarget = undefined;
  }
  this.cubeCamera = undefined;
};

CubeMap.clear = function () {
  cache.forEach((cubeMap) => {
    cubeMap.dispose();
  });
  cache.clear();
};

export { CubeMap };
