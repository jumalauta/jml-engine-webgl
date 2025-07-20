import { isStarted } from './main';
import { DemoRenderer } from './DemoRenderer';
import * as THREE from 'three';

const Input = function () {
  return this.getInstance();
};

Input.prototype.getInstance = function () {
  if (!Input.prototype._singletonInstance) {
    Input.prototype._singletonInstance = this;
    this.init();
  }

  return Input.prototype._singletonInstance;
};

// Set cursor position x: -0.5 to 0.5, y: -0.5 to 0.5
Input.prototype.setCursorPosition = function (event) {
  const canvas = document.getElementById('canvas');
  if (canvas && event) {
    if (event.clientX === undefined || event.clientY === undefined) {
      throw new Error('Invalid event object: clientX and clientY are required');
    }

    if (this.cursorPosition === undefined) {
      this.cursorPosition = new THREE.Vector2();
    }
    this.cursorPosition.x = event.clientX / canvas.clientWidth - 0.5;
    const positionY = event.clientY - (new DemoRenderer().canvasPositionY || 0);
    this.cursorPosition.y = -(positionY / canvas.clientHeight) + 0.5;
  }
};

Input.prototype.init = function () {
  this.raycaster = new THREE.Raycaster();
  this.cursorPosition = undefined;

  const input = this;
  window.addEventListener('mousemove', (event) => {
    input.setCursorPosition(event);
  });
};

// Calculate if cursor is over a 3D object - custom vertex shaders not supported (e.g., "perspective2d" animations)
Input.prototype.isCursorOverAnimation = function (camera, animation) {
  if (
    this.cursorPosition === undefined ||
    !animation ||
    !animation.ref ||
    !animation.ref.mesh
  ) {
    return false;
  }

  // Adjust for 2D perspective, x: -1 to 1, y: -1 to 1
  const cursorPosition = new THREE.Vector2(
    this.cursorPosition.x * 2,
    this.cursorPosition.y * 2
  );

  this.raycaster.setFromCamera(cursorPosition, camera);
  const intersectObjects = this.raycaster.intersectObject(
    animation.ref.mesh,
    true
  );
  if (intersectObjects && intersectObjects.length > 0) {
    return true;
  }

  return false;
};

Input.prototype.setUserExit = function (userExit) {
  // inputSetUserExit(userExit);
};

Input.prototype.isUserExit = function () {
  if (isStarted() === false) {
    return true;
  }

  return false; // inputIsUserExit();
};

Input.prototype.pollEvents = function () {
  return false; // inputPollEvents();
};

Input.prototype.getPressedKeyMap = function () {
  return null; // inputGetPressedKeyMap();
};

window.DemoEngine = window.DemoEngine || {};
window.DemoEngine.Input = Input;
export { Input };
