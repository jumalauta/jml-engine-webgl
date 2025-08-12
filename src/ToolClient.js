import {
  loggerTrace,
  loggerInfo,
  loggerWarning,
  loggerDebug
} from './Bindings';
import { setWaitingForFrame } from './main';
import { Settings } from './Settings';
import { FileManager } from './FileManager';

const settings = new Settings();

const STATE = {
  NOT_CONNECTED: 0,
  CONNECTING: 1,
  CONNECTED: 2
};

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

ToolClient.prototype.isConnected = function () {
  return this.state === STATE.CONNECTED;
};

ToolClient.prototype.init = function () {
  if (!this.isEnabled()) {
    return;
  }
  if (this.state && this.state !== STATE.NOT_CONNECTED) {
    loggerDebug(
      'ToolClient already initialized or connecting, not initializing again'
    );
    return;
  }

  this.state = STATE.CONNECTING;
  this.buffer = [];
  this.maxBufferedAmount = settings.tool.client.maxBufferedAmount;

  this.client = new WebSocket(
    `${settings.tool.server.uriScheme}://${settings.tool.server.host}:${settings.tool.server.port}`
  );

  this.client.onopen = () => {
    try {
      this.client.send(JSON.stringify({ type: 'CONNECT' }));
    } catch (e) {
      loggerWarning('Failed to send CONNECT: ' + e);
    }
  };

  this.client.onmessage = (data) => {
    const event = JSON.parse(data.data);
    if (event.type === 'HELLO') {
      loggerTrace('Received HELLO from server');
      this.synchronizeSettings();
    } else if (event.type === 'FS_FILE_CHANGED') {
      try {
        const fileManager = new FileManager();
        fileManager.setFileChanged(
          event.path,
          event.content,
          event.diffContent
        );
      } catch (e) {
        loggerWarning('Failed to handle FS_FILE_CHANGED: ' + e);
      }
    } else if (event.type === 'CAPTURE_FRAME_SUCCESS') {
      setWaitingForFrame(true);
    } else {
      if (!event.type.endsWith('_SUCCESS')) {
        console.log('SERVER MESSAGE', data);
      }
    }
  };

  this.client.onclose = (event) => {
    console.log('SERVER CLOSE', event);
    this.state = STATE.NOT_CONNECTED;
    this.buffer = [];
  };

  this.client.onerror = (event) => {
    console.log('SERVER ERROR', event);
  };
};

ToolClient.prototype.synchronizeSettings = function () {
  try {
    if (this.state === STATE.CONNECTED) {
      this.client.send(
        JSON.stringify({ type: 'SETTINGS', settings: settings.asObject() })
      );
    } else if (this.state === STATE.CONNECTING) {
      this.state = STATE.CONNECTED;

      this.client.send(
        JSON.stringify({ type: 'SETTINGS', settings: settings.asObject() })
      );

      this.flushBufferedMessages();
    }
  } catch (e) {
    loggerWarning('Failed to send SETTINGS: ' + e);
  }
};

ToolClient.prototype.flushBufferedMessages = function () {
  if (this.state !== STATE.CONNECTED) {
    throw new Error(
      `Client not connected. Invalid state to flush buffered messages: ${this.state}`
    );
  }

  loggerTrace(`Sending buffered ${this.buffer.length} messages to server`);
  while (this.buffer.length > 0) {
    const msg = this.buffer.shift();
    try {
      this.client.send(JSON.stringify(msg));
    } catch (e) {
      loggerWarning('Failed to flush buffered message: ' + e);
      break;
    }
  }
};

ToolClient.prototype.send = function (message) {
  if (this.state === STATE.NOT_CONNECTED || !this.client) {
    throw new Error(
      `Client is not connected, cannot send message to server: ${JSON.stringify(message)}`
    );
  }

  if (this.state === STATE.CONNECTED) {
    if (!this.canQueueMessage()) {
      loggerInfo(
        `Cannot queue message, client not ready or queue full: ${message.type}`
      );
      return false;
    }
    if (
      message.type !== 'CAPTURE_FRAME' &&
      message.type !== 'SETTINGS' &&
      !message.type.startsWith('FS_')
    ) {
      loggerTrace(`Sending message to server: ${JSON.stringify(message)}`);
    }
    try {
      this.client.send(JSON.stringify(message));
    } catch (e) {
      loggerWarning(`Failed to send message to server: ${e}`);
      return false;
    }
  } else if (this.state === STATE.CONNECTING) {
    if (!this.buffer) {
      this.buffer = [];
    }
    this.buffer.push(message);
  }

  return true;
};

ToolClient.prototype.canQueueMessage = function () {
  if (this.state !== STATE.CONNECTED || !this.client) {
    return false;
  }
  if (this.client.bufferedAmount > this.maxBufferedAmount) {
    return false;
  }
  return true;
};

export { ToolClient };
