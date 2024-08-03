import { loggerTrace } from './Bindings';
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

ToolClient.prototype.init = function () {
  this.client = new WebSocket(
    `${settings.tool.uriScheme}://${settings.tool.host}:${settings.tool.port}`
  );

  this.client.onopen = (event) => {
    this.client.send(JSON.stringify({ type: 'CONNECT' }));
  };

  this.client.onmessage = (data) => {
    const event = JSON.parse(data.data);
    if (event.type === 'HELLO') {
      loggerTrace('Connected to server');
    } else if (event.type === 'CAPTURE_FRAME_SUCCESS') {
      setWaitingForFrame(true);
    } else {
      console.log('SERVER MESSAGE', data);
    }
  };

  this.client.onclose = (event) => {
    console.log('SERVER CLOSE', event);
  };

  this.client.onerror = (event) => {
    console.log('SERVER ERROR', event);
  };
};

ToolClient.prototype.send = function (message) {
  if (message.type !== 'CAPTURE_FRAME') {
    loggerTrace(`Sending message to server: ${JSON.stringify(message)}`);
  }

  this.client.send(JSON.stringify(message));
};

export { ToolClient };
