![Build](https://github.com/jumalauta/jml-engine-webgl/workflows/Build/badge.svg)

# JML demo engine, WebGL edition

Demo engine for creating [demoscene](https://en.wikipedia.org/wiki/Demoscene) demos or other realtime graphics animations. This engine's development was initially started in August of 2015 to replace earlier demo engine from circa 2002.

Want to see some examples? Check out: https://github.com/jumalauta/jml-engine-demos

## Contributing

Feel free to contribute with features and bug fixes. Aim to follow design principles.

## Design principles

- **Segmentation of demo and engine**: Demos should be separate from the engine. Don't make clearly single demo specific stuff into the engine. 
- **Backwards compatibility**: Future changes of engine should not break demos made earlier with the engine. Demos made using older engine major versions (i.e., GL legacy or  GL3) should be portable with reasonable effort to newer engine versions (WebGL or newer).
- **Cross compatibility**: Engine should be compatible with major browsers and operating systems, including mobile devices.
- **Low code over no code**: Demos should primarily be made by coding. Engine should not be a no-code GUI tool. 
- **Support mid-range**: One should be able to make 60 fps demos with poor to mediocre PC hardware.

## Tool controls

| Key               | Action                    |
|-------------------|---------------------------|
| Enter             | Start demo                |
| Esc               | Stop demo                 |
| Left arrow        | Rewind demo -1 second     |
| Right arrow       | Rewind demo +1 second     |
| Down arrow        | Rewind demo -1 frame      |
| Up arrow          | Rewind demo +1 frame      |
| Page Down         | Rewind demo -10 seconds   |
| Page Up           | Rewind demo +10 seconds   |
| Space             | Pause/resume demo         |
| Home              | Rewind demo to start      |
| End               | Rewind demo to near end   |
| F                 | Toggle fullscreen |
| P                 | Capture demo to video |
| R                 | Deep reload demo and dispose used memory |
| S                 | Take a screenshot of the current rendered frame |
| T                 | Hide/show tool |

### Other controls

- Skipping preloading: Press any rewinding key during loading
- Mouse controls: To zoom / rotate around camera look-at (if default camera in use)
- Query parameter `time=<millis>`: Set start time of the demo, e.g., to start at 30.5 sec mark: `http://localhost:5173/?time=30500`
- Tool is watching for file changes automatically and attempting to do shallow reloads on changes.

## Player controls

| Key               | Action                    |
|-------------------|---------------------------|
| Enter             | Start demo                |
| Esc               | Stop demo                 |
| Single click      | Stop demo                 |

## Installing tool

- Install [Node.js](https://nodejs.org/en)
- Install dependencies: `npm ci`

## Using tool

- Start tool: `npx vite`
- To start making demos, create `data` directory inside `public` directory
  - Check out [documentation](documentation.md)
  - Some example projects can be found here: https://github.com/jumalauta/jml-engine-demos/tree/main/p2v3

## Demo releases

```
# build release web package
npx vite build
# serve the web package and check that it works
npx vite preview
# instead of a website release, you can also wrap it to a Windows .exe release by running
./release-windows.sh
```
