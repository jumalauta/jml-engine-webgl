import * as THREE from 'three';

const Instancer = function (animationObjectInstance, instancerDefinition) {
  this.animationObjectInstance = animationObjectInstance;
  this.instancer = instancerDefinition;

  if (!this.instancer) {
    return;
  }

  this.color = new Float32Array(this.instancer.count * 4);
  this.color.fill(1.0);

  this.runFunction =
    this.instancer.runFunction ||
    ((time) => {
      if (this.instancer.runInstanceFunction) {
        const startCount = this.instancer.count;
        for (let i = 0; i < startCount; i++) {
          const instanceColor = {
            r: this.color[4 * i + 0],
            g: this.color[4 * i + 1],
            b: this.color[4 * i + 2],
            a: this.color[4 * i + 3]
          };
          const input = {
            index: i,
            count: this.instancer.count,
            time,
            object: this.instancer.object,
            color: instanceColor
          };
          this.instancer.runInstanceFunction(input);

          this.instancer.count = input.count;
          this.color[4 * i + 0] = instanceColor.r;
          this.color[4 * i + 1] = instanceColor.g;
          this.color[4 * i + 2] = instanceColor.b;
          this.color[4 * i + 3] = instanceColor.a;

          this.instancer.object.updateMatrix();
          this.animationObjectInstance.mesh.setMatrixAt(
            i,
            this.instancer.object.matrix
          );
        }

        this.animationObjectInstance.mesh.count = this.instancer.count;
        this.animationObjectInstance.mesh.geometry.attributes.instanceVertexColor.needsUpdate = true;
        this.animationObjectInstance.mesh.instanceMatrix.needsUpdate = true;
        this.animationObjectInstance.mesh.computeBoundingSphere();
      }
    });
};

Instancer.prototype.createMesh = function (geometry, material) {
  let mesh;
  if (this.instancer) {
    geometry.setAttribute(
      'instanceVertexColor',
      new THREE.InstancedBufferAttribute(this.color, 4)
    );
    mesh = new THREE.InstancedMesh(geometry, material, this.instancer.count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancer.object = new THREE.Object3D();
  } else {
    mesh = new THREE.Mesh(geometry, material);
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
