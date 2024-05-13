import * as THREE from 'three';
import vertexShaderData from './_embedded/default.vs?raw';
import fragmentShaderData from './_embedded/loadingBar.fs?raw';
import loaderPicture from './_embedded/notchingLine.png?url';

const LoadingBar = function () {
  return this.getInstance();
};

LoadingBar.prototype.setRenderer = function (renderer) {
  this.renderer = renderer;
};

LoadingBar.prototype.init = function () {
  this.scene = new THREE.Scene();
  this.scene.visible = false;
  this.camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
  this.scene.add(this.camera);
  this.camera.position.z = 5;
  this.percent = -1.0;
  this.now = Date.now();

  this.cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({
      color: 0xffff00,
      wireframe: false,
      side: THREE.FrontSide
    })
  );
  this.cube.position.x = 7.5;
  this.cube.position.y = 3.6;
  this.cube.position.z = -10;

  const instance = this;
  this.loadingBarTexture = new THREE.TextureLoader().load(
    loaderPicture,
    function (texture) {
      const shader = {
        uniforms: {
          texture0: { value: instance.loadingBarTexture },
          percent: { value: instance.percent },
          time: { value: 0.0 }
        },
        // Manually added vertex shader to get the fragment shader running
        vertexShader: vertexShaderData,
        fragmentShader: fragmentShaderData
      };

      instance.material = new THREE.ShaderMaterial({
        name: 'LoadingBar',
        glslVersion: THREE.GLSL3,
        uniforms: THREE.UniformsUtils.clone(shader.uniforms),
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        blending: THREE.CustomBlending,
        depthTest: false,
        depthWrite: false
        // transparent: true,
        // map: texture,
      });

      const width = instance.loadingBarTexture.image.width;
      const height = instance.loadingBarTexture.image.height;
      // instance.material = new THREE.MeshBasicMaterial({ map: instance.loadingBarTexture, blending:THREE.CustomBlending, depthTest: false, depthWrite: false });
      instance.mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(((width / 1920) * 16) / 9, height / 1080),
        instance.material
      );
      // instance.mesh.renderOrder = 100;
      // instance.ptr = instance.mesh;
      instance.mesh.position.z = -0.651;
      // instance.scene.add(instance.mesh);
      // resolve(instance);

      instance.camera.add(instance.mesh);
      instance.scene.add(instance.cube);
    },
    undefined,
    function (err) {
      throw new Error(`Loading error: ${err}`);
    }
  );
};

LoadingBar.prototype.getInstance = function () {
  if (!LoadingBar.prototype._singletonInstance) {
    LoadingBar.prototype._singletonInstance = this;

    this.init();
  }

  return LoadingBar.prototype._singletonInstance;
};

LoadingBar.prototype.setPercent = function (percent) {
  if (percent >= 0.0) {
    this.scene.visible = true;
  }
  this.percent = percent;
  if (this.material) {
    this.material.uniforms.percent.value = percent;
  }
};

LoadingBar.prototype.render = function () {
  if (!this.renderer) {
    throw new Error('Renderer not set');
  }

  this.renderer.clear();

  if (this.material) {
    this.material.uniforms.time.value = (Date.now() - this.now) / 1000.0;
  }

  this.cube.rotation.x += 0.01;
  this.cube.rotation.y += 0.01;

  this.renderer.render(this.scene, this.camera);
};

export { LoadingBar };
