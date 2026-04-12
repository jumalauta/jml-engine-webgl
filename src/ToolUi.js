//import * as THREE from 'three';
import Stats from 'stats.js';
// import { GUI } from 'dat.gui';
// import ace from 'ace-builds';
// import 'ace-builds/src-noconflict/mode-javascript';
// import 'ace-builds/src-noconflict/theme-monokai';
// import jsWorkerUrl from "file-loader!ace-builds/src-noconflict/worker-javascript";
// ace.config.setModuleUrl("ace/mode/javascript_worker", jsWorkerUrl)
// editor multiple tabs example: https://codepen.io/zymawy/pen/QRLXNE

import { Timer } from './Timer';
import { Settings } from './Settings';
import { Spectogram } from './Spectogram';
import { loggerInfo, loggerWarning } from './Bindings';
// import { FileManager } from './FileManager'
// import { Settings } from './Settings'
import { Utils } from './Utils';
import { Fbo } from './Fbo';
import { DemoRenderer } from './DemoRenderer';
import { ToolClient } from './ToolClient';
import './ToolUi.css';

const settings = new Settings();

/* const gui = new GUI()
const cubeFolder = gui.addFolder('Cube')
cubeFolder.add(cube.rotation, 'x', 0, Math.PI * 2)
cubeFolder.add(cube.rotation, 'y', 0, Math.PI * 2)
cubeFolder.add(cube.rotation, 'z', 0, Math.PI * 2)
cubeFolder.open()
*/
// const cameraFolder = gui.addFolder('Camera')
// cameraFolder.add(camera.position, 'z', 0, 10)
// cameraFolder.open()

const ToolUi = function () {
  return this.getInstance();
};

ToolUi.prototype.getInstance = function () {
  if (!ToolUi.prototype._singletonInstance) {
    ToolUi.prototype._singletonInstance = this;
    this.setCustomMenuItems([]);
  }

  return ToolUi.prototype._singletonInstance;
};

ToolUi.prototype.setDebugText = function (html) {
  if (!this.debug) {
    this.debug = document.createElement('div');
    this.debug.style.cssText =
      'position:fixed;left:50%;transform:translate(-50%,0%);opacity:0.9;z-index:10000;color:#fff;font-family:monospace;font-size:2em;';
    document.body.insertBefore(this.debug, document.body.firstChild);
  }

  this.debug.innerHTML = html;
};

ToolUi.prototype.clearDebugText = function () {
  if (this.debug) {
    this.debug.innerHTML = '';
    document.body.removeChild(this.debug);
    this.debug = undefined;
  }
};

ToolUi.prototype.init = function () {
  this.panel = document.getElementById('panel');
  this.stats = new Stats();
  this.stats.showPanel(0);
  document.body.appendChild(this.stats.dom);
  this.sceneState = {};
  this.activeFboPreviews = new Map();

  // const fileManager = new FileManager()

  /* this.editor = ace.edit("editor");
    ace.config.set("basePath",  "ace-builds/src-noconflict");
    this.editor.setTheme("ace/theme/monokai");
    this.editor.session.setMode("ace/mode/javascript");
    this.editor.commands.addCommand({
        name: 'myCommand',
        bindKey: {win: 'Ctrl-S',  mac: 'Command-S'},
        exec: function(editor) {
            for(let i = 0; i < editor.session.getAnnotations().length; i++) {
                let annotation = editor.session.getAnnotations()[i];
                if (annotation.type === "error") {
                    loggerWarning("Not reloading. error on line " + annotation.row + ": " + annotation.text);
                    editor.gotoLine(annotation.row + 1);
                    return;
                }
            }

            fileManager.setFileData("Demo.js", editor.session.getValue());
            fileManager.setNeedsUpdate(true);
            const javaScriptFile = new JavaScriptFile();
            javaScriptFile.load("Demo.js");
        },
        readOnly: true, // false if this command should not apply in readOnly mode
        // multiSelectAction: "forEach", optional way to control behavior with multiple cursors
        // scrollIntoView: "cursor", control how cursor is scolled into view after the command
    });

    fileManager.load('Demo.js', null, (instance, data) => {
        (new ToolUi()).editor.session.setValue(data);
        return true;
    }); */

  this.panel = document.getElementById('panel');
  this.timelineSlider = document.getElementById('timeline-slider');
  this.timelineSlider.addEventListener(
    'input',
    () => {
      const percentage = this.timelineSlider.value / this.timelineSlider.max;
      new Timer().setTimePercent(percentage);
      // console.log("Manual time change to percentage: " + percentage);
    },
    false
  );

  this.activeMenu = null;
  this.initContextMenu();

  this.hide();
};

ToolUi.prototype.show = function () {
  if (!settings.engine.tool) {
    return;
  }

  this.panel.style.display = 'block';
  this.panel.classList.add('tool-ui-panel', 'visible');
  this.stats.dom.style.display = 'block';
  this.timelineSlider.classList.add('tool-ui-timeline-slider', 'visible');

  new Spectogram().show(true);
};

ToolUi.prototype.hide = function () {
  this.panel.style.display = 'none';
  this.panel.classList.remove('tool-ui-panel', 'visible');
  this.stats.dom.style.display = 'none';
  this.timelineSlider.classList.remove('tool-ui-timeline-slider', 'visible');
  this.clearDebugText();
  this.setCustomMenuItems([]);

  new Spectogram().show(false);
};

ToolUi.prototype.isVisible = function () {
  return this.panel.classList.contains('visible');
};

ToolUi.prototype.addSceneToTimeline = function (sceneName, start, end) {
  if (!settings.engine.tool) {
    return;
  }

  if (Utils.isNumeric(start) === false || Utils.isNumeric(end) === false) {
    return;
  }

  const endTime = (new Timer().endTime || 0) / 1000;
  if (!endTime) {
    loggerInfo(
      `Not adding scene ${sceneName} to timeline because there is no end time`
    );
    return;
  }

  const startPercent = start / endTime;
  const durationPercent = (end - start) / endTime;

  const maxRows = 4;
  let row = 1;
  let sceneState;
  for (let i = 1; i <= maxRows; i++) {
    sceneState = this.sceneState[i] || { width: 0 };
    if (startPercent >= sceneState.width) {
      row = i;
      sceneState.width += durationPercent;
      this.sceneState[i] = { ...sceneState };
      break;
    }
  }

  if (sceneState === undefined) {
    loggerWarning(
      `Not adding scene ${sceneName} because there is no room in timeline`
    );
    return;
  }

  const sceneElement = document.createElement('div');
  sceneElement.innerHTML = sceneName;
  sceneElement.className = 'scene';
  sceneElement.style.width = `${(durationPercent * 100).toFixed(2)}%`;
  sceneElement.style.top = `${row * 1.05}em`;
  sceneElement.style.left = `${(startPercent * 100).toFixed(2)}%`;
  sceneElement.addEventListener('click', () => {
    new Timer().setTimePercent(startPercent);
  });

  let titleTimer;
  sceneElement.addEventListener('mouseover', () => {
    titleTimer = setInterval(() => {
      sceneElement.innerHTML = `${sceneName} ${(new Timer().getTimeInSeconds() - start).toFixed(1)}/${(end - start).toFixed(1)}`;
    }, 100);
  });
  sceneElement.addEventListener('mouseout', () => {
    clearTimeout(titleTimer);
    sceneElement.innerHTML = sceneName;
  });

  const panel = document.getElementById('panel');
  panel.appendChild(sceneElement);
};

ToolUi.prototype.clearScenes = function () {
  this.clearDebugText();
  this.sceneState = {};
  const sceneElements = document.getElementsByClassName('scene');
  while (sceneElements.length > 0) {
    sceneElements[0].parentNode.removeChild(sceneElements[0]);
  }
};

ToolUi.prototype.update = function () {
  this.markSliderLoopRange();

  this.timelineSlider.value =
    new Timer().getTimePercent() * this.timelineSlider.max;
};

ToolUi.prototype.markSliderLoopRange = function () {
  if (!this.timelineSlider) {
    return;
  }

  if (settings.engine.loopAtTime === undefined) {
    if (this.currentLoopEndPercent) {
      this.currentLoopStartPercent = undefined;
      this.currentLoopEndPercent = undefined;
      this.clearTimelineSliderColoring();
    }

    return;
  }

  const endTime = new Timer().endTime;
  if (!endTime) {
    return;
  }

  const loopStart = settings.engine.startTime || 0;
  const loopAt = settings.engine.loopAtTime || 0;
  const loopStartPercent = loopStart / endTime;
  const loopAtPercent = loopAt / endTime;

  if (
    this.currentLoopStartPercent === loopStartPercent &&
    this.currentLoopEndPercent === loopAtPercent
  ) {
    return;
  }

  this.currentLoopStartPercent = loopStartPercent;
  this.currentLoopEndPercent = loopAtPercent;
  this.clearTimelineSliderColoring();
  this.setTimelineSliderColoredRegion(loopStartPercent, loopAtPercent);
};

ToolUi.prototype.setTimelineSliderColoredRegion = function (
  startPercent,
  endPercent,
  color = '#4CAF50'
) {
  if (!this.timelineSlider) {
    return;
  }

  const startPos = (Math.max(0, Math.min(1, startPercent)) * 100).toFixed(2);
  const endPos = (
    Math.max(startPercent, Math.min(1, endPercent)) * 100
  ).toFixed(2);
  const gradient = `linear-gradient(to right, 
    #333 0%, 
    #333 ${startPos}%, 
    ${color} ${startPos}%, 
    ${color} ${endPos}%, 
    #333 ${endPos}%, 
    #333 100%)`;

  this.timelineSlider.style.setProperty('--timeline-background', gradient);
};

ToolUi.prototype.clearTimelineSliderColoring = function () {
  if (this.timelineSlider) {
    this.timelineSlider.style.removeProperty('--timeline-background');
  }
};

ToolUi.prototype.updateFboPreviews = function () {
  if (this.activeFboPreviews.size === 0) {
    return;
  }

  this.activeFboPreviews.forEach((previewInfo, dialogId) => {
    const { fbo, canvas } = previewInfo;
    if (canvas && canvas.isConnected && fbo) {
      try {
        if (fbo.target?.texture && fbo.color) {
          this._renderFboToCanvas(canvas, fbo);
        }
      } catch (error) {
        loggerWarning(
          `Failed to update FBO preview ${fbo.name}: ${error.message}`
        );
      }
    } else {
      this.activeFboPreviews.delete(dialogId);
    }
  });
};

ToolUi.prototype.initContextMenu = function () {
  document.addEventListener('contextmenu', (e) => {
    if (!settings.engine.tool) {
      return;
    }

    e.preventDefault();
    this.showContextMenu(e.clientX, e.clientY);
  });

  document.addEventListener('click', () => {
    this.closeContextMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      this.closeContextMenu();
    }
  });
};

ToolUi.prototype.setCustomMenuItems = function (items) {
  this.customMenuItems = items;
};

ToolUi.prototype.getMenuItems = function () {
  const timer = new Timer();
  const fbos = Fbo.getFbos();
  const isPaused = timer.isPaused();

  return [
    {
      label: isPaused ? 'Resume' : 'Pause',
      action: () => {
        timer.pause(!isPaused);
      }
    },
    {
      label: 'Check unused files',
      action: () => {
        const toolClient = new ToolClient();
        toolClient.showUnusedFiles();
      }
    },
    {
      label: 'Timer',
      children: [
        {
          label: 'Set StartAt',
          action: () => {
            settings.engine.startTime = timer.getTime();
          }
        },
        {
          label: 'Set LoopAt',
          action: () => {
            settings.engine.loopAtTime = timer.getTime();
          }
        },
        {
          label: 'Reset',
          action: () => {
            settings.engine.startTime = 0;
            settings.engine.loopAtTime = undefined;
          }
        }
      ]
    },
    {
      label: 'FBO',
      children:
        Object.keys(fbos).length > 0
          ? Object.keys(fbos).map((fboName) => ({
              label: fboName,
              action: () => this.showFboDialog(fbos[fboName])
            }))
          : [{ label: 'No FBOs available', disabled: true }]
    },
    ...this.customMenuItems
  ];
};

ToolUi.prototype.showContextMenu = function (x, y) {
  if (!settings.engine.tool) {
    return;
  }

  this.closeContextMenu();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.id = 'contextMenu';

  const menuItemsContainer = document.createElement('div');
  menuItemsContainer.className = 'context-menu-items';

  const items = this.getMenuItems();
  this.buildMenuItems(menuItemsContainer, items, 0);

  menu.appendChild(menuItemsContainer);

  menu.style.visibility = 'hidden';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  document.body.appendChild(menu);
  this.activeMenu = menu;

  const rect = menu.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const maxMenuHeight = Math.floor(viewportHeight * 0.8);
  const menuPadding = 8;

  let finalX = x;
  let finalY = y;

  if (rect.right > viewportWidth) {
    finalX = x - rect.width;
  }

  if (rect.height > maxMenuHeight) {
    menuItemsContainer.style.maxHeight = maxMenuHeight - menuPadding + 'px';
    menuItemsContainer.style.overflowY = 'auto';
    menuItemsContainer.classList.add('scrollable');

    if (finalY + maxMenuHeight > viewportHeight) {
      finalY = Math.max(10, viewportHeight - maxMenuHeight - 10);
    }
  } else {
    if (rect.bottom > viewportHeight) {
      finalY = y - rect.height;
      if (finalY < 0) {
        finalY = Math.max(10, viewportHeight - rect.height - 10);
      }
    }
  }

  menu.style.left = finalX + 'px';
  menu.style.top = finalY + 'px';
  menu.style.visibility = 'visible';
};

ToolUi.prototype.buildMenuItems = function (container, items, level) {
  items.forEach((item) => {
    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    if (item.disabled) {
      menuItem.classList.add('disabled');
    }
    if (item.children) {
      menuItem.classList.add('has-children');
    }

    const label = document.createElement('span');
    label.textContent = item.label;
    menuItem.appendChild(label);

    if (item.children) {
      const arrow = document.createElement('span');
      arrow.className = 'context-menu-arrow';
      arrow.textContent = '▶';
      menuItem.appendChild(arrow);

      let submenuTimeout;
      let submenu;

      menuItem.addEventListener('mouseenter', () => {
        if (submenuTimeout) {
          clearTimeout(submenuTimeout);
          submenuTimeout = null;
        }

        const existingSubmenus = container.querySelectorAll('.context-submenu');
        existingSubmenus.forEach((sub) => {
          if (sub !== submenu) {
            sub.remove();
          }
        });

        submenuTimeout = setTimeout(() => {
          submenu = document.createElement('div');
          submenu.className = 'context-menu context-submenu';

          const submenuItemsContainer = document.createElement('div');
          submenuItemsContainer.className = 'context-menu-items';

          const itemRect = menuItem.getBoundingClientRect();
          submenu.style.left = itemRect.right - 5 + 'px';
          submenu.style.top = itemRect.top + 'px';

          this.buildMenuItems(submenuItemsContainer, item.children, level + 1);
          submenu.appendChild(submenuItemsContainer);

          submenu.style.visibility = 'hidden';
          document.body.appendChild(submenu);

          const submenuRect = submenu.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
          const maxSubmenuHeight = Math.floor(viewportHeight * 0.8);

          let finalLeft = itemRect.right - 5;
          let finalTop = itemRect.top;

          if (submenuRect.right > viewportWidth) {
            finalLeft = itemRect.left - submenuRect.width + 5;
          }

          if (submenuRect.height > maxSubmenuHeight) {
            submenuItemsContainer.style.maxHeight = maxSubmenuHeight - 8 + 'px';
            submenuItemsContainer.style.overflowY = 'auto';
            submenuItemsContainer.classList.add('scrollable');

            if (finalTop + maxSubmenuHeight > viewportHeight) {
              finalTop = Math.max(10, viewportHeight - maxSubmenuHeight - 10);
            }
          } else {
            if (submenuRect.bottom > viewportHeight) {
              finalTop = Math.max(10, viewportHeight - submenuRect.height - 10);
            }
          }

          submenu.style.left = finalLeft + 'px';
          submenu.style.top = finalTop + 'px';
          submenu.style.visibility = 'visible';
        }, 200);
      });

      menuItem.addEventListener('mouseleave', () => {
        if (submenuTimeout) {
          clearTimeout(submenuTimeout);
          submenuTimeout = null;
        }
      });
    }

    if (item.action && !item.disabled) {
      menuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        item.action();
        this.closeContextMenu();
      });
    }

    container.appendChild(menuItem);
  });
};

ToolUi.prototype.closeContextMenu = function () {
  if (this.activeMenu) {
    this.activeMenu.remove();
    this.activeMenu = null;
  }

  const submenus = document.querySelectorAll('.context-submenu');
  submenus.forEach((submenu) => submenu.remove());
};

ToolUi.prototype.showFboDialog = function (fbo) {
  if (!fbo) {
    this.alert('FBO not found');
    return;
  }

  let canvasWidth = 512;
  let canvasHeight = 512;

  if (fbo.color?.image) {
    canvasWidth = fbo.color.image.width || 512;
    canvasHeight = fbo.color.image.height || 512;
  } else if (fbo.target) {
    canvasWidth = fbo.target.width || 512;
    canvasHeight = fbo.target.height || 512;
  }

  const maxSize = 800;
  const scale = Math.min(1, maxSize / Math.max(canvasWidth, canvasHeight));
  const displayWidth = Math.floor(canvasWidth * scale);
  const displayHeight = Math.floor(canvasHeight * scale);

  const dialogId = 'fboDialog_' + fbo.name;

  this.createModalDialog({
    overlayId: dialogId,
    title: `FBO: ${fbo.name} (${canvasWidth}×${canvasHeight})`,
    width: Math.min(displayWidth + 100, 900) + 'px',
    content: [
      {
        type: 'canvas',
        name: 'fboCanvas',
        width: displayWidth,
        height: displayHeight,
        style: {
          border: '2px solid #666',
          margin: '10px 0',
          maxWidth: '100%',
          backgroundColor: '#222'
        }
      }
    ],
    buttons: [
      {
        text: 'Close',
        callback: () => {
          this.closeFboDialog(dialogId);
        }
      }
    ]
  });

  setTimeout(() => {
    const modalCanvas = document.querySelector(`#${dialogId} .modal-canvas`);
    if (modalCanvas) {
      this.activeFboPreviews.set(dialogId, {
        fbo: fbo,
        canvas: modalCanvas
      });

      new DemoRenderer().setRenderNeedsUpdate(true);
    }
  }, 100);
};

ToolUi.prototype.closeFboDialog = function (dialogId) {
  if (this.activeFboPreviews.has(dialogId)) {
    this.activeFboPreviews.delete(dialogId);
  }

  this.closeModalDialog();
};

ToolUi.prototype._renderFboToCanvas = function (canvas, fbo) {
  const tempRenderer = settings.createRenderer(canvas);
  try {
    tempRenderer.setSize(canvas.width, canvas.height, false);
    tempRenderer.setPixelRatio(1);

    tempRenderer.setViewport(0, 0, canvas.width, canvas.height);
    tempRenderer.setScissorTest(true);
    tempRenderer.setScissor(0, 0, canvas.width, canvas.height);

    const camera = fbo.camera.clone();
    camera.aspect = canvas.width / canvas.height;
    camera.updateProjectionMatrix();

    tempRenderer.clear();
    tempRenderer.render(fbo.scene, camera);
  } catch (err) {
    loggerWarning(`Failed to render FBO ${fbo.name}: ${err.message}`);
  } finally {
    if (tempRenderer && tempRenderer.dispose) {
      tempRenderer.dispose();
    }
  }
};

ToolUi.prototype._takeCanvasScreenshot = function (canvas) {
  Utils.takeCanvasScreenshot(canvas);
};

ToolUi.prototype.closeModalDialog = function () {
  if (this.activeDialog) {
    const overlay = document.getElementById(this.activeDialog.config.overlayId);
    if (overlay) {
      overlay.remove();
    }
    this.activeDialog = null;
  }
};

ToolUi.prototype.createModalDialog = function (config) {
  if (config.overlayId) {
    const existingOverlay = document.getElementById(config.overlayId);
    if (existingOverlay) {
      existingOverlay.remove();
    }
  }

  this.activeDialog = {
    config: config,
    type: config.type || 'dialog',
    elements: {}
  };

  const overlay = document.createElement('div');
  if (config.overlayId) {
    overlay.id = config.overlayId;
  }
  overlay.className = 'modal-overlay';

  const container = document.createElement('div');
  container.className = 'modal-container';

  if (config.width) {
    container.style.width = config.width;
  }
  if (config.height) {
    container.style.height = config.height;
  }
  if (config.maxWidth) {
    container.style.maxWidth = config.maxWidth;
  }
  if (config.maxHeight) {
    container.style.maxHeight = config.maxHeight;
  }

  const titleBar = document.createElement('div');
  titleBar.className = 'modal-title-bar';
  titleBar.style.cursor = 'move';
  titleBar.textContent = config.title || 'Dialog';
  if (config.titleSize) {
    titleBar.style.fontSize = config.titleSize;
  }
  container.appendChild(titleBar);

  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  titleBar.addEventListener('mousedown', (e) => {
    if (e.target === titleBar) {
      isDragging = true;
      const containerRect = container.getBoundingClientRect();
      dragOffset.x = e.clientX - containerRect.left;
      dragOffset.y = e.clientY - containerRect.top;
      container.style.position = 'absolute';
      container.style.left = containerRect.left + 'px';
      container.style.top = containerRect.top + 'px';
      overlay.style.alignItems = 'flex-start';
      overlay.style.justifyContent = 'flex-start';
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) {
      return;
    }

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const maxX = window.innerWidth - containerWidth;
    const maxY = window.innerHeight - containerHeight;

    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));

    container.style.left = clampedX + 'px';
    container.style.top = clampedY + 'px';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  const contentArea = document.createElement('div');
  contentArea.className = 'modal-content';
  container.appendChild(contentArea);

  if (config.content) {
    this._addContentToDialog(contentArea, config.content, this.activeDialog);
  }

  if (config.text && !config.content) {
    const textElement = document.createElement('div');
    textElement.className = 'modal-text';
    textElement.textContent = config.text;
    contentArea.appendChild(textElement);
  }

  if (config.input && !config.content) {
    const input = this._createInputElement({
      type: 'text',
      value: config.input.value || '',
      maxLength: config.input.maxLength || 100,
      name: 'input'
    });
    contentArea.appendChild(input);
    this.activeDialog.elements.input = input;
  }

  if (config.buttons && config.buttons.length > 0) {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'modal-button-container';
    if (config.buttonGap) buttonContainer.style.gap = config.buttonGap;

    config.buttons.forEach((buttonConfig, index) => {
      const button = document.createElement('button');
      button.textContent = buttonConfig.text;
      button.className = 'modal-button';

      if (buttonConfig.padding) {
        button.style.padding = buttonConfig.padding;
      }
      if (buttonConfig.fontSize) {
        button.style.fontSize = buttonConfig.fontSize;
      }
      if (buttonConfig.color) {
        button.style.backgroundColor = buttonConfig.color;
      }

      button.onclick = () => {
        if (buttonConfig.callback) {
          const formData = this._getFormData(this.activeDialog.elements);
          buttonConfig.callback(formData, this.activeDialog.elements);
        }
      };

      buttonContainer.appendChild(button);
      this.activeDialog.elements[`button_${index}`] = button;
    });

    container.appendChild(buttonContainer);
  }

  overlay.appendChild(container);
  document.body.appendChild(overlay);

  const firstInput = contentArea.querySelector('input, textarea, select');
  if (firstInput) {
    setTimeout(() => {
      firstInput.focus();
      if (firstInput.type === 'text' || firstInput.type === 'textarea') {
        firstInput.select();
      }
    }, 100);
  }

  return {
    overlay,
    container,
    contentArea,
    elements: this.activeDialog.elements
  };
};

ToolUi.prototype._addContentToDialog = function (
  contentArea,
  content,
  dialogState
) {
  content.forEach((item, index) => {
    let element = null;
    const itemName = item.name || `item_${index}`;

    switch (item.type) {
      case 'text':
        element = document.createElement('div');
        element.className = 'modal-text';
        element.textContent = item.value || '';
        if (item.style) Object.assign(element.style, item.style);
        break;

      case 'html':
        element = document.createElement('div');
        element.className = 'modal-html';
        element.innerHTML = item.value || '';
        if (item.style) Object.assign(element.style, item.style);
        break;

      case 'texture':
      case 'canvas':
        element = document.createElement('canvas');
        element.className = 'modal-canvas';
        if (item.width) element.width = item.width;
        if (item.height) element.height = item.height;
        if (item.style) Object.assign(element.style, item.style);

        element.addEventListener('click', () => {
          this._takeCanvasScreenshot(element);
        });

        element.style.cursor = 'pointer';
        element.title = 'Take screenshot';

        if (item.texture && item.texture.isTexture) {
          this._renderTextureToCanvas(element, item.texture);
        } else if (item.renderer && item.scene && item.camera) {
          item.renderer.render(item.scene, item.camera);
          const ctx = element.getContext('2d');
          ctx.drawImage(
            item.renderer.domElement,
            0,
            0,
            element.width,
            element.height
          );
        }
        break;

      case 'input':
        element = this._createInputElement(item);
        break;

      case 'checkbox':
        element = this._createCheckboxElement(item);
        break;

      case 'radio':
        element = this._createRadioElement(item);
        break;

      case 'select':
        element = this._createSelectElement(item);
        break;

      case 'textarea':
        element = this._createTextareaElement(item);
        break;

      case 'range':
        element = this._createRangeElement(item);
        break;

      case 'separator':
        element = document.createElement('hr');
        element.className = 'modal-separator';
        if (item.style) Object.assign(element.style, item.style);
        break;

      default:
        loggerWarning(`Unknown modal content type: ${item.type}`);
        return;
    }

    if (element) {
      if (item.label && item.type !== 'text' && item.type !== 'html') {
        const wrapper = document.createElement('div');
        wrapper.className = 'modal-field-wrapper';

        const label = document.createElement('label');
        label.className = 'modal-label';
        label.textContent = item.label;
        wrapper.appendChild(label);
        wrapper.appendChild(element);

        contentArea.appendChild(wrapper);
        dialogState.elements[itemName] = element;
      } else {
        contentArea.appendChild(element);
        dialogState.elements[itemName] = element;
      }

      if (
        ['input', 'checkbox', 'radio', 'select', 'textarea', 'range'].includes(
          item.type
        )
      ) {
        element.addEventListener('change', () => {
          if (item.onChange) {
            const formData = this._getFormData(dialogState.elements);
            item.onChange(element.value, formData, dialogState.elements);
          }
        });
      }
    }
  });
};

ToolUi.prototype._createInputElement = function (config) {
  const input = document.createElement('input');
  input.type = config.inputType || 'text';
  input.className = 'modal-input';
  if (config.value !== undefined) {
    input.value = config.value;
  }
  if (config.placeholder) {
    input.placeholder = config.placeholder;
  }
  if (config.maxLength) {
    input.maxLength = config.maxLength;
  }
  if (config.min !== undefined) {
    input.min = config.min;
  }
  if (config.max !== undefined) {
    input.max = config.max;
  }
  if (config.step) {
    input.step = config.step;
  }
  if (config.style) {
    Object.assign(input.style, config.style);
  }
  return input;
};

ToolUi.prototype._createCheckboxElement = function (config) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'modal-checkbox';
  checkbox.checked = config.checked || false;
  if (config.value !== undefined) {
    checkbox.value = config.value;
  }
  if (config.style) {
    Object.assign(checkbox.style, config.style);
  }
  return checkbox;
};

ToolUi.prototype._createRadioElement = function (config) {
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.className = 'modal-radio';
  radio.name = config.group || 'radioGroup';
  radio.value = config.value || '';
  radio.checked = config.checked || false;
  if (config.style) {
    Object.assign(radio.style, config.style);
  }
  return radio;
};

ToolUi.prototype._createSelectElement = function (config) {
  const select = document.createElement('select');
  select.className = 'modal-select';

  if (config.options) {
    config.options.forEach((option) => {
      const optElement = document.createElement('option');
      optElement.value = option.value || option;
      optElement.textContent = option.text || option;
      if (option.selected) {
        optElement.selected = true;
      }
      select.appendChild(optElement);
    });
  }

  if (config.style) {
    Object.assign(select.style, config.style);
  }
  return select;
};

ToolUi.prototype._createTextareaElement = function (config) {
  const textarea = document.createElement('textarea');
  textarea.className = 'modal-textarea';
  if (config.value !== undefined) {
    textarea.value = config.value;
  }
  if (config.placeholder) {
    textarea.placeholder = config.placeholder;
  }
  if (config.rows) {
    textarea.rows = config.rows;
  }
  if (config.cols) {
    textarea.cols = config.cols;
  }
  if (config.style) {
    Object.assign(textarea.style, config.style);
  }
  return textarea;
};

ToolUi.prototype._createRangeElement = function (config) {
  const range = document.createElement('input');
  range.type = 'range';
  range.className = 'modal-range';
  if (config.min !== undefined) {
    range.min = config.min;
  }
  if (config.max !== undefined) {
    range.max = config.max;
  }
  if (config.step) {
    range.step = config.step;
  }
  if (config.value !== undefined) {
    range.value = config.value;
  }
  if (config.style) {
    Object.assign(range.style, config.style);
  }

  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'modal-range-value';
  valueDisplay.textContent = range.value;

  range.addEventListener('input', () => {
    valueDisplay.textContent = range.value;
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'modal-range-wrapper';
  wrapper.appendChild(range);
  wrapper.appendChild(valueDisplay);

  return wrapper;
};

ToolUi.prototype._renderTextureToCanvas = function (canvas, texture) {
  const ctx = canvas.getContext('2d');
  if (texture.image && texture.image.complete) {
    ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
  } else if (texture.image) {
    texture.image.onload = () => {
      ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
    };
  }
};

ToolUi.prototype._getFormData = function (elements) {
  const data = {};

  Object.keys(elements).forEach((key) => {
    const element = elements[key];
    if (!element || key.startsWith('button_')) {
      return;
    }

    if (element.type === 'checkbox') {
      data[key] = element.checked;
    } else if (element.type === 'radio') {
      if (element.checked) {
        data[element.name] = element.value;
      }
    } else if (element.value !== undefined) {
      data[key] = element.value;
    }
  });

  return data;
};

ToolUi.prototype.isDialogOpen = function () {
  return this.activeDialog;
};

ToolUi.prototype.defaultModalDialogAction = function (text) {
  if (this.activeDialog) {
    this.activeDialog.config?.buttons.forEach((buttonConfig) => {
      if (
        buttonConfig.callback &&
        (buttonConfig.text === text || text === undefined)
      ) {
        buttonConfig.callback();
      }
    });
  }

  this.closeModalDialog();
};

ToolUi.prototype.alert = function (message, cb) {
  const toolUi = this;
  this.createModalDialog({
    overlayId: 'guiAlertOverlay',
    title: 'Alert',
    content: [
      {
        type: 'text',
        value: message
      }
    ],
    buttons: [
      {
        text: 'OK',
        callback: () => {
          toolUi.closeModalDialog();
          if (cb) {
            cb();
          }
        }
      }
    ]
  });
};

window.DemoEngine = window.DemoEngine || {};
window.DemoEngine.ToolUi = ToolUi;
window.DemoEngine.setDebugText = new ToolUi().setDebugText.bind(new ToolUi());

export { ToolUi };
