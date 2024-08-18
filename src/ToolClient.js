import { loggerTrace, loggerWarning } from './Bindings';
import { setWaitingForFrame } from './main';
import { Settings } from './Settings';

const settings = new Settings();

const ToolClient = function () {
  return this.getInstance();
};

ToolClient.prototype.getInstance = function () {
  if (!ToolClient.prototype._singletonInstance) {
    ToolClient.prototype._singletonInstance = this;
  }

  return ToolClient.prototype._singletonInstance;
};

ToolClient.prototype.isEnabled = function () {
  if (settings.tool.server.enabled && settings.engine.tool) {
    return true;
  }

  return false;
};

ToolClient.prototype.init = function () {
  if (!this.isEnabled()) {
    return;
  }

  this.connected = false;

  this.client = new WebSocket(
    `${settings.tool.server.uriScheme}://${settings.tool.server.host}:${settings.tool.server.port}`
  );

  this.client.onopen = () => {
    this.client.send(JSON.stringify({ type: 'CONNECT' }));
    this.connected = true;
  };

  this.client.onmessage = (data) => {
    const event = JSON.parse(data.data);
    if (event.type === 'HELLO') {
      loggerTrace('Connected to server');
      this.synchronizeSettings();
    } else if (event.type === 'CAPTURE_FRAME_SUCCESS') {
      setWaitingForFrame(true);
    } else {
      console.log('SERVER MESSAGE', data);
    }
  };

  this.client.onclose = (event) => {
    console.log('SERVER CLOSE', event);
    this.connected = false;
  };

  this.client.onerror = (event) => {
    console.log('SERVER ERROR', event);
  };
};

ToolClient.prototype.synchronizeSettings = function () {
  if (this.connected) {
    this.send({ type: 'SETTINGS', settings: settings.asObject() });
  }
};

ToolClient.prototype.send = function (message) {
  if (!this.connected) {
    throw new Error(
      `Client is not connected, cannot send message to server: ${JSON.stringify(message)}`
    );
  }

  if (message.type !== 'CAPTURE_FRAME' && message.type !== 'SETTINGS') {
    loggerTrace(`Sending message to server: ${JSON.stringify(message)}`);
  }

  try {
    this.client.send(JSON.stringify(message));
  } catch (e) {
    loggerWarning(`Failed to send message to server: ${e}`);
  }
};

export { ToolClient };
