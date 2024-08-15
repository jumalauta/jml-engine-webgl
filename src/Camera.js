import * as THREE from 'three';
import { getCamera } from './DemoRenderer';
import { Settings } from './Settings';
const settings = new Settings();

var camDir = new THREE.Vector3(0, 0, 0);
window.camDirection = [0.0, 0.0, 0.0];

const Camera = function () {
  return this.getInstance();
};

Camera.prototype.getInstance = function () {
  if (!Camera.prototype._singletonInstance) {
    Camera.prototype._singletonInstance = this;
  }

  return Camera.prototype._singletonInstance;
};

Camera.prototype.setPerspective = function (fov, aspect, near, far, zoom) {
  // setCameraPerspective(fov, aspect, near, far);

  const camera = getCamera();
  camera.fov = fov || settings.demo.camera.fov;
  camera.aspect = aspect || settings.demo.camera.aspectRatio;
  camera.near = near || settings.demo.camera.near;
  camera.far = far || settings.demo.camera.far;
  camera.zoom = zoom || settings.demo.camera.zoom;
};

Camera.prototype.setPosition = function (x, y, z) {
  // setCameraPosition(x, y, z);
  const camera = getCamera();
  camera.position.set(x, y, z);
};

Camera.prototype.setLookAt = function (x, y, z) {
  // setCameraLookAt(x, y, z);
  const camera = getCamera();
  camera.lookAt(x, y, z);
};

Camera.prototype.setRotation = function (
  pitchDegrees,
  yawDegrees,
  rollDegrees
) {
  const camera = getCamera();
  camera.rotation.order = 'YXZ';
  camera.rotation.x = (pitchDegrees * Math.PI) / 180;
  camera.rotation.y = (yawDegrees * Math.PI) / 180;
  camera.rotation.z = (rollDegrees * Math.PI) / 180;
};

Camera.prototype.setUpVector = function (x, y, z) {
  // setCameraUpVector(x, y, z);
  const camera = getCamera();
  camera.up.set(x, y, z);
};

Camera.prototype.setPositionObject = function (modelPtr) {
  // loggerDebug("setPositionObject not implemented");
  // setCameraPositionObject(modelPtr);
};

Camera.prototype.setTargetObject = function (modelPtr) {
  // loggerDebug("setTargetObject not implemented");
  // setCameraTargetObject(modelPtr);
};

Camera.prototype.update = function () {
  // updateCamera();

  const camera = getCamera();
  camera.getWorldDirection(camDir);
  window.camDirection[0] = camDir.x;
  window.camDirection[1] = camDir.y;
  window.camDirection[2] = camDir.z;
  camera.updateProjectionMatrix(window.camDirection);
};

export { Camera };
