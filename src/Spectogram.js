import { Image } from './Image';
import { Fbo } from './Fbo';
import { Settings } from './Settings';
import { loggerTrace } from './Bindings';
import { FileManager } from './FileManager';
import { DemoRenderer } from './DemoRenderer';
import { Timer } from './Timer';

const settings = new Settings();

const Spectogram = function () {
  return this.getInstance();
};

Spectogram.prototype.getInstance = function () {
  if (!Spectogram.prototype._singletonInstance) {
    Spectogram.prototype._singletonInstance = this;
  }

  return Spectogram.prototype._singletonInstance;
};

Spectogram.prototype.init = async function () {
  this.spectogramPath = settings.demo.music.spectogramFile;
  this.available = false;

  try {
    if (this.spectogramPath) {
      if (this.spectogramImage && this.spectogramImage.mesh) {
        this.spectogramImage.mesh.remove();
      }

      this.spectogramImage = new Image();
      await this.spectogramImage.load(this.spectogramPath);

      this.fbo = Fbo.init('spectogram');
      this.fbo.scene.add(this.spectogramImage.mesh);

      this.readBuffer = new Uint8Array(4 * this.fbo.target.height);
    }

    this.available = true;
  } catch (e) {
    loggerTrace('Not loading spectogram: ' + e);
  }
};

Spectogram.prototype.show = function (visible) {
  if (!settings.engine.tool) {
    return;
  }

  const panel = document.getElementById('panel');
  if (panel) {
    if (!visible || !this.available) {
      panel.style.backgroundImage = null;
    } else if (visible && this.spectogramPath) {
      const fileManager = new FileManager();
      panel.style.backgroundImage = `url(${fileManager.getPath(this.spectogramPath)})`;
    }
  }
};

Spectogram.prototype.update = function () {
  if (this.available && this.spectogramPath) {
    const timer = new Timer();
    const x = Math.floor(timer.getTimePercent() * this.fbo.target.width);

    const demoRenderer = new DemoRenderer();

    demoRenderer.renderer.setRenderTarget(this.fbo.target);
    demoRenderer.renderer.clear();
    demoRenderer.renderer.render(this.fbo.scene, this.fbo.camera);

    const gl = demoRenderer.renderer.getContext();
    gl.readPixels(
      x,
      0,
      1,
      this.fbo.target.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.readBuffer
    );

    demoRenderer.renderer.setRenderTarget(null);
  }
};

export { Spectogram };
