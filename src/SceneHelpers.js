import * as THREE from 'three';
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js';
import { loggerInfo } from './Bindings';
import { Settings } from './Settings';

const settings = new Settings();

const rendererSize = new THREE.Vector2();
const rendererViewport = new THREE.Vector4();

// axis colors of View Direction Helper
const axisColorX = 0xff4466;
const axisColorZ = 0x4488ff;

const helperRenderOrder = 100000;

// projection properties copied to the demo camera
const cameraProjectionProperties = [
  'fov',
  'aspect',
  'near',
  'far',
  'zoom',
  'left',
  'right',
  'top',
  'bottom',
  'filmGauge',
  'filmOffset'
];

/** @constructor */
const SceneHelpers = function () {
  return this.getInstance();
};

SceneHelpers.prototype.getInstance = function () {
  if (!SceneHelpers.prototype._singletonInstance) {
    SceneHelpers.prototype._singletonInstance = this;
    this.helpers = new Map();
    this.helperScenes = new Map();
    this.overlays = new Map();
    this.demoCameraProxies = new Map();
  }

  return SceneHelpers.prototype._singletonInstance;
};

SceneHelpers.prototype.isLightHelpersEnabled = function () {
  return settings.engine.tool === true && settings.tool.helpers.lights === true;
};

SceneHelpers.prototype.isCameraHelpersEnabled = function () {
  return (
    settings.engine.tool === true && settings.tool.helpers.cameras === true
  );
};

SceneHelpers.prototype.setLightHelpersEnabled = function (enabled) {
  settings.tool.helpers.lights = enabled;
  loggerInfo(`Light helpers ${enabled === true ? 'shown' : 'hidden'}`);
};

SceneHelpers.prototype.isGridEnabled = function () {
  return settings.engine.tool === true && settings.tool.helpers.grid === true;
};

SceneHelpers.prototype.setGridEnabled = function (enabled) {
  settings.tool.helpers.grid = enabled;
  loggerInfo(`Grid ${enabled === true ? 'shown' : 'hidden'}`);
};

SceneHelpers.prototype.isCameraDirectionIndicatorEnabled = function () {
  return (
    settings.engine.tool === true &&
    settings.tool.helpers.cameraDirectionIndicator === true
  );
};

SceneHelpers.prototype.setCameraDirectionIndicatorEnabled = function (enabled) {
  settings.tool.helpers.cameraDirectionIndicator = enabled;
  loggerInfo(
    `Camera direction indicator ${enabled === true ? 'shown' : 'hidden'}`
  );
};

SceneHelpers.prototype.setCameraHelpersEnabled = function (enabled) {
  settings.tool.helpers.cameras = enabled;
  if (!settings.tool.helpers.cameras) {
    this.releaseDemoCameraProxies();
  }
  loggerInfo(`Camera helpers ${enabled === true ? 'shown' : 'hidden'}`);
};

SceneHelpers.prototype.getDemoCameraProxy = function (demoCamera) {
  if (!this.isCameraHelpersEnabled() || !demoCamera) {
    return undefined;
  }

  let proxy = this.demoCameraProxies.get(demoCamera);
  if (!proxy) {
    proxy = demoCamera.clone();
    proxy.name = `${demoCamera.name || 'demo'}CameraProxy`;
    this.demoCameraProxies.set(demoCamera, proxy);
  }

  cameraProjectionProperties.forEach((property) => {
    if (demoCamera[property] !== undefined) {
      proxy[property] = demoCamera[property];
    }
  });
  proxy.updateProjectionMatrix();

  return proxy;
};

SceneHelpers.prototype.releaseDemoCameraProxies = function () {
  this.demoCameraProxies.clear();
};

SceneHelpers.prototype.createHelper = function (object) {
  const size = settings.tool.helpers.size;
  const color = settings.tool.helpers.lightColor;

  if (object.isDirectionalLight) {
    return new THREE.DirectionalLightHelper(object, size, color);
  } else if (object.isHemisphereLight) {
    return new THREE.HemisphereLightHelper(object, size, color);
  } else if (object.isSpotLight) {
    return new THREE.SpotLightHelper(object, color);
  } else if (object.isRectAreaLight) {
    return new RectAreaLightHelper(object, color);
  } else if (object.isPointLight) {
    return new THREE.PointLightHelper(object, size * 0.5, color);
  } else if (object.isCamera) {
    return new THREE.CameraHelper(object);
  }

  // not all lights have position/direction, e.g., ambient light
  return null;
};

function forEachHelperMaterial(helper, callback) {
  helper.traverse((object) => {
    if (!object.material) {
      return;
    }

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach(callback);
  });
}

function updateHelperRendering(helper) {
  const alwaysOnTop = settings.tool.helpers.alwaysOnTop === true;

  helper.renderOrder = helperRenderOrder;
  helper.traverse((object) => {
    object.renderOrder = helperRenderOrder;
  });

  forEachHelperMaterial(helper, (material) => {
    material.depthTest = !alwaysOnTop;
    material.depthWrite = false;
    material.fog = false;
    material.toneMapped = false;
  });
}

SceneHelpers.prototype.getHelperScene = function (scene) {
  let helperScene = this.helperScenes.get(scene);
  if (!helperScene) {
    helperScene = new THREE.Scene();
    this.helperScenes.set(scene, helperScene);
  }

  return helperScene;
};

SceneHelpers.prototype.addHelper = function (scene, object) {
  let sceneHelpers = this.helpers.get(scene);
  if (!sceneHelpers) {
    sceneHelpers = new Map();
    this.helpers.set(scene, sceneHelpers);
  }

  if (sceneHelpers.has(object)) {
    return sceneHelpers.get(object);
  }

  const helper = this.createHelper(object);
  sceneHelpers.set(object, helper);

  if (helper) {
    helper.userData.sceneHelper = true;
    this.getHelperScene(scene).add(helper);
  }

  return helper;
};

SceneHelpers.prototype.removeHelper = function (helper) {
  if (!helper) {
    return;
  }

  if (helper.parent) {
    helper.parent.remove(helper);
  }

  if (helper.dispose) {
    helper.dispose();
  }
};

SceneHelpers.prototype.removeUnusedHelpers = function (scene, objects) {
  const sceneHelpers = this.helpers.get(scene);
  if (!sceneHelpers) {
    return;
  }

  sceneHelpers.forEach((helper, object) => {
    if (objects.has(object)) {
      return;
    }

    this.removeHelper(helper);
    sceneHelpers.delete(object);
  });

  if (sceneHelpers.size === 0) {
    this.helpers.delete(scene);
    this.helperScenes.delete(scene);
  }
};

function isObjectVisible(object) {
  let current = object;
  while (current) {
    if (current.visible === false) {
      return false;
    }
    current = current.parent;
  }

  return true;
}

SceneHelpers.prototype.clear = function () {
  this.helpers.forEach((sceneHelpers) => {
    sceneHelpers.forEach((helper) => this.removeHelper(helper));
  });

  this.helpers.clear();
  this.helperScenes.clear();
  this.overlays.clear();
  this.releaseDemoCameraProxies();

  this.disposeGrid();
};

SceneHelpers.prototype.update = function (scene, renderCamera) {
  if (!scene) {
    return;
  }

  const lightHelpers = this.isLightHelpersEnabled();
  const cameraHelpers = this.isCameraHelpersEnabled();

  if (!lightHelpers && !cameraHelpers && !this.helpers.has(scene)) {
    return;
  }

  const objects = new Set();

  if (lightHelpers || cameraHelpers) {
    scene.traverse((object) => {
      if (object.userData.sceneHelper === true) {
        return;
      }

      if (lightHelpers && object.isLight) {
        objects.add(object);
      } else if (cameraHelpers && object.isCamera && object !== renderCamera) {
        objects.add(object);
      }
    });
  }

  const demoCameraProxy = cameraHelpers
    ? this.demoCameraProxies.get(renderCamera)
    : undefined;
  if (demoCameraProxy) {
    demoCameraProxy.updateMatrixWorld(true);
    objects.add(demoCameraProxy);
  }

  this.removeUnusedHelpers(scene, objects);

  if (objects.size === 0) {
    return;
  }

  objects.forEach((object) => this.addHelper(scene, object));

  scene.updateMatrixWorld(true);

  this.helpers.get(scene).forEach((helper, object) => {
    if (!helper) {
      return;
    }

    helper.visible = isObjectVisible(object);
    if (!helper.visible) {
      return;
    }

    updateHelperRendering(helper);
    if (helper.update) {
      helper.update();
    }
  });
};

// helpers are drawn as an own pass on top of the rendered scene, so that the
// demo can not draw over them in post-processing passes
SceneHelpers.prototype.render = function (renderer, scene, renderCamera) {
  this.update(scene, renderCamera);

  const helperScene = this.helperScenes.get(scene);
  if (!renderer || !renderCamera || !helperScene) {
    return;
  }

  if (helperScene.children.length === 0) {
    return;
  }

  if (settings.tool.helpers.overlay === true) {
    this.overlays.set(helperScene, renderCamera);
    return;
  }

  const autoClear = renderer.autoClear;
  renderer.autoClear = false;
  renderer.render(helperScene, renderCamera);
  renderer.autoClear = autoClear;
};

function createGridAxisLine(from, to, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
  const material = new THREE.LineBasicMaterial({
    color,
    fog: false,
    toneMapped: false,
    depthTest: false,
    depthWrite: false
  });

  const line = new THREE.Line(geometry, material);
  line.renderOrder = 1;

  return line;
}

SceneHelpers.prototype.getGrid = function () {
  if (!this.grid) {
    const size = settings.tool.helpers.gridSize;
    const half = size / 2;
    const color = settings.tool.helpers.gridColor;

    const grid = new THREE.GridHelper(
      size,
      Math.max(1, Math.round(settings.tool.helpers.gridDivisions)),
      color,
      color
    );
    grid.material.fog = false;
    grid.material.toneMapped = false;
    grid.material.depthTest = false;
    grid.material.depthWrite = false;
    grid.material.transparent = true;
    grid.material.opacity = settings.tool.helpers.gridOpacity;

    this.grid = new THREE.Scene();
    this.grid.add(grid);

    this.grid.add(
      createGridAxisLine(
        new THREE.Vector3(-half, 0, 0),
        new THREE.Vector3(half, 0, 0),
        axisColorX
      )
    );
    this.grid.add(
      createGridAxisLine(
        new THREE.Vector3(0, 0, -half),
        new THREE.Vector3(0, 0, half),
        axisColorZ
      )
    );
  }

  return this.grid;
};

SceneHelpers.prototype.disposeGrid = function () {
  if (!this.grid) {
    return;
  }

  this.grid.traverse((object) => {
    if (object.geometry) {
      object.geometry.dispose();
    }
    if (object.material) {
      object.material.dispose();
    }
  });

  this.grid = undefined;
};

SceneHelpers.prototype.renderGrid = function (renderer, viewCamera) {
  if (!viewCamera) {
    return;
  }

  renderer.render(this.getGrid(), viewCamera);
};

SceneHelpers.prototype.getCameraDirectionIndicator = function () {
  if (!this.cameraDirectionIndicator) {
    this.cameraDirectionIndicatorCamera = new THREE.PerspectiveCamera();
    this.cameraDirectionIndicator = new ViewHelper(
      this.cameraDirectionIndicatorCamera
    );
    this.cameraDirectionIndicator.setLabels('X', 'Y', 'Z');

    this.cameraDirectionIndicatorView = new THREE.OrthographicCamera(
      -2,
      2,
      2,
      -2,
      0,
      4
    );
    this.cameraDirectionIndicatorView.position.set(0, 0, 2);
  }

  return this.cameraDirectionIndicator;
};

// indicator in the corner of the screen showing towards which axis the active camera is looking at
SceneHelpers.prototype.renderCameraDirectionIndicator = function (
  renderer,
  viewCamera
) {
  if (!viewCamera) {
    return;
  }

  const indicator = this.getCameraDirectionIndicator();
  viewCamera.getWorldQuaternion(this.cameraDirectionIndicatorCamera.quaternion);
  indicator.quaternion
    .copy(this.cameraDirectionIndicatorCamera.quaternion)
    .invert();
  indicator.updateMatrixWorld();

  // drawn to the upper right corner of the screen
  const size = Math.max(1, settings.tool.helpers.cameraDirectionIndicatorSize);
  renderer.getSize(rendererSize);
  renderer.getViewport(rendererViewport);

  renderer.clearDepth();
  renderer.setViewport(
    rendererSize.x - size,
    rendererSize.y - size,
    size,
    size
  );
  renderer.render(indicator, this.cameraDirectionIndicatorView);
  renderer.setViewport(
    rendererViewport.x,
    rendererViewport.y,
    rendererViewport.z,
    rendererViewport.w
  );
};

SceneHelpers.prototype.renderOverlay = function (renderer, viewCamera) {
  const cameraDirectionIndicator = this.isCameraDirectionIndicatorEnabled();
  const grid = this.isGridEnabled();
  if (
    !renderer ||
    (this.overlays.size === 0 && !cameraDirectionIndicator && !grid)
  ) {
    return;
  }

  const autoClear = renderer.autoClear;
  renderer.autoClear = false;
  renderer.setRenderTarget(null);

  if (grid) {
    this.renderGrid(renderer, viewCamera);
  }

  this.overlays.forEach((renderCamera, helperScene) => {
    renderer.render(helperScene, renderCamera);
  });
  this.overlays.clear();

  if (cameraDirectionIndicator) {
    this.renderCameraDirectionIndicator(renderer, viewCamera);
  }

  renderer.autoClear = autoClear;
};

export { SceneHelpers };
