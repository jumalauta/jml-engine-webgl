import * as THREE from 'three';
import {Utils} from './legacy/Utils.js';
import {Effect} from './legacy/Effect.js';
import { getSceneTimeFromStart, loggerDebug, loggerInfo, loggerWarning } from './legacy/Bindings.js';
import { Sync } from './legacy/Sync.js';
import { Fbo } from './legacy/Fbo.js';
import { LoadingBar } from './LoadingBar.js';
import { ToolUi } from './ToolUi.js';
import { DemoRenderer  } from './DemoRenderer.js';

THREE.Cache.enabled = true;


/*aspectRatio = Settings::demo.graphics.aspectRatio;
clipPlaneNear = 0.1;
clipPlaneFar = 1000.0;
horizontalFov = glm::radians(45.0);

setPosition(0.0, 0.0, 2.0);
setLookAt(0.0, 0.0, 0.0);
setUp(0.0, 1.0, 0.0);
*/

/*
document.addEventListener('keydown', function(event) { // Copilot
  if (event.repeat) return; // ignore repeated keydown events 
  
  if (event.key === 'Escape') { // escape
    stopDemo();
  } else if (event.key === 'Enter') { // enter
    startDemo();
  }
  }
);


function init() {
  // Set up the scene, camera, and renderer
  screenWidth = window.innerWidth;
  screenHeight = window.innerWidth * 9 / 16;
  
  renderer = new THREE.WebGLRenderer({canvas: document.getElementById("canvas"), antialias: true});
  renderer.setSize( screenWidth, screenHeight );
  renderer.autoClear = false;
  //document.body.appendChild( renderer.domElement );
  
  // Set up the resize function to adjust the camera and renderer size
  function onWindowResize() {
				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();

        // also Fbo updates needed
				const dpr = renderer.getPixelRatio();
				target.setSize( window.innerWidth * dpr, window.innerHeight * dpr );
				renderer.setSize( window.innerWidth, window.innerHeight );

    renderer.setSize( window.innerWidth, window.innerWidth * 9 / 16 );
    
    if (currentScene) {
      currentScene.camera.aspect = 16 / 9;
      currentScene.camera.updateProjectionMatrix();
    }
  }
  
  // Add an event listener for window resizing
  window.addEventListener( 'resize', onWindowResize, false );
  
  initScene1(sceneData[0]);
  initScene2(sceneData[1]);
  initScene3(sceneData[2]);
  initScene4(sceneData[3]);
  initScene5(sceneData[4]);
  }
  
  var startTime;
  function startDemo() {
  
  let canvas = document.getElementById('canvas');
  music = document.getElementById('music');
  duration = 125; // in seconds
  
  //unhide canvas 
  canvas.style.display = 'block';
  // hide button 
  document.getElementById('start').style.display = 'none';
  
  if (fullscreen) {
    // Go fullscreen
    if (canvas.requestFullscreen) {
    canvas.requestFullscreen();
    } else if (canvas.webkitRequestFullscreen) {
    canvas.webkitRequestFullscreen();
    } else if (canvas.msRequestFullscreen) {
    canvas.msRequestFullscreen();
    }
  }
  
  // setTimeout 5 seconds (this is for demo capturing)
  setTimeout(function() {
    //print canvas size 
    console.log('canvas size: ' + canvas.width + 'x' + canvas.height);
  
    init();
  
    // Start the music
    music.play();
  
    startTime = new Date().getTime() / 1000;
  
    // Start the animation loop
    animationFrameId = requestAnimationFrame(animate);
  }, 5000);
  
  }
  */



var Demo = function() {};
export {Demo};
window.Demo = Demo;

//Effect.deinit("Demo");


//Utils.evaluateVariable('test', "{console.log('Hello, World!' +animation)}");

//let texture = new THREE.TextureLoader().load("jml_fist.png");
//let width = 16;//this.texture.image.width;
//let height = 9;//this.texture.image.height;
//let material = new THREE.MeshBasicMaterial({ map: texture, depthTest: false, depthWrite: false });
//let mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, width/height), material);
//scene.add(mesh);

const demoRenderer = new DemoRenderer();
demoRenderer.init();

const loadingBar = new LoadingBar();

const toolUi = new ToolUi();
toolUi.init();

export function animate() {
  toolUi.stats.begin();

  if (loadingBar.percent < 1.0) {
    loadingBar.render();
	toolUi.stats.end();
    requestAnimationFrame( animate );
    return;
  }



demoRenderer.render();


  toolUi.stats.end();
  requestAnimationFrame( animate );
}


function startDemo() {
	const startButton = document.getElementById('start');
	if (startButton) {
		startButton.style.display = 'none';
	}

	canvas.style.display = 'block';
	canvas.style.margin = '0px';
	
	//Effect.init("Demo");
}
window.startDemo = startDemo;
startDemo();


function stopDemo() {
  console.log("Stopping demo...");
  
  // Stop the music
  music.pause();
  
  // Rewind the music
  music.currentTime = 0;
  
  if (fullscreen) { // Copilot
    // Exit fullscreen
    if (document.exitFullscreen) {
    document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
    }
  }
  // Stop the animation loop
  cancelAnimationFrame(animationFrameId);
  
  // hide canvas and show start button 
  document.getElementById('start').style.display = 'block';
  canvas.style.display = 'none';
}
