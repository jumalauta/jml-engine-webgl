import * as THREE from 'three';

var LoadingBar = function() {
    return this.getInstance();
};

LoadingBar.prototype.setRenderer = function(renderer) {
    this.renderer = renderer;
}

LoadingBar.prototype.init = function() {
    this.scene = new THREE.Scene();
    this.scene.visible = false;
    this.camera = new THREE.PerspectiveCamera( 75, 16/9, 0.1, 1000 );
    this.scene.add(this.camera);
    this.camera.position.z = 5;
    this.percent = -1.0;
  
    this.cube = new THREE.Mesh( new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshBasicMaterial( { color: 0xffff00, wireframe: false, side: THREE.FrontSide } ) );
    this.cube.position.x = 7.5;
    this.cube.position.y = 3.6;
    this.cube.position.z = -10;
    
    let instance = this;
    this.loadingBarTexture = new THREE.TextureLoader().load(
      '_embedded/notching_line.png',
      function ( texture ) {
          const shader = {
              uniforms: {
                  texture0: { value: instance.loadingBarTexture },
                  percent: { value: instance.percent },
              },
              // Manually added vertex shader to get the fragment shader running
              vertexShader: `
                  out vec2 texCoord;
        
                  void main() {
                    texCoord = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                  }
              `,
              fragmentShader: `
                  #define M_PI 3.1415926535897932384626433832795
  
                  uniform sampler2D texture0;
                  uniform float percent;
                  in vec2 texCoord;
                  out vec4 fragColor;
        
                  void main() {
                    float curveThickness = 0.75*percent;
                    float curveBendDegrees = 0.;
                    float curvesDegrees = 360.;
                    
                    float fadeStart = 0.2;
                    float fadeEnd = 0.65;
                    
                    float maxLights = 24.0;
                    
                    vec2 coord=texCoord.xy;
                    vec2 screenCoords = coord;
  
                    float fade = 1.0;
                    fade = smoothstep(fadeStart, fadeEnd, distance(screenCoords,vec2(0.5, 0.5)));
                
                    float x = coord.x;
                    float y = coord.y;
                    //float d = sqrt(x*x + y*y);
                    vec2 position = vec2(-0.446, -0.5);
                
                    vec4 col = vec4(0.,0.,0.,0.);
                    coord += position;
                    float curveBendRad = radians(curveBendDegrees);
                    float curvesRad = radians(curvesDegrees);
                    float bend = curveBendRad*log(length(coord));
                    
  
                      float d = mod(2.*M_PI-1.9+atan(coord.x,coord.y)+bend, curvesRad);
                      if (d < curvesRad*curveThickness) {
                        float cx = position.x+x;
                        float cy = position.y+y;
                        float circle = 1.0/sqrt(cx*cx + cy*cy);
        
                        col = vec4(1.,0.,0.,1.);
                      }
            
                        vec4 outputColor = texture2D(texture0, texCoord);
                        if (outputColor.a > 0.1 && outputColor.g < 0.9) {
                            if (col.a > 0.0) {
                              outputColor = col*texture2D(texture0, texCoord);
                            } else {
                              outputColor = vec4(0.,0.,0.,0.);
                            }
                        }
                     
                      fragColor = outputColor;
                  }
              `
          };
        
          instance.material = new THREE.ShaderMaterial({
              name: 'LoadingBar',
              glslVersion: THREE.GLSL3,
              uniforms: THREE.UniformsUtils.clone(shader.uniforms),
              vertexShader: shader.vertexShader,
              fragmentShader: shader.fragmentShader,
              blending:THREE.CustomBlending,
              depthTest: false,
              depthWrite: false,
              //transparent: true,
              //map: texture,
          });
    
          let width = instance.loadingBarTexture.image.width;
          let height = instance.loadingBarTexture.image.height;
          //instance.material = new THREE.MeshBasicMaterial({ map: instance.loadingBarTexture, blending:THREE.CustomBlending, depthTest: false, depthWrite: false });
          instance.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width/1920*16/9, height/1080), instance.material);
          //instance.mesh.renderOrder = 100;
          //instance.ptr = instance.mesh;
          instance.mesh.position.z = -0.651;
          //instance.scene.add(instance.mesh);
          //resolve(instance);
  
          
          instance.camera.add(instance.mesh);
          instance.scene.add(instance.cube);
      },
      undefined,
      function ( err ) {
          throw new Error('Loading error');
      }
    );
}

LoadingBar.prototype.getInstance = function() {
    if (!LoadingBar.prototype._singletonInstance) {
        LoadingBar.prototype._singletonInstance = this;

        this.init();
    }

    return LoadingBar.prototype._singletonInstance;
}

LoadingBar.prototype.setPercent = function(percent) {
  if (percent >= 0.0) {
    this.scene.visible = true;
  }
  this.percent = percent;
  if (this.material) {
    this.material.uniforms.percent.value = percent;
  }
}

LoadingBar.prototype.render = function() {
  if (!this.renderer) {
    throw new Error('Renderer not set');
  }

  this.renderer.clear();

  this.cube.rotation.x += 0.01;
  this.cube.rotation.y += 0.01;

  this.renderer.render( this.scene, this.camera );
};

export {LoadingBar};
