import * as THREE from 'three';
import { GUI } from 'dat.gui';
import {Utils} from './legacy/Utils.js';
import {Effect} from './legacy/Effect.js';
import { getSceneTimeFromStart, loggerDebug } from './legacy/Bindings.js';
import { Sync } from './legacy/Sync.js';

// wget https://github.com/ajaxorg/ace/archive/refs/tags/v1.32.9.tar.gz
// tar -xvzf v1.32.9.tar.gz
// rm v1.32.9.tar.gz
// cd ace-1.32.9 && node Makefile.dryice.js full --target ../ace-builds
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

const scene = new THREE.Scene();
const sceneFbo = new THREE.Scene();
const aspectRatio = 16 / 9;
/*aspectRatio = Settings::demo.graphics.aspectRatio;
clipPlaneNear = 0.1;
clipPlaneFar = 1000.0;
horizontalFov = glm::radians(45.0);

setPosition(0.0, 0.0, 2.0);
setLookAt(0.0, 0.0, 0.0);
setUp(0.0, 1.0, 0.0);
*/
const camera = new THREE.PerspectiveCamera( 75, aspectRatio, 0.1, 1000 );
camera.position.z = 2;
camera.lookAt(new THREE.Vector3(0, 0, 0));
camera.up = new THREE.Vector3(0, 1, 0);
scene.add(camera);

const cameraFbo = new THREE.PerspectiveCamera( 75, aspectRatio, 0.1, 1000 );

let scenes = [];
let cameras = [];

//arry.slice(-1);
function getScene() { return scenes.slice(-1)[0]||scene; }
function getCamera() { return cameras.slice(-1)[0]||camera; }
function pushView(s,c) { scenes.push(s); cameras.push(c); }
function popView() { scenes.pop(); cameras.pop(); }
export {getScene, getCamera, pushView, popView};

let canvas = document.getElementById("canvas");
const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true, alpha: true});
//renderer.setClearColor(0x0000FF, 1);
renderer.autoClear = false;
renderer.sortObjects = false;
let canvasWidth = window.innerWidth;// * 0.7; //FIXME: editor dynamic stuff
let canvasHeight = window.innerHeight;// * 0.8;
let screenWidth = canvasWidth;
let screenHeight = canvasWidth / aspectRatio;
if (screenHeight > canvasHeight) {
  screenHeight = canvasHeight;
  screenWidth = canvasHeight * aspectRatio;
  canvas.style.margin = '0px 0px 0px ' + ((canvasWidth - screenWidth) / 2) + 'px';
}

function getScreenWidth() { return 1920; }
function getScreenHeight() { return 1080; }
window.getScreenWidth = getScreenWidth;
window.getScreenHeight = getScreenHeight;

loggerDebug('Screen size: ' + screenWidth + 'x' + screenHeight);
renderer.setSize( screenWidth, screenHeight, true );
export {screenWidth, screenHeight, renderer};

//alert(screenWidth + 'x' + screenHeight);
document.body.appendChild( renderer.domElement );


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


/*var start = 0;
var duration = 100;
var layer = 1;*/

var Demo = function() {};
//export {Demo};
window.Demo = Demo;
/*Demo.prototype.init = function()
{
  this.loader.addAnimation({
     "start": start, "duration": duration, "layer": layer, "scene": camera, "image": "s5_bg.png"
     //,"angle":[{"degreesZ":"{return getSceneTimeFromStart() * 10;}"}]
  });
};*/

var start      = 0;
var end        = 306;
var duration   = 306;
var layer      = 0;

var LoadingBar = function(renderer) {
  this.scene = new THREE.Scene();
  this.scene.visible = false;
  this.camera = new THREE.PerspectiveCamera( 75, 16/9, 0.1, 1000 );
  this.renderer =  renderer;
  this.scene.add(this.camera);
  this.camera.position.z = 5;
  this.percent = -1.0;

  this.cube = new THREE.Mesh( new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshBasicMaterial( { color: 0xffff00, wireframe: false, side: THREE.FrontSide } ) );
  this.cube.position.x = 7.5;
  this.cube.position.y = 3.6;
  this.cube.position.z = -10;
  
  let instance = this;
  this.loadingBarTexture = new THREE.TextureLoader().load(
    'notching_line.png',
    function ( texture ) {
        const shader = {
            uniforms: {
                texture0: { value: instance.loadingBarTexture },
                percent: {  value: instance.percent },
            },
            // Manually added vertex shader to get the fragment shader running
            vertexShader: `
                varying vec2 texCoord;
      
                void main() {
                  texCoord = uv;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                #define M_PI 3.1415926535897932384626433832795

                uniform sampler2D texture0;
                uniform float percent;
                varying vec2 texCoord;
      
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
                      if (outputColor.a > 0.3 && outputColor.g < 0.8) {
                          if (col.a > 0.0) {
                            outputColor = col*texture2D(texture0, texCoord);
                          } else {
                            outputColor = vec4(0.,0.,0.,0.);
                          }
                      }
                   
                    gl_FragColor = outputColor;
                }
            `
        };
      
        instance.material = new THREE.ShaderMaterial({
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
};

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
  this.renderer.clear();

  this.cube.rotation.x += 0.01;
  this.cube.rotation.y += 0.01;

  this.renderer.render( this.scene, this.camera );
};


Demo.prototype.init2 = function()
{
  const pointLight = new THREE.PointLight(0xffffff, 1000)
  pointLight.position.set(2.5, 7.5, 15)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 1, 2);
  scene.add( directionalLight );
  //scene.add( pointLight );
  const light = new THREE.AmbientLight(0xffffff);
  scene.add( light );

  //sceneFbo.add( pointLight );
  //sceneFbo.add( light );

  //camera.position.z = 5;
  //cameraFbo.position.z = 5;
  


  this.loader.addAnimation({"start": start, "duration": duration, "layer": layer, "image": "clouds_01.png"});
  this.loader.addAnimation({"start": start, "duration": duration, "layer": layer, "image": "eye.png"});
  this.loader.addAnimation({"start": start, "duration": duration, "layer": layer, "image": "apple-touch-icon.png"});

  this.loader.addAnimation({
    "start": start, "duration": duration, "layer": layer, "image": "s5_bg.png"
    ,"scale":[{"uniform2d":1.0}]
    //,"angle":[{"degreesZ":"{return getSceneTimeFromStart() * 10;}"}]
    //,"initFunction":"{console.log('addeds5');}"
  });

this.loader.addAnimation({
  "start": start+2, "duration": 10, "layer": layer, "props": {
    "scene": scene, "camera":camera
  }
  ,"initFunction":(animation) => {
    const geometry = new THREE.BoxGeometry( 1, 1, 1 );
    const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    animation.props.cube = new THREE.Mesh( geometry, material );
    
    //animation.props.scene.add(animation.props.camera);
    animation.props.scene.add(animation.props.cube);
    console.log('addedcube');
  }
  ,"runFunction":(animation) => {
    animation.props.cube.position.x = 2.5;
    animation.props.cube.rotation.x += 0.01;
    animation.props.cube.rotation.y += 0.01;
  }
});


this.loader.addAnimation({
	"start": start+0, "duration": 20, "layer": layer, "image": "jml_fist.png"
	,"angle":[{"degreesZ":()=>getSceneTimeFromStart() * 10}]
	,"scale":[{"uniform2d":1.0}]
	,"position":[{"x":getScreenWidth()*0.9,"y":getScreenHeight()*0.9}]
	/*,"position":[{"x":0.0,"y":0.0}
		,{"duration":5,"x":0.5,"y":0.5}
		,{"duration":5,"x":0.5,"y":-0.5}
		,{"duration":5,"x":-0.5,"y":-0.5}
		,{"duration":5,"x":-0.5,"y":0.5}
	]*/
  });
  
this.loader.addAnimation({
  "start": start, "duration": end
 ,"layer": layer
 ,"image": ["_embedded/defaultTransparent.png"]
 ,"shader":{"name":"vignette.fs", "variable":[
     {"name":"fadeStart","value":[()=> Math.sin(getSceneTimeFromStart())*0.05+0.35||Sync.getSyncValue('vignette_start')]} //0.35
    ,{"name":"fadeEnd","value":[()=> Sync.getSyncValue('vignette_end')]} //0.5
]}
});

this.loader.addAnimation ([
	{
		"start": start, "duration": end ,"layer": layer, "fbo":{"name":"testFbo","action":"begin","storeDepth":true}
		//,"runFunction":()=>{console.log('entering fbo');}
	}
	]);

this.loader.addAnimation([{
  "start": start, "duration":end
 ,"layer": layer, //, "image": ["tex_allseeing.png"]
"object":"data/obj_allseeing.obj"
,"position":[{"x":0,"y":0,"z":-5}]
,"scale":[{"uniform3d":2.0}]
,"angle": [{"degreesY":"{return -20*getSceneTimeFromStart();}","degreesZ":0,"degreesX":0}]
//,"color":[{"r":255,"g":255,"b":255,"a":255}]
//,"runFunction":(animation) => {console.warn('runFunction');}
}]);

this.loader.addAnimation([{
  "start": start, "duration": end ,"layer": layer, 		
  "text":
  {
    "string":"TESTing! :)"
    ,"name":"font.ttf"
  }
  ,"position":[{"x":0,"y":0,"z":-10}]
  //,"runFunction":()=>{console.log('runFunction inside fbo');}
  //FIXME: ,"angle":[{"degreesZ":()=>getSceneTimeFromStart()*10}]
  //,"scale":[{"uniform3d":scale}]
  //,"position":[{"x":960,"y":540+yPos,"z":1}		]
  //,"angle":[{"degreesZ":0}]
  //,"color":[{"r":0,"g":0,"b":0}]
}]);

let textString = "A tragedy in three parts";
let scale = 3.0;
let yPos = 0;

this.loader.addAnimation([{
	"start": start, "duration": end ,"layer": layer,			
	"text":
	{
		"string":textString
		,"name":"font.ttf"
	}
	//,"position":[{"x":-1.5*16/9,"y":1.5,"z":0}]	
	//,"position":[{"x":getScreenWidth()*0.0,"y":getScreenHeight()*0.0,"z":0}]	
	,"scale":[{"uniform3d":scale}]
	,"position":[{"x":960,"y":540+yPos,"z":1}		]
	,"angle":[{"degreesZ":0}]
	,"color":[{"r":0,"g":0,"b":0}]
}]);

this.loader.addAnimation([{
	"start": start, "duration": end ,"layer": layer,			
	"text":
	{
		"string":"FALL OF MAN"
		,"name":"font.ttf"
	}
	//,"position":[{"x":0,"y":0,"z":-1}]	
	,"scale":[{"uniform3d":5.0}]
	,"position":[{"x":960,"y":540+200,"z":1}		]
	,"angle":[{"degreesZ":0}]
	,"color":[{"r":0,"g":0,"b":0}]
}]);

this.loader.addAnimation ([
	{
		"start": start, "duration": end ,"layer": layer, "fbo":{"name":"testFbo","action":"unbind"}
		//,"runFunction":()=>{console.log('exiting fbo');}
	}
	]);

this.loader.addAnimation({
  "start": start, "duration": end
 ,"layer": layer
 ,"image": ["testFbo.color.fbo"]
 ,"color":[{"a":200}]
});

//FIXME: prebake materials in loading: renderer.compile(scene, camera, scene);
}


///
/// DEMO.JS START
///

//var gl = new WebGL2RenderingContext(); //enable WebGL 2 partial support


var images = {};
var bpm=120;
var beat = 60/bpm;
var tick= beat/8;
var pattern = 8*beat;
var fftImage = new Image();
var cScaler = 0.0012;
var spiralHeight = 127.979;

Demo.prototype.init = function()
{
  const pointLight = new THREE.PointLight(0xffffff, 1000)
  pointLight.position.set(2.5, 7.5, 15)
  scene.add( pointLight );
  const light = new THREE.AmbientLight(0xffffff);
  scene.add( light );

  //sceneFbo.add( pointLight );
  //sceneFbo.add( light );

  //camera.position.z = 5;
  //cameraFbo.position.z = 5;

	Sync.addSync(
	[
		  { "name":"upfade1", "type":"rocket" }
		 ,{ "name":"downfade1", "type":"rocket" }
		 ,{ "name":"upfade2", "type":"rocket" }
		 ,{ "name":"downfade2", "type":"rocket" }
		 ,{ "name":"insanity", "type":"rocket" }	
		 ,{ "name":"fbo2alpha", "type":"rocket" }
		 ,{ "name":"mengerrotate", "type":"rocket" }
		 ,{ "name":"mengerrotate2", "type":"rocket" }
		 ,{ "name":"mengerrotate3", "type":"rocket" }
		 ,{ "name":"mengerspeed", "type":"rocket" }
		 ,{ "name":"mengersteps", "type":"rocket" }
		 ,{ "name":"mengerdivisor", "type":"rocket" }
		 ,{ "name":"dollarBGScale", "type":"rocket" }
		 ,{ "name":"explosion", "type":"rocket" }
		 ,{ "name":"mangle", "type":"rocket" }
		 ,{ "name":"farjangle", "type":"rocket" }
		 ,{ "name":"chainangle", "type":"rocket" }
		 ,{ "name":"glowmultiplier", "type":"rocket" }
		 ,{ "name":"endX", "type":"rocket" }
		 ,{ "name":"endY", "type":"rocket" }
		 ,{ "name":"manEndCol", "type":"rocket" }
		 ,{ "name":"manEndRot", "type":"rocket" }
	]);
	
    var start = 0;
    var duration = 60*20;

	//this.generateImages(0.0); //OK
	//this.generateCapitalism(0.0); //OK
	//this.dollarBG(0,16,0); //OK
	//this.mengerBG(0,34.5); //OK
	//this.farjanScene(0,10); //OK
	//this.man(); //OK
	//this.manEnd(0);	 //OK
	//this.farjanIntersection(0); //OK

	//return;
	
	this.createFBO(0,999,"fbo0");
	this.createFBO(1001,1999,"fbo1");
	this.createFBO(2001,2999,"fbo2");
	this.createFBO(10000,20000,"fboPost");
	
	this.generateImages(32.0);
	this.dollarBG(44,16,0);
	this.dollarBG(60,16,1000);
	this.generateCapitalism(60.0);
	
	this.mengerBG(80,34.5);
	this.farjanScene(73,10);
	this.man();
	this.manEnd(82.5);	
	this.farjanIntersection(80.5);
	this.allseeing(80.5,2,0.0,.6);
	this.blood(98.5,1.2,965,540);
	this.chain1(98.5,50,0.0);
	this.blood(102.5,1.2,965,540);
	this.chain2(102.5,50,0.0);
	this.blood(106.5,1.2,965,540);
	this.chain3(106.5,50,0.0);
	this.blood(110.5,1.2,965,540);	
	this.chain4(110.5,50,0.0);
	this.generateBlood(114.5);
	this.spirals(114.5,32);
	this.allseeingEnd(114.5,30,.75,.4);
	this.blood(127,1.5,1000,480);
	this.blood(127,1.5,1050,560);
	this.blood(127,1.5,850,430);
	for(var k=0;k<2;k++)
	{
		for(let i=0;i<4;i++)
		{
			this.missile(44+i*pattern,beat, 1520*Math.random()+200, 400+Math.random()*500, true);
			this.missile(44+i*pattern+beat*1.5,beat, 1520*Math.random()+200, 400+Math.random()*500, true);
			this.missile(44+i*pattern+beat*3.0,beat, 1520*Math.random()+200, 400+Math.random()*500, true);
		} 
	}

	this.loader.addAnimation([
    {
         "start": 0, "duration":200
        ,"layer": 52800, "image": ["data/tex_vignette.png"]
		,"scale":[{"x":1.5,"y":1.5}]
		,"position":[{"x":960,"y":540}]
		,"color":[{"r":255, "g":255,"b":255,"a":155}]
	}]);
	
	this.loader.addAnimation([
    {
         "start": 0, "duration":4
        ,"layer": 2800, "image": ["data/white.png"]
		,"scale":[{"x":18.5,"y":18.5}]
		,"position":[{"x":960,"y":540}]
		,"color":[{"r":0, "g":0,"b":0,"a":255}
		,{"duration":4,"a":0}]
	}]);
	
	this.loader.addAnimation([
    {
         "start": 0, "duration":32
        ,"layer": 100, "image": ["data/white.png"]
		,"scale":[{"x":18.5,"y":18.5}]
		,"position":[{"x":960,"y":540}]
		,"angle":[{"degreesZ":-5.0}]
		,"shader":{
			"name":"data/cube_bg.fs",
			"variable":
			[
				{"name":"timeMultiplier","type":"float","value":[1.0]},
				{"name":"invert","type":"float","value":[0.0]}
			]
		}
	}]);
	this.loader.addAnimation([
    {
         "start": 32, "duration":32
        ,"layer": 1100, "image": ["data/white.png"]
		,"scale":[{"x":18.5,"y":18.5}]
		,"position":[{"x":960,"y":540}]
		,"angle":[{"degreesZ":-5.0}]
		,"shader":{
			"name":"data/cube_bg.fs",
			"variable":
			[
				{"name":"timeMultiplier","type":"float","value":[4.0]},
				{"name":"invert","type":"float","value":[1.0]}
			]
		}
	}]);
	

	
	this.loader.addAnimation([{
         "start": 16, "duration":17
        ,"layer": 500, "image": ["data/tex_eye.png"]
		,"object":"data/obj_eyecubes.obj"
		,"scale":[{"uniform3d":.5}]
		,"position":[{"x":0,"y":-37,"z":-2}
			,{"duration":17,"y":15.5}]
		,"angle": [{"degreesY":"{return 15.0*getSceneTimeFromStart();}","degreesZ":0,"degreesX":0}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]
		,"shader":{
			"name":"data/uvscroll.fs",
			"variable":
			[
				{"name":"time","type":"float","value":["{return getSceneTimeFromStart();}"]}
			]
		}
	}]);
	
		this.loader.addAnimation([{
         "start": 16, "duration":17
        ,"layer": 500, "image": ["data/tex_eye.png"]
		,"object":"data/obj_eyecubes.obj"
		,"scale":[{"uniform3d":.75}]
		,"position":[{"x":-5,"y":-60,"z":-12}
			,{"duration":17,"y":15.5}]
		,"angle": [{"degreesY":"{return 180.0-15*getSceneTimeFromStart();}","degreesZ":0,"degreesX":0}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]
		,"shader":{
			"name":"data/uvscroll.fs",
			"variable":
			[
				{"name":"time","type":"float","value":["{return getSceneTimeFromStart();}"]}
			]
		}
	}]);


	this.loader.addAnimation([{
         "start": 16, "duration":17
        ,"layer": 500, "image": ["data/tex_eye.png"]
		,"object":"data/obj_eyecubes.obj"
		,"scale":[{"uniform3d":.75}]
		,"position":[{"x":5,"y":-60,"z":-12}
			,{"duration":17,"y":15.5}]
		,"angle": [{"degreesY":"{return 90.0+15*getSceneTimeFromStart();}","degreesZ":0,"degreesX":0}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]
		,"shader":{
			"name":"data/uvscroll.fs",
			"variable":
			[
				{"name":"time","type":"float","value":["{return getSceneTimeFromStart();}"]}
			]
		}
	}]);	
	
	this.loader.addAnimation ([
	{
		 "start": 0, "duration": 8888
		,"image": ["fbo0.color.fbo"]
		,"layer": 10100
		,"position":[{"x":getScreenWidth()*.5,"y":getScreenHeight()*.5}]
		,"shader":{
			"fader":0.5, 
			"name":"data/updownfader.fs",
			"variable":
			[
				{"name":"upfadeval","type":"float","value":["{return Sync.getSyncValue('upfade2');}"]},
				{"name":"downfadeval","type":"float","value":["{return Sync.getSyncValue('downfade2');}"]}
			]
			}
	}]);
		
		this.loader.addAnimation ([
		{
		 "start": 0, "duration": 8888
		,"image": ["fbo1.color.fbo"]
		,"layer": 11000
		,"position":[{"x":getScreenWidth()*.5,"y":getScreenHeight()*.5}]
		,"shader":{
			"fader":0.5, 
			"name":"data/updownfader.fs",
			"variable":
			[
				{"name":"upfadeval","type":"float","value":["{return Sync.getSyncValue('upfade1');}"]},
				{"name":"downfadeval","type":"float","value":["{return Sync.getSyncValue('downfade1');}"]}
			]
			}
		}]);
		
		this.loader.addAnimation ([
		{
		 "start": 0, "duration": 8888
		,"image": ["fbo2.color.fbo"]
		,"color":[{"a":"{return Sync.getSyncValue('fbo2alpha');}"}]
		,"layer": 12000
		,"scale":[{"uniform3d":1.0}
		,{"duration":76,"uniform3d":1.0}
		,{"duration":6.5,"uniform3d":1.75}
		,{"duration":0,"uniform3d":1.0}]
		,"position":[{"x":getScreenWidth()*.5,"y":getScreenHeight()*.5}
		,{"duration":76,"y":getScreenHeight()*.5}
		,{"duration":6.5,"y":getScreenHeight()*(550/720)}
		,{"duration":0,"y":getScreenHeight()*.5}]
	}]);
	
	this.loader.addAnimation ([
	{
		 "start": 0, "duration": 8888
		,"image": ["fboPost.color.fbo"]
		,"layer": 32000
		,"scale":[{"uniform3d":1.0}]
		,"position":[{"x":"{return (getScreenWidth()*.5)+(Math.random()*Sync.getSyncValue('explosion'))-0.5*Sync.getSyncValue('explosion');}","y":"{return (getScreenHeight()*.5)+(Math.random()*Sync.getSyncValue('explosion'))-0.5*Sync.getSyncValue('explosion');}",}]
		,"shader":{
			"fader":0.5, 
			"name":"data/hackglow.fs",
			"variable":
			[
				{"name":"multiplier","type":"float","value":["{return Sync.getSyncValue('glowmultiplier');}"]}
			]
			}
	}]);
	
}


Demo.prototype.spirals = function (startTime, duration)
{

	this.loader.addAnimation ([{
		 "start": startTime, "duration": duration
		,"image": ["data/tex_scanline.png"]
		,"scale":[{"uniform3d":5.5}]
		,"layer": 101
		,"color":[{"r":0,"g":0,"b":0,"a":75}]

	}]);
	
	this.loader.addAnimation ([{
		 "start": startTime, "duration": duration
		,"image": ["data/tex_skulls.png"]
		,"scale":[{"uniform3d":2.5}]
		,"layer": 100
		,"shader":{
			"name":"data/starfield.fs",
			"variable":
			[

			]
		}
	}]);
	
	this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": 200, "image": ["data/tex_spiral.png"]
		,"object":"data/obj_spiral.obj"
		,"scale":[{"uniform3d":3.0}]
	    ,"position":[{"x":0,"y":"{return -100+255.958*(0.125*getSceneTimeFromStart()%1.0);}","z":-43}]	
		,"angle": [{"degreesY":"{return 180+25*getSceneTimeFromStart();}","degreesZ":0,"degreesX":0}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]
		,"shader":{
			"name":"data/uvscroll.fs",
			"variable":
			[
				{"name":"time","type":"float","value":["{return getSceneTimeFromStart();}"]}
			]
		}
	}]);
	
		this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": 200, "image": ["data/tex_spiral.png"]
		,"object":"data/obj_spiral.obj"
		,"scale":[{"uniform3d":3.0}]
	    ,"position":[{"x":0,"y":"{return -100+-255.958+255.958*(0.125*getSceneTimeFromStart()%1.0);}","z":-43}]	
		,"angle": [{"degreesY":"{return 180+25*getSceneTimeFromStart();}","degreesZ":0,"degreesX":0}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]
		,"shader":{
			"name":"data/uvscroll.fs",
			"variable":
			[
				{"name":"time","type":"float","value":["{return getSceneTimeFromStart();}"]}
			]
		}
	}]);
	
	this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": 200, "image": ["data/tex_spiral.png"]
		,"object":"data/obj_spiral.obj"
		,"scale":[{"uniform3d":3.0}]
	    ,"position":[{"x":0,"y":"{return -100+255.958*(0.125*getSceneTimeFromStart()%1.0);}","z":-53}]	
		,"angle": [{"degreesY":"{return 25*getSceneTimeFromStart();}","degreesZ":0,"degreesX":0}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]
		,"shader":{
			"name":"data/uvscroll.fs",
			"variable":
			[
				{"name":"time","type":"float","value":["{return getSceneTimeFromStart();}"]}
			]
		}
	}]);
	
		this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": 200, "image": ["data/tex_spiral.png"]
		,"object":"data/obj_spiral.obj"
		,"scale":[{"uniform3d":3.0}]
	    ,"position":[{"x":0,"y":"{return -100+-255.958+255.958*(0.125*getSceneTimeFromStart()%1.0);}","z":-53}]	
		,"angle": [{"degreesY":"{return 25*getSceneTimeFromStart();}","degreesZ":0,"degreesX":0}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]
		,"shader":{
			"name":"data/uvscroll.fs",
			"variable":
			[
				{"name":"time","type":"float","value":["{return getSceneTimeFromStart();}"]}
			]
		}
	}]);
	
		this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": 200, "image": ["data/tex_spiral.png"]
		,"object":"data/obj_spiral.obj"
		,"scale":[{"uniform3d":2.0}]
	    ,"position":[{"x":55,"y":"{return -100+255.958*(0.125*getSceneTimeFromStart()%1.0);}","z":-118}]	
		,"angle": [{"degreesY":"{return -25*getSceneTimeFromStart();}","degreesZ":0,"degreesX":0}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]
		,"shader":{
			"name":"data/uvscroll.fs",
			"variable":
			[
				{"name":"time","type":"float","value":["{return getSceneTimeFromStart();}"]}
			]
		}
	}]);
	
		this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": 200, "image": ["data/tex_spiral.png"]
		,"object":"data/obj_spiral.obj"
		,"scale":[{"uniform3d":2.0}]
	    ,"position":[{"x":55,"y":"{return -100+-255.958+255.958*(0.125*getSceneTimeFromStart()%1.0);}","z":-118}]	
		,"angle": [{"degreesY":"{return -25*getSceneTimeFromStart();}","degreesZ":0,"degreesX":0}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]
		,"shader":{
			"name":"data/uvscroll.fs",
			"variable":
			[
				{"name":"time","type":"float","value":["{return getSceneTimeFromStart();}"]}
			]
		}
	}]);

		this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": 200, "image": ["data/tex_spiral.png"]
		,"object":"data/obj_spiral.obj"
		,"scale":[{"uniform3d":2.0}]
	    ,"position":[{"x":-55,"y":"{return -100+255.958*(0.125*getSceneTimeFromStart()%1.0);}","z":-118}]	
		,"angle": [{"degreesY":"{return 25*getSceneTimeFromStart();}","degreesZ":0,"degreesX":0}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]
		,"shader":{
			"name":"data/uvscroll.fs",
			"variable":
			[
				{"name":"time","type":"float","value":["{return getSceneTimeFromStart();}"]}
			]
		}
	}]);
	
		this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": 200, "image": ["data/tex_spiral.png"]
		,"object":"data/obj_spiral.obj"
		,"scale":[{"uniform3d":2.0}]
	    ,"position":[{"x":-55,"y":"{return -100+-255.958+255.958*(0.125*getSceneTimeFromStart()%1.0);}","z":-118}]	
		,"angle": [{"degreesY":"{return 25*getSceneTimeFromStart();}","degreesZ":0,"degreesX":0}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]
		,"shader":{
			"name":"data/uvscroll.fs",
			"variable":
			[
				{"name":"time","type":"float","value":["{return getSceneTimeFromStart();}"]}
			]
		}
	}]);
	
}

Demo.prototype.createFBO = function (startLayer, endLayer, name)
{
   	this.loader.addAnimation ([
	{
		"start": 0, "duration": 99999
		,"layer": startLayer
		,"fbo":{"name":name,"action":"begin","storeDepth":true}
	}
	]);
	
	this.loader.addAnimation ([
	{
		"start": 0, "duration": 99999
		,"layer": endLayer,"fbo":{"name":name,"action":"unbind"}
	}
	]);
	
}

Demo.prototype.missile = function (startTime, duration, posX, posY, explo)
{
	 
	this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": 12100,
		"image": ["data/tex_missile.png"]
		,"scale":[{"uniform3d":8.25}
		,{"duration":duration, "uniform3d":1.25}]
		,"position":[{"x":posX,"y":-120}
		,{"duration":duration, "y":posY}]
		,"color":[{"r":255,"g":0,"b":0,"a":255}]
	}]);
	if(explo)
	{
		this.explosion(startTime+duration,2.0,posX,posY);
	}
}

Demo.prototype.explosion = function(startTime, duration, positionX, positionY)
{
	var randomScaler=722.0;
	for(let ie=0;ie<25;ie++)
	{
		this.loader.addAnimation([
				{
				"start": startTime, "duration": duration
				,"layer": 12100
				,"image": ["data/tex_explosion.png"]
						,"angle":[{"degreesZ":Math.random()*360}]
				,"position": [{"x":positionX,"y":positionY,}
				,{"duration":duration,"x":positionX-randomScaler+Math.random()*randomScaler*2.0,"y":positionY-randomScaler+Math.random()*randomScaler*2.0}]
				,"scale":[{"uniform3d":1.8}
				,{"duration":duration, "uniform3d":0.0}]
				,"color":[{"r":255,"g":0,"b":0,"a":255}]
		}]);
	}
}

Demo.prototype.generateBlood = function(startTime)
{
	var bloodSyncs = [8,20,32]
	for(let k=0;k<3;k++)
	{
		for(let i=0;i<bloodSyncs.length;i++)
		{
			this.blood(startTime+k*pattern+bloodSyncs[i]*tick,2.0,1000,480);		
		}
	}
}

Demo.prototype.blood = function(startTime, duration, positionX, positionY)
{

	var randomScaler=722.0;
	for(let ie=0;ie<35;ie++)
	{
		this.loader.addAnimation([
				{
				"start": startTime, "duration": duration
				,"layer": 12100
				,"image": ["data/tex_blood.png"]
				,"angle":[{"degreesZ":Math.random()*360}]
				,"position": [{"x":positionX,"y":positionY,}
				,{"duration":duration,"x":positionX-randomScaler+Math.random()*randomScaler*2.0,"y":positionY-randomScaler*.75+Math.random()*randomScaler*1.5}]	
				,"scale":[{"uniform3d":0.75}
				,{"duration":duration, "uniform3d":0.0}]
				,"color":[{"r":255,"g":255,"b":255,"a":255}]
		}]);
	}
}

Demo.prototype.dollarBG = function(startTime, duration, layer)
{
		this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": layer+500, "image": ["data/tex_dollar.png"]

		,"scale":[{"uniform3d":"{return 1.75+Sync.getSyncValue('dollarBGScale');}"}]
		,"position":[{"x":960,"y":540,"z":0}]

		,"shader":{
			"name":"data/glitch.fs",
			"variable":
			[
				
				{"name":"amt","type":"float","value":["{return Sync.getSyncValue('insanity');}"]},
				{"name":"scrollspeed","type":"float","value":[1.0]},
			]
		}
	}]);
	
	this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": layer+300, "image": ["data/tex_dollar.png"]

		,"scale":[{"uniform3d":2.75}]
		,"position":[{"x":960,"y":540,"z":0}]

		,"shader":{
			"name":"data/glitch.fs",
			"variable":
			[
				
				{"name":"amt","type":"float","value":["{return Sync.getSyncValue('insanity');}"]},
				{"name":"scrollspeed","type":"float","value":[1.0]},
			]
		}
	}]);
	
}

Demo.prototype.mengerBG = function(startTime, duration)
{
	
	this.loader.addAnimation([
    {
         "start": startTime, "duration":duration
        ,"layer": 100, "image": ["data/white.png"]
		,"scale":[{"x":18.5,"y":18.5}]
		,"position":[{"x":960,"y":540}]
		,"angle":[{"degreesZ":-5.0}]
		,"shader":{
			"name":"data/menger_bg.fs",
			"variable":
			[
				{"name":"timeMultiplier","type":"float","value":[1.0]},
				{"name":"invert","type":"float","value":[0.0]},
				{"name":"rotation","type":"float","value":["{return Sync.getSyncValue('mengerrotate');}"]},
				{"name":"rotation2","type":"float","value":["{return Sync.getSyncValue('mengerrotate2');}"]},
				{"name":"rotation3","type":"float","value":["{return Sync.getSyncValue('mengerrotate3');}"]},
				{"name":"speed","type":"float","value":["{return Sync.getSyncValue('mengerspeed');}"]},
				{"name":"MAX_STEPS","type":"float","value":["{return Sync.getSyncValue('mengersteps');}"]},
				{"name":"mengerdivisor","type":"float","value":["{return Sync.getSyncValue('mengerdivisor');}"]}
			]
		}
	}]);
}

Demo.prototype.farjanScene = function(startTime, duration)
{
	
	this.loader.addAnimation([
    {
         "start": startTime, "duration":3.0
        ,"layer": 98, "image": ["data/white.png"]  //FIXME 098 -> 98???
		
		,"scale":[{"x":20.0,"y":20.0}]
		,"position":[{"x":960,"y":540}]

		,"shader":{
			"name":"data/clouds.fs",
			"variable":
			[
				{"name":"timeMultiplier","type":"float","value":[1.0]},
				{"name":"invert","type":"float","value":[0.0]},
        {"name":"speed","value":[0.0]},
        {"name":"speedY","value":[0.3]},
        {"name":"video","value":[0.0]},
        {"name":"value1","value":[1.0]},
        {"name":"value2","value":[0.5]},
        {"name":"value3","value":[2.0]},
        {"name":"value4","value":[2.0]},
        {"name":"contrast","value":[0.025]},
        {"name":"alpha","value":[1.0]},
        {"name":"color","value":[1,1,1,1]},
			]
		}
	}]);

	this.loader.addAnimation([
    {
         "start": startTime+3.0, "duration":duration-5.5
        ,"layer": 2098, "image": ["data/white.png"]
	
		,"scale":[{"x":20.0,"y":20.0}]
		,"position":[{"x":960,"y":540}]
		,"shader":{
			"name":"data/clouds.fs",
			"variable":
			[
				{"name":"timeMultiplier","type":"float","value":[1.0]},
				{"name":"invert","type":"float","value":[0.0]},
        {"name":"speed","value":[0.0]},
        {"name":"speedY","value":[0.3]},
        {"name":"video","value":[0.0]},
        {"name":"value1","value":[1.0]},
        {"name":"value2","value":[0.5]},
        {"name":"value3","value":[2.0]},
        {"name":"value4","value":[2.0]},
        {"name":"contrast","value":[0.025]},
        {"name":"alpha","value":[1.0]},
        {"name":"color","value":[1,1,1,1]},
			]
		}
	}]);
	
	this.loader.addAnimation([
    {
         "start": startTime, "duration":duration-2.5
        ,"layer": 2100, "image": ["data/tex_wave.png"]
		,"scale":[{"x":4.5,"y":4.5}]
		,"position":[{"x":960,"y":-420}
		,{"duration":4.75, "y":-120}]
		,"color":[{"r":0,"g":255,"b":255,"a":255}]
		,"shader":{
			"name":"data/wavescroll.fs",
		}
	}]);
	
	this.loader.addAnimation([
    {
         "start": startTime+3, "duration":duration-5.5
        ,"layer": 2099, "image": ["data/tex_boat.png"]
		,"scale":[{"x":1.0,"y":1.0}]
		,"angle":[{"degreesZ":"{return 5.0*Math.sin(2*getSceneTimeFromStart());}"}]
		,"position":[{"x":-175,"y":"{return 160+25.0*Math.sin(4*getSceneTimeFromStart());}"}
		,{"duration":4.65, "x":960,"y":"{return 230+25.0*Math.sin(4*getSceneTimeFromStart());}"}]
		,"color":[{"r":255,"g":0,"b":0,"a":255}]

	}]);
}

Demo.prototype.man = function()
{
	
	this.loader.addAnimation([{
         "start": 0, "duration":80.5
        ,"layer": 2300, "image": ["data/tex_man.png"]
		,"scale":[{"uniform3d":0.75}
		,{"duration":75, "uniform3d":0.75}
		,{"duration":1, "uniform3d":0.15}]
		,"position":[{"x":960,"y":"{return 540+8*Math.sin(5*getSceneTimeFromStart());}", "z":1}
		,{"duration":75, "y":"{return 540+3*Math.sin(1.5+5*getSceneTimeFromStart());}"}
		,{"duration":1, "y":"{return 831+3*Math.sin(1.5+5*getSceneTimeFromStart());}"}
		,{"duration":4.75, "y":"{return 240;}"}]
		,"angle":[{"degreesZ":"{return 2.0*Math.sin(6*getSceneTimeFromStart());}"}
		,{"duration":75, "degreesZ":"{return 2.0*Math.sin(6*getSceneTimeFromStart());}"}
		,{"duration":1, "degreesZ":"{return 5.0*Math.sin(2*getSceneTimeFromStart());}"}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}
		,{"duration":32,"r":255,"g":255,"b":255}
		,{"duration":0,"r":0,"g":0,"b":0}]
		
	}]);

	this.loader.addAnimation([{
         "start": 0, "duration":80.5
        ,"layer": 2250, "image": ["data/tex_man.png"]
		,"scale":[{"uniform3d":0.75}
		,{"duration":75, "uniform3d":0.75}
		,{"duration":1, "uniform3d":0.25}]
		,"position":[{"x":960,"y":"{return 531+3*Math.sin(1.5+5*getSceneTimeFromStart());}", "z":1}
		,{"duration":75, "y":"{return 531+3*Math.sin(1.5+5*getSceneTimeFromStart());}"}
		,{"duration":1, "y":"{return 822+3*Math.sin(1.5+5*getSceneTimeFromStart());}"}]
		,"color":[{"r":0,"g":0,"b":0,"a":255}
		,{"duration":32,"r":0,"g":0,"b":0}
		,{"duration":0,"r":255,"g":255,"b":255}
		,{"duration":43,"a":255}
		,{"duration":1,"a":0}]
		,"angle":[{"degreesZ":"{return 2.0*Math.sin(6*getSceneTimeFromStart());}"}
		,{"duration":75, "degreesZ":"{return 2.0*Math.sin(6*getSceneTimeFromStart());}"}
		,{"duration":1, "degreesZ":"{return 5.0*Math.sin(2*getSceneTimeFromStart());}"}]

	}]);
}
	
Demo.prototype.allseeing = function(startTime, duration, yPos, scale)
{
	
	this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": 200, "image": ["data/tex_allseeing.png"]
		,"object":"data/obj_allseeing.obj"
		,"position":[{"x":0,"y":yPos,"z":0}]
		,"scale":[{"uniform3d":scale}]
		,"angle": [{"degreesY":"{return -20*getSceneTimeFromStart();}","degreesZ":0,"degreesX":0}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]	
	}]);
}

Demo.prototype.allseeingEnd = function(startTime, duration, yPos, scale)
{
	
	this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": 200, "image": ["data/tex_allseeing.png"]
		,"object":"data/obj_allseeing.obj"
		,"position":[{"x":0,"y":"{return .73+0.05*Math.sin(3*getSceneTimeFromStart());}","z":0}]
		,"scale":[{"uniform3d":scale}]
		,"angle": [{"degreesY":"{return -20*getSceneTimeFromStart();}","degreesZ":0,"degreesX":0}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]	
	}]);
	
	this.loader.addAnimation([
    {
         "start": startTime+13, "duration":32
        ,"layer": 2800, "image": ["data/white.png"]
		,"scale":[{"x":18.5,"y":18.5}]
		,"position":[{"x":960,"y":540}]
		,"color":[{"r":255, "g":0,"b":0,"a":0}
		,{"duration":5,"a":255}]
	}]);
	
	this.createText(startTime+19.5,22.8,"FALL OF MAN",5.0,250);
	this.createText(startTime+21.5,22.8,"A tragedy in three parts",3.0,0);
	this.createText(startTime+23.5,22.8,"JUMALAUTA 2024",5.0,-330);
	

}

Demo.prototype.chain1 = function(startTime, duration,yPos)
{
	
	this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": 200, "image": ["data/tex_chain.png"]
		,"object":"data/obj_chain.obj"
		,"position":[{"chainScaler":cScaler,"x":"{return 0.1+Sync.getSyncValue('endX')*animation.chainScaler;}","y":"{return 0.0+Sync.getSyncValue('endY')*animation.chainScaler;}","z":1}]
		,"scale":[{"uniform3d":0.050}]
		,"angle": [{"degreesX":45.0,"degreesY":"{return 45*Sync.getSyncValue('chainangle');}","degreesZ":"{return 45*getSceneTimeFromStart();}"}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]	
	}]);
}

Demo.prototype.chain2 = function(startTime, duration,yPos)
{
	this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": 200, "image": ["data/tex_chain.png"]
		,"object":"data/obj_chain.obj"
		,"position":[{"chainScaler":cScaler,"x":"{return 0.1+Sync.getSyncValue('endX')*animation.chainScaler;}","y":"{return 0.0+Sync.getSyncValue('endY')*animation.chainScaler;}","z":1}]
		,"scale":[{"uniform3d":0.050}]
		,"angle": [{"degreesX":-45,"degreesY":"{return -45*Sync.getSyncValue('chainangle');}","degreesZ":"{return 45*getSceneTimeFromStart();}"}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]	
	}]);
}

Demo.prototype.chain3 = function(startTime, duration,yPos)
{
	
	this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": 200, "image": ["data/tex_chain.png"]
		,"object":"data/obj_chain.obj"
		,"position":[{"chainScaler":cScaler,"x":"{return 0.1+Sync.getSyncValue('endX')*animation.chainScaler;}","y":"{return 0.0+Sync.getSyncValue('endY')*animation.chainScaler;}","z":1}]
		,"scale":[{"uniform3d":0.050}]
		,"angle": [{"degreesX":45.0,"degreesY":"{return 270+45*Sync.getSyncValue('chainangle');}","degreesZ":"{return -45*getSceneTimeFromStart();}"}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]	
	}]);
}

Demo.prototype.chain4 = function(startTime, duration,yPos)
{
	
	this.loader.addAnimation([{
         "start": startTime, "duration":duration
        ,"layer": 200, "image": ["data/tex_chain.png"]
		,"object":"data/obj_chain.obj"
		,"position":[{"chainScaler":cScaler,"x":"{return 0.1+Sync.getSyncValue('endX')*animation.chainScaler;}","y":"{return 0.0+Sync.getSyncValue('endY')*animation.chainScaler;}","z":1}]
		,"scale":[{"uniform3d":0.050}]
		,"angle": [{"degreesX":-45,"degreesY":"{return 90-45*Sync.getSyncValue('chainangle');}","degreesZ":"{return 45*getSceneTimeFromStart();}"}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]	
	}]);
}

Demo.prototype.generateImages = function(startTime)
{
	var imageSyncs = [0,4,8,10,14,16,20,24]
	var imageNames = ["tex_ak.png", "tex_choppa.png", "tex_mp5.png", "tex_tank.png", "tex_grenade.png", "tex_launcher.png", "tex_carrier.png", "tex_bomb.png"]
	var imageScales = [1.3,         1.25,              0.85,           1.0,            0.6,               1.0,                1.25,               0.9]
	var prevRandom=100;
	for(let k=0;k<6;k++)
	{
		for(let i=0;i<imageSyncs.length;i++)
		{
			var randomImage = Math.floor(Math.random()*imageNames.length);
			
			if(randomImage==prevRandom)
			{
				randomImage++;
			}
			if(randomImage>=imageNames.length)
			{
				randomImage=0;
			}
			
			this.image(startTime+k*pattern*.5+imageSyncs[i]*tick, imageNames[randomImage], 1700,imageScales[randomImage],10.5);
			
			prevRandom=randomImage;
					
		}
	}
}

Demo.prototype.generateCapitalism = function(startTime)
{
	var imageSyncs2 = [0,8,16,24,32,40,48,56];
	var imageSyncs3 = [0,8,16,24,32,40,48,56];
	var imageNames = ["tex_tv.png", "tex_washingmachine.png", "tex_computer.png", "tex_phone.png", "tex_car.png", "tex_hamburger.png", "tex_hifi.png"];
	var imageScales = [0.81,         0.65,                      0.85,               0.9,             1.1,           0.8,                1.25]	
	var prevRandom=100;
	for(var k=0;k<3;k++)
	{
		for(let i=0;i<imageSyncs2.length;i++)
		{			
			var randomImage = Math.floor(Math.random()*imageNames.length);
			
			if(randomImage==prevRandom)
			{
				randomImage++;
			}
			if(randomImage>=imageNames.length)
			{
				randomImage=0;
			}
				
			this.imageCapitalism(startTime+k*pattern+imageSyncs2[i]*tick, imageNames[randomImage],1700, imageScales[randomImage], 45);
			
			prevRandom=randomImage;
		}
	}
	
	for(let i=0;i<imageSyncs3.length;i++)
	{
			var randomImage = Math.floor(Math.random()*imageNames.length);
			
			if(randomImage==prevRandom)
			{
				randomImage++;
			}
			if(randomImage>=imageNames.length)
			{
				randomImage=0;
			}

		this.imageCapitalism(startTime+k*pattern+imageSyncs3[i]*tick, imageNames[randomImage],1700, imageScales[randomImage],45);
		
			prevRandom=randomImage;
	}
		
}

Demo.prototype.image = function(startTime, imageName, layer, scale, angleRandom)
{
	var posX=300+(1920-600)*Math.random();
	var invertX = 1;
	if(posX<(1920/2))
	{
		invertX=-1;
	}
	this.loader.addAnimation([
    {
         "start": startTime, "duration":1.0
        ,"layer": layer, "image": ["data/" + imageName]
		,"angle":[{"degreesZ":Math.random()*angleRandom*2-angleRandom}]
		,"position":[{"x":posX,"y":-256}
		,{"duration":1.0, "y":1280+256}]
		,"scale":[{"x":1.5*invertX*scale,"y":1.5*scale}]
		,"color":[{"r":0,"g":0,"b":0,"a":255}]
	}]);
}

Demo.prototype.imageCapitalism = function(startTime, imageName, layer, scale)
{
	var posX=300+(1920-600)*Math.random();
	var invertX = 1;
	if(posX<(1920/2))
	{
		invertX=-1;
	}
	var randoScale = .9+Math.random()*.1;
	var randoAngle = Math.random()*40*2-40;
	
	this.loader.addAnimation([
    {
         "start": startTime, "duration":1.0
        ,"layer": layer, "image": ["data/" + imageName]
		,"angle":[{"rAngle":randoAngle, "degreesZ":"{return animation.rAngle+12.0*Math.sin(2*getSceneTimeFromStart());}"}]
		,"position":[{"x":posX,"y":-256}
		,{"duration":1.0, "y":1280+256}]
		,"scale":[{"x":1.5*invertX*scale*randoScale,"y":1.5*scale*randoScale}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]
	}]);
	
	this.loader.addAnimation([
    {
         "start": startTime, "duration":1.0
        ,"layer": layer-1, "image": ["data/" + imageName]
		,"angle":[{"rAngle":randoAngle, "degreesZ":"{return animation.rAngle+12.0*Math.sin(2*getSceneTimeFromStart());}"}]
		,"position":[{"x":posX,"y":-256}
		,{"duration":1.0, "y":1280+256}]
		,"scale":[{"x":1.1*1.5*invertX*scale*randoScale,"y":1.1*1.5*scale*randoScale}]
		,"color":[{"r":0,"g":0,"b":0,"a":255}]
	}]);
	
}

Demo.prototype.manEnd = function(startTime)
{
	
	this.loader.addAnimation([{
         "start": startTime, "duration":44.5
        ,"layer": 2300, "image": ["data/tex_man.png"]
		,"scale":[{"uniform3d":0.75}]
		,"angle":[{"degreesZ":"{return 2.0*Math.sin(6*getSceneTimeFromStart());}"}
		,{"duration":26.0, "degreesZ":"{return 2.0*Math.sin(6*getSceneTimeFromStart());}"}
		,{"duration":1.0, "degreesZ":"{return Sync.getSyncValue('manEndRot');}"}]
		,"position":[{"x":"{return Sync.getSyncValue('endX')+960;}","y":"{return Sync.getSyncValue('endY')+540;}", "z":1}]
		,"color":[{"r":"{return Sync.getSyncValue('manEndCol');}","g":"{return Sync.getSyncValue('manEndCol');}","b":"{return Sync.getSyncValue('manEndCol');}","a":255}]
	}]);

	this.loader.addAnimation([{
         "start": startTime, "duration":44.5
        ,"layer": 2250, "image": ["data/tex_man.png"]
		,"scale":[{"uniform3d":0.75}
		,{"duration":75, "uniform3d":0.75}
		,{"duration":1, "uniform3d":0.25}]
		,"position":[{"x":"{return Sync.getSyncValue('endX')+960;}","y":"{return Sync.getSyncValue('endY')+531+3*Math.sin(1.5+5*getSceneTimeFromStart());}", "z":1}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]
		,"angle":[{"degreesZ":"{return 2.0*Math.sin(6*getSceneTimeFromStart());}"}
		,{"duration":26.0, "degreesZ":"{return 2.0*Math.sin(6*getSceneTimeFromStart());}"}
		,{"duration":1.0, "degreesZ":"{return Sync.getSyncValue('manEndRot');}"}]
	}]);
}
Demo.prototype.farjanIntersection = function(startTime)
{
	this.loader.addAnimation([
    {
         "start": startTime, "duration":2.0
        ,"layer": 2300, "image": ["data/tex_man_outline.png"]
		,"position":[{"x":960,"y":370}]
		,"angle":[{"degreesZ":"{return Sync.getSyncValue('mangle');}"}]
		,"scale":[{"uniform3d":.8}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]
	}]);
	
	this.loader.addAnimation([
    {
         "start": startTime, "duration":2.0
        ,"layer": 2300, "image": ["data/tex_boat_outline.png"]
		,"position":[{"x":960,"y":370}]
		,"angle":[{"degreesZ":"{return Sync.getSyncValue('farjangle');}"}]
		,"scale":[{"uniform3d":1.8}]
		,"color":[{"r":255,"g":255,"b":255,"a":255}]
	}]);
	
		this.loader.addAnimation([
    {
         "start": startTime, "duration":2.0
        ,"layer": 2098, "image": ["data/white.png"]
		,"scale":[{"x":20.0,"y":30.0}]
		,"position":[{"x":960,"y":340}]
		,"shader":{
			"name":"data/starfield.fs",
			"variable":
			[

			]
		}
	}]);
}

Demo.prototype.createText = function (startTime, duration, textString, scale,yPos)
{
	   	this.loader.addAnimation([{
		"start": startTime, "duration": duration ,"layer": 2850,			
		"text":
		{
			"string":textString
			,"name":"font.ttf"
		}
		,"scale":[{"uniform3d":scale}]
		,"position":[{"x":960,"y":540+yPos,"z":1}		]
		,"angle":[{"degreesZ":0}]
		,"color":[{"r":0,"g":0,"b":0}]
	}]);
}

///
/// DEMO.JS END
///

let loadingBar = new LoadingBar(renderer);
export {loadingBar};

//loadingBar.render();

function startDemo() {
	document.getElementById('start').style.display = 'none';
	canvas.style.display = 'block';
	canvas.style.margin = '0px';
	
	Effect.init("Demo");
}
window.startDemo = startDemo;
//Effect.deinit("Demo");


/*const gui = new GUI()
const cubeFolder = gui.addFolder('Cube')
cubeFolder.add(cube.rotation, 'x', 0, Math.PI * 2)
cubeFolder.add(cube.rotation, 'y', 0, Math.PI * 2)
cubeFolder.add(cube.rotation, 'z', 0, Math.PI * 2)
cubeFolder.open()
*/
//const cameraFolder = gui.addFolder('Camera')
//cameraFolder.add(camera.position, 'z', 0, 10)
//cameraFolder.open()

//Utils.evaluateVariable('test', "{console.log('Hello, World!' +animation)}");

//let texture = new THREE.TextureLoader().load("jml_fist.png");
//let width = 16;//this.texture.image.width;
//let height = 9;//this.texture.image.height;
//let material = new THREE.MeshBasicMaterial({ map: texture, depthTest: false, depthWrite: false });
//let mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, width/height), material);
//scene.add(mesh);

export function animate() {
  if (loadingBar.percent < 1.0) {
    loadingBar.render();
    requestAnimationFrame( animate );
    return;
  }

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
  renderer.clear();
  renderer.render( scene, camera );

  requestAnimationFrame( animate );
}




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