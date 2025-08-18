import {
  loggerTrace,
  loggerInfo,
  loggerWarning,
  loggerDebug
} from './Bindings';
import { setWaitingForFrame, stopDemo } from './main';
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
  this.requestId = 1;
  this.pendingRequests = new Map();
  this.maxBufferedAmount = settings.tool.client.maxBufferedAmount;

  this.client = new WebSocket(
    `${settings.tool.server.uriScheme}://${settings.tool.server.host}:${settings.tool.server.port}`
  );

  this.client.onopen = () => {
    try {
      const connectMsg = {
        jsonrpc: '2.0',
        method: 'connect',
        id: this.nextRequestId()
      };
      this.client.send(JSON.stringify(connectMsg));
    } catch (e) {
      loggerWarning('Failed to send connect: ' + e);
    }
  };

  this.client.onmessage = (data) => {
    try {
      const msg = JSON.parse(data.data);

      if (msg.jsonrpc === '2.0') {
        if (msg.method) {
          this.handleNotification(msg);
        } else if (msg.id !== undefined) {
          this.handleResponse(msg);
        }
      } else {
        loggerWarning(
          'Received non JSON-RPC message, ignoring: ' + JSON.stringify(msg)
        );
      }
    } catch (e) {
      loggerWarning('Failed to parse server message: ' + e);
    }
  };

  this.client.onclose = (event) => {
    console.log('SERVER CLOSE', event);
    this.state = STATE.NOT_CONNECTED;
    this.buffer = [];
    this.pendingRequests.clear();
  };

  this.client.onerror = (event) => {
    console.log('SERVER ERROR', event);
  };
};

ToolClient.prototype.nextRequestId = function () {
  return this.requestId++;
};

ToolClient.prototype.handleNotification = function (msg) {
  const { method, params } = msg;

  if (method === 'hello') {
    loggerTrace('Received hello notification');
    this.synchronizeSettings();
  } else if (method === 'fs.fileChanged') {
    try {
      const fileManager = new FileManager();
      fileManager.setFileChanged(
        params.path,
        params.content,
        params.diffContent
      );
    } catch (e) {
      loggerWarning('Failed to handle fs.fileChanged: ' + e);
    }
  } else if (method === 'capture.writeReady') {
    loggerTrace('Capture write ready');
  } else if (method === 'capture.success') {
    loggerInfo('Capture completed successfully');
  } else if (method === 'capture.error') {
    loggerWarning('Capture error: ' + (params?.message || 'Unknown error'));
  } else if (method === 'disconnect') {
    loggerInfo('Server requested disconnect');
    if (settings.tool.client.stopOnDisconnect) {
      stopDemo();
    }
  } else {
    loggerTrace(`Unknown notification: ${method}`);
  }
};

ToolClient.prototype.handleResponse = function (msg) {
  const { id, result, error } = msg;

  if (this.pendingRequests.has(id)) {
    const { resolve, reject } = this.pendingRequests.get(id);
    this.pendingRequests.delete(id);

    if (error) {
      reject(new Error(`${error.message} (code: ${error.code})`));
    } else {
      resolve(result);

      if (result && result.status === 'written') {
        setWaitingForFrame(true);
      }
    }
  }
};

ToolClient.prototype.synchronizeSettings = function () {
  try {
    if (this.state === STATE.CONNECTING) {
      const settingsRequest = {
        jsonrpc: '2.0',
        method: 'settings',
        params: { settings: settings.asObject() },
        id: this.nextRequestId()
      };

      this.client.send(JSON.stringify(settingsRequest));
      this.state = STATE.CONNECTED;
      this.flushBufferedMessages();
    } else if (this.state === STATE.CONNECTED) {
      const settingsRequest = {
        jsonrpc: '2.0',
        method: 'settings',
        params: { settings: settings.asObject() }
      };
      this.client.send(JSON.stringify(settingsRequest));
    }
  } catch (e) {
    loggerWarning('Failed to send settings: ' + e);
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

ToolClient.prototype.request = function (method, params = null) {
  return new Promise((resolve, reject) => {
    if (this.state === STATE.NOT_CONNECTED) {
      reject(new Error('Client not connected'));
      return;
    }

    const id = this.nextRequestId();
    const request = {
      jsonrpc: '2.0',
      method,
      id
    };

    if (params) {
      request.params = params;
    }

    this.pendingRequests.set(id, { resolve, reject });

    if (this.state === STATE.CONNECTED) {
      try {
        this.client.send(JSON.stringify(request));
      } catch (e) {
        this.pendingRequests.delete(id);
        reject(new Error(`Failed to send request: ${e.message}`));
      }
    } else if (this.state === STATE.CONNECTING) {
      this.buffer.push(request);
    }
  });
};

ToolClient.prototype.notify = function (method, params = null) {
  if (this.state === STATE.NOT_CONNECTED) {
    throw new Error('Client not connected');
  }

  const notification = {
    jsonrpc: '2.0',
    method
  };

  if (params) {
    notification.params = params;
  }

  if (this.state === STATE.CONNECTED) {
    try {
      this.client.send(JSON.stringify(notification));
      return true;
    } catch (e) {
      loggerWarning(`Failed to send notification: ${e.message}`);
      return false;
    }
  } else if (this.state === STATE.CONNECTING) {
    this.buffer.push(notification);
    return true;
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
      loggerInfo(`Cannot queue message, client not ready or queue full`);
      return false;
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
