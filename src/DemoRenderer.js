import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { loggerInfo, loggerTrace } from './Bindings';
import { LoadingBar } from './LoadingBar';
import { Fbo } from './Fbo';
import { CubeMap } from './CubeMap';
import { Effect } from './Effect';
import { Settings } from './Settings';
import { Spectogram } from './Spectogram';
import { ToolUi } from './ToolUi';
import { Timer } from './Timer';
const settings = new Settings();

const DemoRenderer = function () {
  return this.getInstance();
};

DemoRenderer.prototype.getInstance = function () {
  if (!DemoRenderer.prototype._singletonInstance) {
    DemoRenderer.prototype._singletonInstance = this;
    this.scenes = {};
  }

  return DemoRenderer.prototype._singletonInstance;
};

let scene, camera;
const orbitControlsMinimumDistance = 1.0;
const orbitControlsDirection = new THREE.Vector3();
let scenes = [];
let cameras = [];
let disposeList = {};

function disposeMemory() {
  Object.keys(disposeList).forEach((key) => {
    disposeList[key].dispose();
  });

  disposeList = {};
}

export function clearThreeObject(obj) {
  if (!obj) {
    return;
  }
  while (obj.children.length > 0) {
    clearThreeObject(obj.children[0]);
    obj.remove(obj.children[0]);
  }

  // we don't dispose stuff to enable quicker reloading times
  if (obj.geometry) {
    disposeList[obj.geometry.uuid] = obj.geometry;
  }

  if (obj.material) {
    const materials = Array.isArray(obj.material)
      ? obj.material
      : [obj.material];

    materials.forEach((material) => {
      Object.keys(material).forEach((key) => {
        if (material[key] && typeof material[key].dispose === 'function') {
          disposeList[material[key].uuid] = material[key];
        }
      });

      disposeList[material.uuid] = material;
    });
  }
}

DemoRenderer.prototype.cleanScene = function (forceDispose) {
  Object.values(this.scenes).forEach((scene) => {
    // console.log("removing scene " + scene.uuid);
    clearThreeObject(scene);
  });

  scenes.forEach((scene) => {
    // console.log("removing scene " + scene.uuid);
    clearThreeObject(scene);
  });
  cameras.forEach((scene) => {
    // console.log("removing camera " + scene.uuid);
    clearThreeObject(scene);
  });
  scenes = [];
  cameras = [];
  this.scenes = {};

  CubeMap.clear();
  Fbo.clear();
  if (!settings.engine.tool || forceDispose) {
    disposeMemory();
  }
};

DemoRenderer.prototype.setupScene = function () {
  this.cleanScene();

  // scene = settings.createScene();
  this.setScene('main');
  /* camera = new THREE.PerspectiveCamera( 75, aspectRatio, 0.1, 1000 );
  camera.position.z = 2;
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  camera.up = new THREE.Vector3(0, 1, 0);
  */
  settings.createLightsToScene(scene);
  camera = settings.createCamera();
  this.mainCameraPlacement = undefined;

  this.updateOrbitControlsCamera();
};

DemoRenderer.prototype.setScene = function (name) {
  if (this.scenes[name] === undefined) {
    this.scenes[name] = settings.createScene();
    settings.createLightsToScene(this.scenes[name]);
  }
  scene = this.scenes[name];
  // popView();
  // pushView(scene, getCamera());
  return scene;
};
DemoRenderer.prototype.getScene = function (name) {
  return this.scenes[name];
};

DemoRenderer.prototype.deinit = function () {
  if (this.renderer) {
    loggerTrace('Deinitializing renderer');

    this.clear();
    this.cleanScene(true);

    if (this.controls) {
      this.saveOrbitControlsTarget();
      this.controls.dispose();
      this.controls = null;
    }

    this.demoCamera = undefined;

    if (
      this.renderer.domElement &&
      document.body.contains(this.renderer.domElement)
    ) {
      document.body.removeChild(this.renderer.domElement);
    }

    this.renderer.dispose();
  }
};

DemoRenderer.prototype.init = function () {
  this.deinit();

  let canvas = document.getElementById('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    document.body.appendChild(canvas);
  }

  this.renderer = settings.createRenderer(canvas);

  const loadingBar = new LoadingBar();
  loadingBar.setRenderer(this.renderer);

  this.resize();

  document.body.appendChild(this.renderer.domElement);

  this.setupScene();
};

DemoRenderer.prototype.resize = function () {
  const aspectRatio = settings.demo.screen.aspectRatio;
  const scaleDown = settings.demo.screen.quality * settings.menu.quality;
  const scaleUp = 1.0 / scaleDown;

  this.fullCanvasWidth = window.innerWidth * 1.0;
  this.fullCanvasHeight =
    window.innerHeight * (new ToolUi().isVisible() ? 0.9 : 1.0);
  this.canvasWidth = this.fullCanvasWidth;
  this.canvasHeight = this.fullCanvasWidth / aspectRatio;
  if (this.canvasHeight > this.fullCanvasHeight) {
    this.canvasHeight = this.fullCanvasHeight;
    this.canvasWidth = this.fullCanvasHeight * aspectRatio;
  }
  this.canvasWidth *= scaleDown;
  this.canvasHeight *= scaleDown;
  this.canvasPositionY = (this.fullCanvasHeight - this.canvasHeight) / 2;

  const canvas = document.getElementById('canvas');
  if (canvas) {
    canvas.style.margin = `${this.canvasPositionY}px auto`;
    canvas.style.transform = `scale(${scaleUp})`;
  }

  if (this.renderer) {
    this.renderer.setSize(this.canvasWidth, this.canvasHeight, true);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  loggerTrace(
    `Canvas size: ${Math.floor(this.canvasWidth)}x${Math.floor(this.canvasHeight)}`
  );
};

DemoRenderer.prototype.setRenderNeedsUpdate = function (needsUpdate) {
  this.renderNeedsUpdate = needsUpdate;
};

DemoRenderer.prototype.isRenderNeedsUpdate = function () {
  return this.renderNeedsUpdate;
};

DemoRenderer.prototype.setOrbitControls = function (camera) {
  if (this.controls) {
    if (this.controls.object === camera) {
      return;
    }

    this.saveOrbitControlsTarget();
    this.controls.dispose();
    this.controls = null;
  }

  if (!camera) {
    return;
  }

  const canvas = document.getElementById('canvas');
  if (!canvas) {
    return;
  }

  this.controls = new OrbitControls(camera, canvas);
  this.controls.enablePan = this.isOrbitControlsEnabled();
  this.controls.enableDamping = true;
  this.controls.addEventListener('change', () => {
    this.renderNeedsUpdate = true;
  });

  if (this.isOrbitControlsEnabled()) {
    this.restoreOrbitControlsTarget();
  }

  this.controls.update();
};

// true = orbit controls override the camera animation of the demo
DemoRenderer.prototype.isOrbitControlsEnabled = function () {
  return this.orbitControlsEnabled === true;
};

DemoRenderer.prototype.isOrbitControlsActive = function () {
  return this.isOrbitControlsEnabled() && !!this.controls;
};

DemoRenderer.prototype.getOrbitCamera = function () {
  if (!this.orbitCamera) {
    this.orbitCamera = settings.createCamera();
  }

  return this.orbitCamera;
};

DemoRenderer.prototype.updateOrbitControlsCamera = function () {
  this.setOrbitControls(
    this.isOrbitControlsEnabled() ? this.getOrbitCamera() : camera
  );
};

DemoRenderer.prototype.setDemoCamera = function (demoCamera) {
  this.demoCamera = demoCamera;
};

DemoRenderer.prototype.applyOrbitControls = function (followerCamera) {
  if (!this.isOrbitControlsActive() || !followerCamera) {
    return false;
  }

  const orbitCamera = this.controls.object;
  if (followerCamera !== orbitCamera) {
    followerCamera.position.copy(orbitCamera.position);
    followerCamera.quaternion.copy(orbitCamera.quaternion);
    followerCamera.up.copy(orbitCamera.up);
  }

  return true;
};

// demos that do not animate any camera of their own are viewed through the
// camera of the main view, so the free camera controls it directly
DemoRenderer.prototype.updateMainViewOrbitControls = function () {
  if (this.isOrbitControlsActive() && !this.demoCamera && camera) {
    if (!this.mainCameraPlacement) {
      this.mainCameraPlacement = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        up: camera.up.clone()
      };
    }

    this.applyOrbitControls(camera);
  } else if (this.mainCameraPlacement) {
    camera.position.copy(this.mainCameraPlacement.position);
    camera.quaternion.copy(this.mainCameraPlacement.quaternion);
    camera.up.copy(this.mainCameraPlacement.up);
    this.mainCameraPlacement = undefined;
  }
};

DemoRenderer.prototype.setOrbitControlsEnabled = function (enabled) {
  this.orbitControlsEnabled = enabled === true;

  if (this.orbitControlsEnabled) {
    this.resetOrbitCameraToDemoCamera();

    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
  }

  this.updateOrbitControlsCamera();
  this.updateMainViewOrbitControls();
  this.renderNeedsUpdate = true;

  loggerInfo(
    `Camera controlled by ${this.orbitControlsEnabled ? 'orbit controls' : 'demo'}`
  );
};

DemoRenderer.prototype.toggleOrbitControls = function () {
  this.setOrbitControlsEnabled(!this.isOrbitControlsEnabled());
};

// start orbiting always from the placement of the camera of the demo
DemoRenderer.prototype.resetOrbitCameraToDemoCamera = function () {
  const orbitCamera = this.getOrbitCamera();
  const demoCamera = this.demoCamera || camera;

  const demoPlacement =
    demoCamera === camera && this.mainCameraPlacement
      ? this.mainCameraPlacement
      : demoCamera;

  if (!demoPlacement || demoCamera === orbitCamera) {
    return;
  }

  orbitCamera.position.copy(demoPlacement.position);
  orbitCamera.quaternion.copy(demoPlacement.quaternion);
  orbitCamera.up.copy(demoPlacement.up);
  orbitCamera.getWorldDirection(orbitControlsDirection);

  const distance = Math.max(
    orbitCamera.position.length(),
    orbitControlsMinimumDistance
  );

  this.orbitTarget = orbitCamera.position
    .clone()
    .addScaledVector(orbitControlsDirection, distance);
};

DemoRenderer.prototype.saveOrbitControlsTarget = function () {
  if (this.controls && this.controls.object === this.orbitCamera) {
    this.orbitTarget = this.controls.target.clone();
  }
};

DemoRenderer.prototype.restoreOrbitControlsTarget = function () {
  if (this.controls && this.orbitTarget) {
    this.controls.target.copy(this.orbitTarget);
  }
};

DemoRenderer.prototype.renderScene = function () {
  if (this.renderer) {
    this.renderer.render(scene, camera);
  }
};

DemoRenderer.prototype.clear = function () {
  if (this.renderer) {
    this.renderer.clear();
  }
};

DemoRenderer.prototype.render = function () {
  this.renderNeedsUpdate = false;

  new Spectogram().update();

  this.renderer.clear();

  this.updateMainViewOrbitControls();

  Effect.run('Demo');

  if (this.controls) {
    this.controls.update();
  }
};

DemoRenderer.prototype.preload = function (percent) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (settings.engine.preload) {
        const timer = new Timer();
        timer.setTimePercent(percent, true);
        timer.update();
        this.clear();
        this.render();
      }

      resolve();
    }, 1);
  });
};

function getScene() {
  return scenes.slice(-1)[0] || scene;
}
function getCamera() {
  return cameras.slice(-1)[0] || camera;
}
function pushView(s, c) {
  scenes.push(s);
  cameras.push(c);
}
function popView() {
  if (scenes.length === 0) {
    return;
  }
  scenes.pop();
  cameras.pop();
}

export { getScene, getCamera, pushView, popView };

function getScreenWidth() {
  return 1920;
}
function getScreenHeight() {
  return 1080;
}
window.getScreenWidth = getScreenWidth;
window.getScreenHeight = getScreenHeight;
window.DemoEngine = window.DemoEngine || {};
window.DemoEngine.getRenderer = function () {
  return new DemoRenderer().renderer;
};

export { DemoRenderer };
