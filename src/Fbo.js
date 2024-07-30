import * as THREE from 'three';
import {
  DemoRenderer,
  pushView,
  popView,
  clearThreeObject
} from './DemoRenderer';
import { Image } from './Image';
import { loggerDebug } from './Bindings';
import { Settings } from './Settings';

const settings = new Settings();

const demoRenderer = new DemoRenderer();

const fbos = {};

const Fbo = function (name, sceneName) {
  this.ptr = undefined;
  this.name = name;
  this.color = undefined;

  this.scene = undefined;
  if (sceneName) {
    this.scene = demoRenderer.getScene(sceneName);
  }

  if (!this.scene) {
    this.scene = settings.createScene();
    settings.createLightsToScene(this.scene);
  }

  this.camera = settings.createCamera();
};

Fbo.getFbos = function () {
  return fbos;
};

Fbo.clear = function () {
  for (const key in fbos) {
    // const fbo = fbos[key]
    //  FIXME implement proper dispose
    const fbo = fbos[key];
    clearThreeObject(fbo.scene);
    clearThreeObject(fbo.camera);
    delete fbos[key];
  }
};

Fbo.get = function (name) {
  return fbos[name];
};

Fbo.init = function (name, sceneName) {
  if (fbos[name]) {
    return fbos[name];
  }

  const fbo = new Fbo(name, sceneName);
  fbos[name] = fbo;

  fbo.name = name;

  fbo.target = new THREE.WebGLRenderTarget(
    demoRenderer.canvasWidth *
      settings.demo.fbo.quality *
      settings.menu.quality,
    demoRenderer.canvasHeight *
      settings.demo.fbo.quality *
      settings.menu.quality
  );
  fbo.target.depthTexture = new THREE.DepthTexture();
  fbo.target.depthTexture.format = THREE.DepthFormat;
  fbo.target.depthTexture.type = THREE.UnsignedShortType;
  fbo.target.stencilBuffer =
    fbo.target.depthTexture.format === THREE.DepthStencilFormat;

  fbo.color = new Image();
  fbo.color.texture = [fbo.target.texture];
  fbo.color.generateMesh();
  settings.toThreeJsProperties(
    settings.demo.fbo.color.texture,
    fbo.target.texture
  );
  fbo.target.texture.needsUpdate = true;

  fbo.depth = new Image();
  fbo.depth.texture = [fbo.target.depthTexture];
  fbo.depth.generateMesh();
  settings.toThreeJsProperties(
    settings.demo.fbo.depth.texture,
    fbo.target.depthTexture
  );
  fbo.target.depthTexture.needsUpdate = true;

  fbo.ptr = fbo.target;

  loggerDebug('Created FBO ' + name);

  return fbo;
};

Fbo.prototype.push = function () {
  pushView(this.scene, this.camera);
  return this.scene;
};

Fbo.prototype.pop = function () {
  popView();
};

Fbo.prototype.bind = function () {
  demoRenderer.renderer.setRenderTarget(this.target);
  demoRenderer.renderer.clear();
};

Fbo.prototype.unbind = function () {
  demoRenderer.renderer.render(this.scene, this.camera);
  demoRenderer.renderer.setRenderTarget(null);
};

export { Fbo };
