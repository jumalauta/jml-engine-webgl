![Build](https://github.com/jumalauta/jml-engine-webgl/workflows/Build/badge.svg)

# JML demo engine, WebGL edition

Demo engine for creating [demoscene](https://en.wikipedia.org/wiki/Demoscene) demos or other realtime graphics animations. This engine's development was initially started in August of 2015 to replace earlier demo engine from circa 2002.

Demo engine consists of following:
- **Player**: The actual engine that executes demos and realtime animations in a web browser
- **Tool**: Utilies and functionality to support developing of demos, some functionality is embedded in the player and some functionality is provided by `tool_server` Node application

Want to see some examples?
- Watch demos in web browser: https://jumalauta.github.io/jml-engine-demos/
- Browse some demo source codes: https://github.com/jumalauta/jml-engine-demos

## Installing tool

- Use the preconfigured [Development Container](https://containers.dev/) or install [Node.js](https://nodejs.org/en) latest LTS version  
- Install dependencies: `npm ci; npm --prefix tool_server ci`

## Using tool

- Start tool: `npx vite`
- To start making demos, create `data` directory inside `public` directory
  - Check out [documentation](documentation.md)
  - Some example projects can be found here: https://github.com/jumalauta/jml-engine-demos/tree/main/p2v3

## Supported platforms

|            | Tool | Player |
|------------|------|--------|
| Windows    | YES  | YES    |
| Linux      | YES  | YES    |
| MacOS      | YES  | YES    |
| iOS/iPadOS | NO   | YES    |
| Android    | NO   | YES    |
| Chrome     | YES  | YES    |
| Edge       | YES  | YES    |
| Firefox    | YES  | YES    |
| Safari     | YES  | YES    |

Note that depending on a demo particularly memory usage may exceed allowed thresholds of mobile devices. This means that not all demos work in mobile devices.

## Player controls

Player controls are always enabled.

| Key               | Action                      |
|-------------------|-----------------------------|
| Enter             | Start demo                  |
| Esc               | Stop demo                   |
| Click screen      | Stop demo (good for mobile) |
| F                 | Toggle fullscreen           |

## Tool controls

Tool controls are only enabled when tool mode (`settings.engine.tool`) is enabled.

| Key               | Action                    |
|-------------------|---------------------------|
| Left arrow        | Rewind demo -1 second     |
| Right arrow       | Rewind demo +1 second     |
| Down arrow        | Rewind demo -1 frame      |
| Up arrow          | Rewind demo +1 frame      |
| Page Down         | Rewind demo -10 seconds   |
| Page Up           | Rewind demo +10 seconds   |
| Space             | Pause/resume demo         |
| Home              | Rewind demo to start      |
| End               | Rewind demo to near end   |
| P                 | Capture demo to video |
| R                 | Deep reload demo and dispose used memory |
| S                 | Take a screenshot of the current rendered frame |
| T                 | Hide/show tool |

### Query parameters

| Query parameter   | Action                    |
|-------------------|---------------------------|
| `startTime=<millis>`   | Set start time of the demo |
| `loopAtTime=<millis>`   | Set time when the demo loops to startTime |
| `enabledLogLevels=trace,debug,info,warn,error` | Enable logging levels |
| `autoStart=<true\|false>`  | Automatically start demo |
| `preload=<true\|false>`  | If preload should be enabled |
| `select=<path-to-demo>` | Change demo path from `data` directory to something else |

If you're developing a demo and want to iterate some scene at 30.5 seconds with minimal loading times you can, for example, do following: `http://localhost:5173/?startTime=30500&autoStart=true&preload=false&select=projects/new-demo`

### Other controls

- Skipping preloading: Press any rewinding key during loading
- Mouse controls: To zoom / rotate around camera look-at (if default camera in use)
- Tool is watching for file changes automatically and attempting to do shallow reloads on changes.

## Player controls

| Key               | Action                    |
|-------------------|---------------------------|
| Enter             | Start demo                |
| Esc               | Stop demo                 |
| Single click      | Stop demo                 |

## Demo releases

```
# build release web package
npx vite build
# serve the web package and check that it works
npx vite preview
# instead of a website release, you can also wrap it to a Windows .exe release by running
./release-windows.sh data/demo-jml-helloworld/
```

## Contributing

Feel free to contribute with features and bug fixes. Aim to follow design principles.

## Design principles

- **Segmentation of demo and engine**: Demos should be separate from the engine. Don't make clearly single demo specific stuff into the engine. 
- **Backwards compatibility**: Future changes of engine should not break demos made earlier with the engine. Demos made using older engine major versions (i.e., GL legacy or  GL3) should be portable with reasonable effort to newer engine versions (WebGL or newer).
- **Cross compatibility**: Engine should be compatible with major browsers and operating systems, including mobile devices.
- **Low code over no code**: Demos should primarily be made by coding. Engine should not be a no-code GUI tool. 
- **Support mid-range**: One should be able to make 60 fps demos with poor to mediocre PC hardware.
