import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { getCamera } from './DemoRenderer';

const Instancer = function (animationObjectInstance, instancerDefinition) {
  this.animationObjectInstance = animationObjectInstance;
  this.instancer = instancerDefinition;

  if (!this.instancer) {
    return;
  }

  if (this.instancer.count === undefined) {
    this.instancer.count = 1;
  }

  this.color = new Float32Array(this.instancer.count * 4);
  this.color.fill(1.0);

  this.angle = new Float32Array(this.instancer.count * 3);
  this.angle.fill(0.0);

  this.instanceData = new Array(this.instancer.count);

  this.runFunction =
    this.instancer.runFunction ||
    ((time) => {
      if (!this.instancer.object) {
        this.instancer.object = new THREE.Object3D();
      }

      if (this.instancer.runInstanceFunction) {
        const startCount = this.instancer.count;

        for (let i = 0; i < startCount; i++) {
          const instanceColor = {
            r: this.color[4 * i + 0],
            g: this.color[4 * i + 1],
            b: this.color[4 * i + 2],
            a: this.color[4 * i + 3]
          };
          const instanceAngle = {
            degreesX: this.angle[3 * i + 0],
            degreesY: this.angle[3 * i + 1],
            degreesZ: this.angle[3 * i + 2]
          };
          const input = this.instanceData[i] || {
            index: i,
            count: this.instancer.count,
            time,
            object: this.instancer.object.clone(),
            color: instanceColor,
            angle: instanceAngle
          };

          this.instancer.runInstanceFunction(
            input,
            this.animationObjectInstance
          );

          if (input.angle !== undefined) {
            input.object.rotation.x = input.angle.degreesX;
            input.object.rotation.y = input.angle.degreesY;
            input.object.rotation.z = input.angle.degreesZ;
          }

          input.object.updateMatrix();

          this.instanceData[i] = {
            index: i,
            count: this.instancer.count,
            time,
            object: input.object,
            color: input.color,
            angle: input.angle,
            originalIndex: i
          };
        }

        if (this.instancer.sort) {
          this._sortInstances();
        }

        for (let i = 0; i < this.instanceData.length; i++) {
          const data = this.instanceData[i];
          this.color[4 * i + 0] = data.color.r;
          this.color[4 * i + 1] = data.color.g;
          this.color[4 * i + 2] = data.color.b;
          this.color[4 * i + 3] = data.color.a;

          this.angle[3 * i + 0] = data.object.rotation.x;
          this.angle[3 * i + 1] = data.object.rotation.y;
          this.angle[3 * i + 2] = data.object.rotation.z;

          data.object.updateMatrix();
          this.animationObjectInstance.mesh.setMatrixAt(i, data.object.matrix);

          if (this.animationObjectInstance.mixer) {
            this.animationObjectInstance.mesh.setMorphAt(i, data.object);
          }
        }

        this.animationObjectInstance.mesh.count = this.instancer.count;
        if (
          this.animationObjectInstance.mesh.geometry.attributes
            .instanceVertexColor
        ) {
          this.animationObjectInstance.mesh.geometry.attributes.instanceVertexColor.needsUpdate = true;
        }
        if (
          this.animationObjectInstance.mesh.geometry.attributes
            .instanceVertexAngle
        ) {
          this.animationObjectInstance.mesh.geometry.attributes.instanceVertexAngle.needsUpdate = true;
        }

        this.animationObjectInstance.mesh.instanceMatrix.needsUpdate = true;
        if (
          this.animationObjectInstance.mesh.morphTexture &&
          this.animationObjectInstance.mixer
        ) {
          this.animationObjectInstance.mesh.morphTexture.needsUpdate = true;
        }
        this.animationObjectInstance.mesh.computeBoundingSphere();
      }
    });
};

Instancer.prototype._sortInstances = function () {
  const camera = getCamera();
  if (!camera) {
    return;
  }

  const cameraPosition = camera.position;

  for (let i = 0; i < this.instanceData.length; i++) {
    const data = this.instanceData[i];

    const position = new THREE.Vector3();
    position.setFromMatrixPosition(data.object.matrix);

    data.distanceToCamera = cameraPosition.distanceToSquared(position);
  }

  this.instanceData.sort((a, b) => {
    return a.distanceToCamera - b.distanceToCamera;
  });
};

Instancer.prototype.createInstancedMesh = function (geometry, material) {
  const mesh = new THREE.InstancedMesh(
    geometry,
    material,
    this.instancer.count
  );
  mesh.geometry.setAttribute(
    'instanceVertexColor',
    new THREE.InstancedBufferAttribute(this.color, 4)
  );
  mesh.geometry.setAttribute(
    'instanceVertexAngle',
    new THREE.InstancedBufferAttribute(this.angle, 3)
  );
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  return mesh;
};

Instancer.prototype.createMesh = function (geometry, material) {
  let mesh;

  if (material && geometry && geometry.isBufferGeometry) {
    if (this.instancer) {
      mesh = this.createInstancedMesh(geometry, material);
    } else if (material.isSpriteMaterial) {
      mesh = new THREE.Sprite(material);
    } else if (geometry.isLineGeometry) {
      mesh = new Line2(geometry, material);
      mesh.computeLineDistances();
      mesh.scale.set(1, 1, 1);
    } else {
      mesh = new THREE.Mesh(geometry, material);
    }
  } else {
    const object = geometry;
    if (this.instancer) {
      let child = object;
      if (object.children && object.children.length > 0) {
        child = object.children[0];
      }

      mesh = this.createInstancedMesh(child.geometry, child.material);
    } else {
      mesh = object;
    }
  }

  return mesh;
};

Instancer.prototype.draw = function (time) {
  if (!this.instancer) {
    return;
  }

  this.runFunction(time);
};

export { Instancer };
