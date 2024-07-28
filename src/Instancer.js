import * as THREE from 'three';

const Instancer = function (animationObjectInstance, instancerDefinition) {
  this.animationObjectInstance = animationObjectInstance;
  this.instancer = instancerDefinition;

  if (!this.instancer) {
    return;
  }

  this.color = new Float32Array(this.instancer.count * 4);
  this.color.fill(1.0);

  this.angle = new Float32Array(this.instancer.count * 3);
  this.angle.fill(0.0);

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
          const input = {
            index: i,
            count: this.instancer.count,
            time,
            object: this.instancer.object,
            color: instanceColor,
            angle: instanceAngle
          };

          this.instancer.runInstanceFunction(input);

          if (input.angle !== undefined) {
            input.object.rotation.x = input.angle.degreesX;
            input.object.rotation.y = input.angle.degreesY;
            input.object.rotation.z = input.angle.degreesZ;
          }

          this.instancer.count = input.count;
          this.color[4 * i + 0] = instanceColor.r;
          this.color[4 * i + 1] = instanceColor.g;
          this.color[4 * i + 2] = instanceColor.b;
          this.color[4 * i + 3] = instanceColor.a;

          this.angle[3 * i + 0] = input.object.rotation.x;
          this.angle[3 * i + 1] = input.object.rotation.y;
          this.angle[3 * i + 2] = input.object.rotation.z;

          this.instancer.object.updateMatrix();
          this.animationObjectInstance.mesh.setMatrixAt(
            i,
            this.instancer.object.matrix
          );
          if (this.animationObjectInstance.mixer) {
            this.animationObjectInstance.mesh.setMorphAt(
              i,
              this.instancer.object
            );
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
