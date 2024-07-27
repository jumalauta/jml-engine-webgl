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
  this.client = new WebSocket('ws://localhost:7447/');

  this.client.onopen = (event) => {
    this.client.send(JSON.stringify({ type: 'CONNECT' }));
  };

  this.client.onmessage = (event) => {
    console.log('SERVER MESSAGE', event);
  };

  this.client.onclose = (event) => {
    console.log('SERVER CLOSE', event);
  };

  this.client.onerror = (event) => {
    console.log('SERVER ERROR', event);
  };
};

ToolClient.prototype.send = function (message) {
  this.client.send(JSON.stringify(message));
};

export { ToolClient };
