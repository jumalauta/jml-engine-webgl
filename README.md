# JML demo engine, WebGL edition

## Tool and scripting language documentation

See [documentation.md](documentation.md)

## Tool controls

| Key               | Action                    |
|-------------------|---------------------------|
| Enter             | Start demo                |
| Esc               | Stop demo                 |
| Left arrow        | Rewind demo -1 second     |
| Right arrow       | Rewind demo +1 second     |
| Down arrow        | Rewind demo -10 seconds   |
| Up arrow          | Rewind demo +10 seconds   |
| Space             | Pause/resume demo         |
| Home              | Rewind demo to start      |
| End               | Rewind demo to near end   |
| Mouse controls    | To zoom / rotate around camera look-at |
| R                 | Deep reload demo and dispose used memory |

Tool is watching for file changes automatically and attempting to do shallow reloads on changes.

## Player controls

| Key               | Action                    |
|-------------------|---------------------------|
| Enter             | Start demo                |
| Esc               | Stop demo                 |
| Single click      | Stop demo                 |

## Installing tool

- Install [Node.js](https://nodejs.org/en)
- Install dependncies: `npm ci`

## Using tool

- Start tool: `npx vite`
- To start making demos, create `data` directory inside `public` directory

## Demo releases

```
# build release web package
npx vite build
# serve the web package and check that it works
npx vite preview
# to wrap it to a Windows release run
./release-windows.sh
```
