import * as THREE from 'three';

const Matrix44 = function (elements) {
  this.matrix = new THREE.Matrix4();
  this.matrix.fromArray(elements);
};

Matrix44.prototype.getPosition = function () {
  const position = new THREE.Vector3();
  position.setFromMatrixPosition(this.matrix);
  return { x: position.x, y: position.y, z: position.z };
};

Matrix44.prototype.getEulerRotation = function () {
  const rotation = new THREE.Euler();
  rotation.setFromRotationMatrix(this.matrix);
  return { degreesX: rotation.x, degreesY: rotation.y, degreesZ: rotation.z };
};

Matrix44.prototype.getScale = function () {
  const scale = new THREE.Vector3();
  scale.setFromMatrixScale(this.matrix);
  return { x: scale.x, y: scale.y, z: scale.z };
};

Matrix44.prototype.getElements = function () {
  return this.matrix.elements;
};

Matrix44.prototype.clone = function () {
  return new Matrix44(this.matrix.clone().elements);
};

Matrix44.prototype.invert = function () {
  this.matrix.invert();
  return this;
};

Matrix44.prototype.multiply = function (matrix44) {
  this.matrix.multiply(matrix44.matrix);
  return this;
};

Matrix44.prototype.transformPoint = function (point) {
  const position = new THREE.Vector3(point.x, point.y, point.z);
  position.applyMatrix4(this.matrix);
  return { x: position.x, y: position.y, z: position.z };
};

window.DemoEngine = window.DemoEngine || {};
window.DemoEngine.Matrix44 = Matrix44;
export { Matrix44 };
