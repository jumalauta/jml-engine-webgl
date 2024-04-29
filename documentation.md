# engine

## Table of contents

* [Shader uniform autobinding](#shader-uniform-autobinding)
* [Supported file formats](#supported-file-formats)
* [Demo scripting](#demo-scripting)

## Shader uniform autobinding

Following uniforms will be attempted to be auto-binded, if uniform is available in the shader:
```
uniform float      time;                    // Current time in seconds
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

#### Text drawing examples
Draw 2D text to the screen:
```JavaScript
this.loader.addAnimation([
{
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
this.loader.addAnimation([
{
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
this.loader.addAnimation([{
  "start": start, "duration":end
  ,"id":"allseeing" // give ID to object so it can be used as a parent
  ,"layer": layer
  ,"object":"obj_allseeing.obj"
  ,"position":[{"x":2,"y":-2,"z":-4}]
  ,"scale":[{"uniform3d":1.5}]
  ,"angle": [{"degreesY":()=>-20*getSceneTimeFromStart(),"degreesZ":0,"degreesX":0}]
}]);

// this is used to rotate this object's child object to "orbit" the original object 
this.loader.addAnimation([{
  "start": start, "duration":end
  ,"parent":"allseeing" // parent object ID, object will utilize matrix of this object
  ,"id": "allseeing2" // unique ID for this object
  ,"layer": layer
  ,"object":null // this is special notation, there is no object but you can do matrix transformations / animations that child objects can inherit
  ,"position":[{"x":2,"y":-2,"z":-4}]
  ,"scale":[{"uniform3d":1.5}]
  ,"angle": [{"degreesY":()=>20*getSceneTimeFromStart(),"degreesZ":0,"degreesX":0}]
}]);

this.loader.addAnimation([{
  "start": start, "duration":end,
  ,"parent":"allseeing2" // parent object ID, object will utilize matrix of this object
  ,"layer": layer
  ,"object":"obj_allseeing.obj"
  ,"angle": [{"degreesX":()=>40*getSceneTimeFromStart(),"degreesY":0,"degreesZ":0}]
  ,"color":[{"r":1,"g":0,"b":0,"a":1}]
}]);
```

#### Setup camera
Look at origo (0,0,0) from z:10:
```JavaScript
this.loader.addAnimation([
{
     "start": 0, "duration": 30, "camera": "cam1",
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
        ,"runFunction":(animation)=>drawFunction(animation)}
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
