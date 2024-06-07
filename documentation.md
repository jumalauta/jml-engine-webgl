# JML Demo engine

## Table of contents

* [Shader uniform autobinding](#shader-uniform-autobinding)
* [Supported file formats](#supported-file-formats)
* [Music spectogram](#music-spectogram)
* [Demo scripting](#demo-scripting)
* [Exporting animations from Blender](#exporting-animations)
  
## Shader uniform autobinding

Following uniforms will be attempted to be auto-binded, if uniform is available in the shader:
```
uniform float      time;                    // Current time in seconds
uniform float      timePercent;             // Current time in percent of the total duration from 0.0 to 1.0
uniform vec4       color;                   // Main color of the vertex
uniform sampler2D  texture0;                // Samplers for input textures i
```

## Supported file formats

| File format | Description               |
|-------------|---------------------------|
| .OBJ & .MTL | 3D Object                 |
| .GLB        | 3D Object (/w animations) |
| .GLTF       | 3D Object (/w animations) |
| .MP3        | Music                     |
| .PNG        | 2D graphics media         |
| .MP4        | Video media               |
| .TTF        | Font file                 |
| .VS         | Vertex shader             |
| .FS         | Fragment shader           |
| .ROCKET     | GNU Rocket syncs          |

## Music spectogram

Create a spectogram from audio track: `ffmpeg -i music.mp3 -lavfi showspectrumpic=s=1920x1080:legend=disabled spectogram.png`

- Spectogram image is expected to show time from left to right, and low to high frequencies from bottom to top
- If `spectogram.png` is found in demo data directory, it will be used in the tool mode as panel background
- `spectogram.png` can be handy for creating sync in shaders by loading spectogram texture to the shader as an image
- `spectogram.png` current values can be read in javascript code using:
  - `Sync.getFftRaw()` returns current column of Spectogram in JavaScript TypeArray. Size is `<color channels> * <spectogram pixel height>`
  - `Sync.getFft(0.0, 1.0)` returns average of frequence, first parameter is start percent and second parameter is end percent

### Spectogram shader example

Example that displays the FFT from spectogram in a shader

```JavaScript
	this.loader.addAnimation({"image": ["spectogram.png"], "shader":{"name":"spectogram.fs"}});
```

```c
// spectogram.fs
in vec2 texCoord;
out vec4 fragColor;

uniform sampler2D texture0;
uniform float timePercent;

void main()
{
    vec2 coord = texCoord.xy;
    coord.x = timePercent;
    fragColor = texture(texture0, coord);
}
```

## Demo scripting

* Demo scripting is based on JavaScript/ECMAScript
* `Demo.js` contains the actual demo code.

### Scripting language reference
* Here's documented scripting language reference.
* Scripting language should primarily be defined in scene class' init() method.

#### addAnimation
* addAnimation method adds animation definition
```JavaScript
this.loader.addAnimation(
     {/*Animation JSON 1*/}
);
```

#### Animation primitives
* First animation primitive array element omits time definitions and uses defaults always
* All animation primitives support time definitions and arrays
* After first animation primitive, the primitives always inherit the values from previous primitive
* Non-time related animation variables support [JavaScript dynamic injection](#javascript-dynamic-injection)
```JavaScript
"animationPrimitive": [
    { //animation primitive 1
        "start":<time>     //start time, default is the animation block's start time
        ,"duration":<time> //duration time, default is the animation block's duration time
        ,"end":<time>      //end time, default is the animation block's end time
        ,"time":<time or function> //to override the animation time programmatically. start and duration/end will be honored normally.
        /*more animation variables per animation primitive*/
    }
     ,{/*animation primitive 2*/}
     ,{/*animation primitive 3*/}
     /*...*/
     ,{/*animation primitive N*/}
]
```

```JavaScript
"scale": [
    {
       "x":1.0         //scale X value 1.0 = 100% - default is 1.0
      ,"y":1.0         //scale Y value 1.0 = 100% - default is 1.0
      ,"z":1.0         //scale Z value 1.0 = 100% - default is 1.0
      ,"uniform2d":1.0 //scale X & Y = uniform2d value - default undefined
      ,"uniform3d":1.0 //scale X, Y & Z = uniform2d value - default undefined
    }
]
```

```JavaScript
//in case of images:
// - if position is not given then image is aligned to center
// - 2d image's origo (x:0.0,y:0.0) is middle of the screen so that image is centered to origo.
// 2d coordinates are -0.5 - 0.5
"position": [
    {
         "x":0.0  //position X - default is context specific but usually 0.0
        ,"y":0.0  //position Y - default is context specific but usually 0.0
        ,"z":0.0  //position Z - default is context specific but usually 0.0
    }
]
```

```JavaScript
"color": [
    {
         "r":1.0  //color red   - accepts values 0.0-1.0 - default is 1.0
        ,"g":1.0  //color green - accepts values 0.0-1.0 - default is 1.0
        ,"b":1.0  //color blue  - accepts values 0.0-1.0 - default is 1.0
        ,"a":1.0  //color alpha - accepts values 0.0-1.0 - default is 1.0
    }
]
```

```JavaScript
"angle": [
    {
         "degreesX":0  //3d angle degrees X - default is 0
        ,"degreesY":0  //3d angle degrees Y - default is 0
        ,"degreesZ":0  //2d/3d angle degrees Z - default is 0
    }
]
```

#### JavaScript dynamic injection
* Instead of normal JSON definition "variableName":1.0 or "variableName":getConstantValue() it's possible to inject dynamic JavaScript code by defining anonymous function.
* Example: `"variableName":()=>{return javaScriptVariable*Math.sin(getSceneTimeFromStart()/10.0);}`

### Scripting language examples

#### 2D image animation examples
```JavaScript
//Move jml_fist.png from bottom-left to top-right in 10 seconds, show image for 60 seconds
this.loader.addAnimation({
     "start": 0, "duration": 60
    ,"image": "jml_fist.png"
    ,"position": [
          {"x":-0.5, "y":-0.5}
         ,{"duration":10, "x":0.5, "y":0.5}
    ]
});
```

```JavaScript
//Move jml_fist.mp4 video from bottom-left to top-right in 10 seconds, show image for 60 seconds
this.loader.addAnimation({
     "start": 0, "duration": 60
    ,"image": "jml_fist.mp4"
    ,"position": [
          {"x":-0.5, "y":-0.5}
         ,{"duration":10, "x":0.5, "y":0.5}
    ]
});
```

```JavaScript
//Wait 2 seconds and then:
//1) vertically "flip" jml_fist.png by scaling y from 1.0 to -1.0
//2) horizontally "flip" the image
//3) "flip" image back to normal
this.loader.addAnimation({
     "start": 0, "duration": 60
    ,"image": "jml_fist.png"
    ,"scale": [
          {"x":1, "y":1}
         ,{"start":2, "duration":1, "x":1, "y":-1}
         ,{"duration":1, "x":-1, "y":-1}
         ,{"duration":1, "x":1, "y":1}
    ]
});
```
```JavaScript
//Rotate jml_fist.png clock-wise 360 degrees in 3 seconds
this.loader.addAnimation({
     "start": 0, "duration": "5:00"
    ,"layer": 1, "image": "jml_fist.png"
    ,"angle": [
         {"degreesZ":0}
        ,{"duration":3, "degreesZ":360}
    ]
});
```
```JavaScript
//1) Make jml_fist.png completely black and transparent
//2) Transition the image from completely transparent to completely opaque in 2.5 seconds
//3) Transition the image from completely black to white in 5 seconds
this.loader.addAnimation({
     "start": 0, "duration": 60
    ,"image": "jml_fist.png"
    ,"color": [
         {"r":0, "g":0, "b":0, "a":0}
        ,{"duration":2.5, "a":1}
        ,{"duration":5, "r":1, "g":1, "b":1}
    ]
});
```

#### 3D image

```JavaScript
this.loader.addAnimation({
	"image": "jml_fist.png",
  "perspective":"3d", // tells that the image should be in 3D and not in default 2D
  "position":[{"x":0,"y":0,"z":-5}],
  "billboard":true // spherical billboarding to adjust image orientation to face the camera
});
```

#### 3D image instancing / particles

```JavaScript
this.loader.addAnimation({
	"image": "jml_fist.png",
  "perspective":"3d",
  "position":[{"x":0,"y":0,"z":-5}],
  "color":[{"a":0.5}],
  "billboard":true,
  // instancer can be used for objects and images
  "instancer": {
    "count": 10, // adjust maximum number of instances, i.e. display 10 images of jml_fist.png
    "runInstanceFunction": (properties) => {
      const i = properties.index;
      const count = properties.count;
      const time = properties.time;
      let object = properties.object;
      let color = properties.color;

      // position instance
      object.position.x = Math.sin(time + i * Math.PI * 2 / count) * 2;
      object.position.y = Math.cos(time + i * Math.PI * 2 / count) * 2;

      // rotate instance
      object.rotation.z = time;

      // change color of instance
      color.r = 1;
      color.g = 0;
      color.b = 0;
      color.a = (i+1)/count;

      // Change the count between 0 and 10, how many instances are drawn
      properties.count = Math.floor((Math.sin(time)+1)/2*10);
    }
  }
});
```

#### Custom shaders

Custom shaders can be defined for any meshes (image / 3d object / text).

```JavaScript
this.loader.addAnimation({
  "start": start, "duration": end
  ,"layer": layer
  // _embedded/defaultTransparent.png is a fullscreen 2D transparent image
  ,"image": ["_embedded/defaultTransparent.png"]
  // Use shader file "vignette.fs" with the image
  ,"shader":{"name":"vignette.fs",
    // define / animate the shader uniforms
    "variable":[
     {"name":"fadeStart","value":[() => Math.sin(getSceneTimeFromStart())*0.05+0.55]}
    ,{"name":"fadeEnd","value":[0.8]}
  ]}
  });
```

#### Text drawing examples
Draw 2D text to the screen:
```JavaScript
this.loader.addAnimation({
    "start": 0, "duration": 30
    ,"text":{
      "string":"Here is a 2D text string!"
      ,"name":"font.ttf"
    }
    ,"scale": [
          {"uniform2d":0.5}
    ]
    ,"color": [
          {"g":0,"b":0}
    ]
    ,"angle": [
           {"degreesZ":0}
          ,{"duration":3, "degreesZ":360}
    ]
});
```

Draw 3D text to the screen:
```JavaScript
this.loader.addAnimation({
     "start": 0, "duration": 30
    ,"text":{"string":"Here is a 3D text string!", "name":"font.ttf", "perspective":"3d"}
    ,"scale": [
          {"x":0.4,"y":0.4}
    ]
    ,"color": [
          {"r":0}
    ]
    ,"position": [
         {"x":-5,"y":0,"z":-10}
    ]
    ,"angle": [
           {"x":1,"y":1,"z":1}
          ,{"duration":3, "degreesX":360,"degreesY":360,"degreesZ":360}
    ]
});
```

#### Use GNU Rocket syncing in an animation

```JavaScript
// define location of GNU Rocket XML file
const settings = new Settings();
settings.demo.sync.rocketFile = 'sync/fallofman.rocket'; // XML file needs to be defined also when trying to start WebSocket connection to GNU Rocket

//Create a GNU Rocket sync pattern but apply only to one variable in the animation
this.loader.addAnimation({
     "start": 0, "duration": 30
    ,"image": "vinyl_label.png"
    ,"angle": [
         {"degreesZ":()=>Sync.getSyncValue('vinyl.scratch')}
    ]
});
```

#### 3D Objects

```JavaScript
// Play an animation
this.loader.addAnimation({
  "start": start, "duration":end
  "object":{
    "name":"RobotExpressive.glb",
    "animations":  {
      // Plays "Death" animation in loop with small animation weight
      "Death": {"weight":0.1, "timescale":1.0, "enabled":true, "loop":true},
      // Plays "Dance" animation in loop with bigger animation weight. I.e. mainly Dance animation with a bit of Death animation mixed together
      "Dance": {"weight":0.9, "timescale":1.0, "enabled":true, "loop":true}
    }
  }
  ,"position":[{"x":0,"y":0,"z":-10}]
});
```

```JavaScript
// Show static 3D object
this.loader.addAnimation({
   "start": start, "duration":end
  ,"object":"duck.obj"
  ,"position":[{"x":0,"y":0,"z":-10}]
});
```

```JavaScript
// Display +50% scaled 3D object that rotates by Y axis
this.loader.addAnimation({
  "start": start, "duration":end
  ,"id":"allseeing" // give ID to object so it can be used as a parent
  ,"layer": layer
  ,"object":"obj_allseeing.obj"
  ,"position":[{"x":2,"y":-2,"z":-4}]
  ,"scale":[{"uniform3d":1.5}]
  ,"angle": [{"degreesY":()=>-20*getSceneTimeFromStart(),"degreesZ":0,"degreesX":0}]
});

// this is used to rotate this object's child object to "orbit" the original object 
this.loader.addAnimation({
  "start": start, "duration":end
  ,"parent":"allseeing" // parent object ID, object will utilize matrix of this object. If object has child meshes then you can use child mesh as parent, e.g.,  "allseeing.childmesh" (assuming object has child mesh with name 'childmesh')
  ,"id": "allseeing2" // unique ID for this object
  ,"layer": layer
  ,"object":null // this is special notation, there is no object but you can do matrix transformations / animations that child objects can inherit
  ,"position":[{"x":2,"y":-2,"z":-4}]
  ,"scale":[{"uniform3d":1.5}]
  ,"angle": [{"degreesY":()=>20*getSceneTimeFromStart(),"degreesZ":0,"degreesX":0}]
});

this.loader.addAnimation({
  "start": start, "duration":end,
  ,"parent":"allseeing2" // parent object ID, object will utilize matrix of this object
  ,"layer": layer
  ,"object":"obj_allseeing.obj"
  ,"angle": [{"degreesX":()=>40*getSceneTimeFromStart(),"degreesY":0,"degreesZ":0}]
  ,"color":[{"r":1,"g":0,"b":0,"a":1}]
});
```

```JavaScript
// Dynamically change 3D animation timer
this.loader.addAnimation({
  "start": start, "duration":end
  ,"layer": layer
  ,"object":{
    "name":"animation.glb",
    "time":()=>(Math.sin(getSceneTimeFromStart())+1)/2, // this controls the animation timer dynamically
    "animations": {
      "Take 001":  {"weight":1.0, "timescale":1.0, "enabled":true, "loop":true}
    }
  }
});
```

#### Material overrides

Materials have default settings or settings that come from the 3D Model. Material settings can be overridden during loading of demo if needed.

Material documentation for what properties exist: https://threejs.org/docs/#api/en/materials/Material

```JavaScript
// Show static 3D object
this.loader.addAnimation({
   "start": start, "duration":end
  ,"object":"duck.obj"
  ,"position":[{"x":0,"y":0,"z":-10}]
  // Change 3D Object's materials properties
  ,"material":{
    "dithering":true,
    "transparent:":false,
  }
  ,"shader":{
    // extend generated material shader
    "fragmentShaderPrefix":`
      uniform float time;
    `,
    "fragmentShaderSuffix":`
      vec4 color = gl_FragColor;
      color.gb = vec2((sin(time)+1.0)/2.0, 0.0);
      gl_FragColor = color;
    `
  }
});
```

##### Generated material's default shaders

Three.js generates shaders for material dynamically. This chapter documents Three.js version 0.163.0 material shaders to gain better understanding how to extend them.

ShaderChunks, or what is being included can be found here: https://github.com/mrdoob/three.js/tree/f75fb41bb09d0abb9d440e83cde3c256ef292e4e/src/renderers/shaders/ShaderChunk

Material vertex shader example:

```c
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
// this is shader.vertexShaderPrefix injection point
void main() {
#include <uv_vertex>
#include <color_vertex>
#include <morphinstance_vertex>
#include <morphcolor_vertex>
#include <batching_vertex>
#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
#include <beginnormal_vertex>
#include <morphnormal_vertex>
#include <skinbase_vertex>
#include <skinnormal_vertex>
#include <defaultnormal_vertex>
#endif
#include <begin_vertex>
#include <morphtarget_vertex>
#include <skinning_vertex>
#include <project_vertex>
#include <logdepthbuf_vertex>
#include <clipping_planes_vertex>
#include <worldpos_vertex>
#include <envmap_vertex>
#include <fog_vertex>
// this is shader.vertexShaderSuffix injection point
}
```

Material fragment shader example:

```c
uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
// this is shader.fragmentShaderPrefix injection point
void main() {
vec4 diffuseColor = vec4( diffuse, opacity );
#include <clipping_planes_fragment>
#include <logdepthbuf_fragment>
#include <map_fragment>
#include <color_fragment>
#include <alphamap_fragment>
#include <alphatest_fragment>
#include <alphahash_fragment>
#include <specularmap_fragment>
ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
#ifdef USE_LIGHTMAP
vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
#else
reflectedLight.indirectDiffuse += vec3( 1.0 );
#endif
#include <aomap_fragment>
reflectedLight.indirectDiffuse *= diffuseColor.rgb;
vec3 outgoingLight = reflectedLight.indirectDiffuse;
#include <envmap_fragment>
#include <opaque_fragment>
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
#include <premultiplied_alpha_fragment>
#include <dithering_fragment>
// this is shader.fragmentShaderSuffix injection point
}
```

#### Setup camera
Look at origo (0,0,0) from z:10:
```JavaScript
this.loader.addAnimation({
     "start": 0, "duration": 30, "camera": "cam1"
     //where camera is located
     ,"position":[
        {"x":0,"y":0,"z":10}
     ]
     //where camera is looking at
     ,"target":[
        {"x":0,"y":0,"z":0}
     ]
     //camera's up vector
     ,"up":[
        {"x":0,"y":1,"z":0}
     ]
     //camera's perspective setup
     ,"perspective":[
        {"fov":45,"aspect":16/9,"near":1,"far":1000}
     ]
});
```

#### Setup lights

```JavaScript
this.loader.addAnimation({
  "start": start, "duration": duration, "layer": layer,
  "light": {
    "type": "Ambient",
    // animate intensity
    "properties": { "intensity":  ()=>Math.sin(getSceneTimeFromStart())+1.0 },
  },
  "color":[{"r":1.0,"g":1.0,"b":1.0}]
});
```

```JavaScript
this.loader.addAnimation({
  "start": start, "duration": duration, "layer": layer,
  "light": {
    "type": "Directional",
    "properties": { "intensity": 1.0 },
    "castShadow": true, // cast shadows
  },
  "color":[{"r":1.0,"g":0.0,"b":0.0}], // red light
  "position":[{"x":2.0,"y":1.0,"z":0.0}], // Directional light that is directioned from position to xyz 0,0,0 
});
```

#### FBO / render to texture example

```JavaScript
this.loader.addAnimation ({"start": start, "duration": end ,"layer": layer, "fbo":{"name":"testFbo2","action":"begin"}});

// ... put here animations that will be rendered to texture ...

this.loader.addAnimation ({"start": start, "duration": end ,"layer": layer, "fbo":{"name":"testFbo2","action":"unbind"}});

// Display the rendered texture
this.loader.addAnimation({
  "start": start, "duration": end,"layer": layer,
  "image": ["testFbo2.color.fbo"]
});
```

#### Custom JavaScript functions
##### Simple example
Definition in the init method:

```JavaScript
    this.loader.addAnimation({
         "start": 10, "end": 58
        ,"initFunction":(animation)=>{initFunction(animation)}
        ,"runFunction":(animation)=>{drawFunction(animation)}
    });
```

#### Scenes

Concept of scenes can be used to group animations together, scenes can be played then once or multiple times
When scenes are rendered
By default all animations are inside scene named 'main'

```JavaScript
// here's example of putting
this.loader.setScene('fist');

this.loader.addAnimation({
     "start": 0, "duration": 60
    ,"image": "jml_fist.png"
    ,"scale": [
          {"x":1, "y":1}
         ,{"start":2, "duration":1, "x":1, "y":-1}
         ,{"duration":1, "x":-1, "y":-1}
         ,{"duration":1, "x":1, "y":1}
    ]
    ,"color": {
      // Get
      "a": ()=>getSceneVariable().color[0].a
    }
});

// put scene back to 'main' show that any rendering can be displayed
this.loader.setScene('main');
function changeScene(v)  {
  if (v == 1) {
    return  {
      "color":[{"a":()=>0.5+(Math.sin(getSceneTimeFromStart())+1.0)/2.0*0.5}]
    };
  } else {
    return  {
      "color":[{"a":1.0}]
    };
  }
}

// Render 'fist' scene, in this scene the alpha of the jml_fist.png animation fluctuates (according to changeScene function)
this.loader.addAnimation({"start": start, "duration": duration, "layer": layer, "scene":{"name":"fist", "fbo":{"name":"fbo1"}, "variable":()=>changeScene(1)}});
// Draw fist screen FBO to left
this.loader.addAnimation({
  "start": start, "duration": end,"layer": layer,
  "image": ["fbo1.color.fbo"],
  "scale":[{"uniform2d":0.5}],
  "position":[{"x":-0.25,"y":0.0}]
});

// Render 'fist' scene, in this scene the alpha of the jml_fist.png is stable 1.0
this.loader.addAnimation({"duration": duration, "layer": layer, "scene":{"name":"fist", "fbo":{"name":"fbo2"}, "variable":()=>changeScene(2)}});
// Draw fist screen FBO to right
this.loader.addAnimation({
  "start": start, "duration": end,"layer": layer,
  "image": ["fbo2.color.fbo"],
  "scale":[{"uniform2d":0.5}],
  "position":[{"x":0.25,"y":0.0}]
});
```

## Exporting animations

### Adding new animations
- Select animated object
- Select animation you wish to add in **Dope Sheet->Action Editor**
- Name animation, if it has some nonsensical default name (just press the name in **Action Editor**
- Press button **Push Down** in **Action Editor** - animation is now added to active armature as **NLA track**
- Export .glb/.gltf and remember to include animations (they are included by default)

### Modifying existing animations
- Import .glb/.gltf
- Select animated object
- Open Nonlinear Animation and select animation you wish to edit
- Press TAB - animation is now active
- Do your changes
- Press TAB again in Nonlinear Animation - no need to push
- Export .glb/.gltf and remember to include animations (they are included by default)

### Additional notes
- It's good idea to have LocRotScale keyframe for all bones, even if they don't have movement. Not having keyframe data can lead to weird behavior, if file has multiple animations.
