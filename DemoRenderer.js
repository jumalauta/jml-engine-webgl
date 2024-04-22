import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loggerDebug, loggerInfo } from './legacy/Bindings';
import { LoadingBar } from './LoadingBar.js';
import { Fbo } from './legacy/Fbo.js';
import { Effect } from './legacy/Effect.js';
import { Settings } from './Settings';

const settings = new Settings();

var DemoRenderer = function() {
    return this.getInstance();
};

DemoRenderer.prototype.getInstance = function() {
    if (!DemoRenderer.prototype._singletonInstance) {
        DemoRenderer.prototype._singletonInstance = this;
    }

    return DemoRenderer.prototype._singletonInstance;
}


const aspectRatio = settings.demo.screen.aspectRatio;
let scene, camera;
let scenes = [];
let cameras = [];

function clearThreeObject(obj) {
    while(obj.children.length > 0) { 
      clearThreeObject(obj.children[0]);
      obj.remove(obj.children[0]);
    }
  
    if (obj.geometry) { 
      obj.geometry.dispose();
    }
  
    if (obj.material) { 
      let materials = Array.isArray(obj.material) ? obj.material : [obj.material];
  
      materials.forEach(material => {
        Object.keys(material).forEach(key => {
          if (material[key] && typeof material[key]['dispose'] === 'function') {
            material[key].dispose();                                                      
          }
        });
    
        material.dispose();
      });
    }
  }

DemoRenderer.prototype.setupScene = function() {
	scenes.forEach(scene => {
		console.log("removing scene " + scene.uuid);
		clearThreeObject(scene);
	});
	cameras.forEach(scene => {
		console.log("removing camera " + scene.uuid);
		clearThreeObject(scene);
	});
	scenes = [];
	cameras = [];
	Fbo.dispose();

	scene = new THREE.Scene();
	/*camera = new THREE.PerspectiveCamera( 75, aspectRatio, 0.1, 1000 );
	camera.position.z = 2;
	camera.lookAt(new THREE.Vector3(0, 0, 0));
	camera.up = new THREE.Vector3(0, 1, 0);
  */
  settings.createLightsToScene(scene);
  camera = settings.createCamera();
	scene.add(camera);

  this.setOrbitControls(camera);
}

DemoRenderer.prototype.init = function() {
    const canvas = document.getElementById("canvas");
    this.renderer = settings.createRenderer(canvas);
    
    const loadingBar = new LoadingBar();
    loadingBar.setRenderer(this.renderer);

    this.resize();
    
    document.body.appendChild( this.renderer.domElement ); 

    this.setupScene();
}

DemoRenderer.prototype.resize = function() {
  const scaleDown = settings.demo.screen.quality;
  const scaleUp = 1.0/scaleDown;

  this.fullCanvasWidth = window.innerWidth * 1.0;
  this.fullCanvasHeight = window.innerHeight * ((settings.engine.tool) ? 0.9 : 1.0);
  this.canvasWidth = this.fullCanvasWidth;
  this.canvasHeight = this.fullCanvasWidth / aspectRatio;
  if (this.canvasHeight > this.fullCanvasHeight) {
    this.canvasHeight = this.fullCanvasHeight;
    this.canvasWidth = this.fullCanvasHeight * aspectRatio;
  }
  this.canvasWidth *= scaleDown;
  this.canvasHeight *= scaleDown;
  canvas.style.margin = `${((this.fullCanvasHeight - this.canvasHeight) / 2)}px 0px 0px ${((this.fullCanvasWidth - this.canvasWidth) / 2)}px`;
  canvas.style.transform = `scale(${scaleUp})`;

  loggerDebug('Screen size: ' + this.canvasWidth + 'x' + this.canvasHeight);
  this.renderer.setSize( this.canvasWidth, this.canvasHeight, true );
  this.renderer.setPixelRatio( window.devicePixelRatio );
}

DemoRenderer.prototype.setRenderNeedsUpdate = function(needsUpdate) {
    this.renderNeedsUpdate = needsUpdate;
}

DemoRenderer.prototype.isRenderNeedsUpdate = function() {
    return this.renderNeedsUpdate;
}

DemoRenderer.prototype.setOrbitControls = function(camera) {
  if (this.controls) {
    if (this.controls.object === camera) {
      return;
    }

    this.controls.dispose();
    this.controls = null;
  }

  if (!camera) {
    return;
  }

  this.controls = new OrbitControls( camera, document.getElementById("canvas") );
  this.controls.target.set( 0, 0, -10 );
  this.controls.update();
  this.controls.enablePan = false;
  this.controls.enableDamping = true;
}

DemoRenderer.prototype.render = function() {
  this.renderNeedsUpdate = false;
/*
    var BPM = 120,
        ROWS_PER_BEAT = 8,
        ROW_RATE = BPM / 60 * ROWS_PER_BEAT;

    var row = _audio.currentTime * ROW_RATE;

    if(_audio.paused === false) {
        //otherwise we may jump into a point in the audio where there's
        //no timeframe, resulting in Rocket setting row 2 and we report
        //row 1 back - thus Rocket spasming out

        // this informs Rocket where we are
        _syncDevice.update(row);
    }
*/
/*  // Update the time
  time = music.currentTime;

  // Stop the animation if the time is up
  if (time >= duration) {
    console.log("Demo is over.");
    stopDemo();
    return;
  }

  // Render the scene
  renderer.clear();
*/

Effect.run("Demo");

  //renderer.setRenderTarget(null);
  this.renderer.clear();
  if (this.controls) {
    this.controls.update();
  }
  this.renderer.render( scene, camera );
}


//arry.slice(-1);
function getScene() { return scenes.slice(-1)[0]||scene; }
function getCamera() { return cameras.slice(-1)[0]||camera; }
function pushView(s,c) { scenes.push(s); cameras.push(c); }
function popView() { scenes.pop(); cameras.pop(); }
export {getScene, getCamera, pushView, popView};


function getScreenWidth() { return 1920; }
function getScreenHeight() { return 1080; }
window.getScreenWidth = getScreenWidth;
window.getScreenHeight = getScreenHeight;

//alert(screenWidth + 'x' + screenHeight);



export { DemoRenderer };
