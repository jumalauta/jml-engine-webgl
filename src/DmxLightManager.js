// FIXME: maybe make this working for Instanssi'25 or so?

/*
const lightCount = 36;
const host = "127.0.0.1";
const port = "9910";

var socket = new WebSocket("ws://"+host+":"+port);
var timeout = undefined;
socket.onclose = function (event) {
  alert("Socket closed!");
  console.log("Socket closed! ", event);
  clearTimeout(timeout);
}
socket.onerror = function (event) {
  console.log("Socket error! ", event);
}

socket.onmessage = function incoming(data) {
  console.log("received:", data);
};

socket.onopen = function (event) {
  var headerLength = 1 + 5;
  var data = new Uint8Array(headerLength + 6 * lightCount);
  data[0] = 1;
  data[1] = 0;  // Nick tag
  data[2] = 74; // J
  data[3] = 77; // M
  data[4] = 76; // L
  data[5] = 0;  // Nick tag end

  var packets = 0;
  function lightingLoop() {
    for(let i = 0; i < lightCount; i++) {
      var p = headerLength + 6 * i;
      data[p + 0] = 1; // Tehosteen tyyppi on yksi eli valo
      data[p + 1] = i; // Ensimmäinen valo löytyy indeksistä nolla
      data[p + 2] = 0; // Laajennustavu. Aina nolla.
      data[p + 3] = 0; // Punainen
      data[p + 4] = 0; // Vihreä
      data[p + 5] = 0; // Sininen
    }

    var v = Math.floor(Math.random() * lightCount);
    var p = headerLength + 6 * v;
    data[p + 1] = v; // Ensimmäinen valo löytyy indeksistä nolla
    data[p + 3] = Math.floor(Math.random() * 255); // Punainen
    data[p + 4] = Math.floor(Math.random() * 255); // Vihreä
    data[p + 5] = Math.floor(Math.random() * 255); // Sininen

    packets++;

    if (socket.bufferedAmount > data.byteLength) {
      // puskuri kerääntyy
      console.log(packets + ", socket send buffer: " + socket.bufferedAmount);
    }

    socket.send(data);

    var str = "Osoite: " + host + ":" + port + "<br/>"
      + "Paketteja: " + packets + "<br/>"
      + "Paketin koko: " + data.byteLength + "<br/>"
      + "Puskuroitu data: " + socket.bufferedAmount + "<br/>"

    document.getElementById("content").innerHTML = str;

    timeout = setTimeout(lightingLoop, 10);
  }

  lightingLoop();
};
*/

const DmxLightManager = function () {
  // this.sock = new Socket();
  // this.sock.setType(SocketType.UDP);
  this.lightCount = 0;
  this.headerSize = 10;

  this.dataPacket = undefined;
};

DmxLightManager.prototype.deinit = function () {
  // this.sock.closeConnection();
  // this.sock.delete();
};

DmxLightManager.prototype.isInitialized = function () {
  return this.lightCount > 0;
};

DmxLightManager.prototype.setHost = function (host) {};

DmxLightManager.prototype.setPort = function () {};

DmxLightManager.prototype.init = function (lightCount) {
  /* if (!this.sock.establishConnection()) {
        loggerWarning("could not connect to DMX lights!");
    } */

  this.lightCount = lightCount;

  // Protocol: https://github.com/Instanssi/effectserver
  this.dataPacket = new Uint8Array(this.headerSize + 6 * this.lightCount);
  this.dataPacket[0] = 1; // spec version
  this.dataPacket[1] = 0; // nick tag start
  this.dataPacket[2] = 'J'.charCodeAt(0);
  this.dataPacket[3] = 'M'.charCodeAt(0);
  this.dataPacket[4] = 'L'.charCodeAt(0);
  this.dataPacket[5] = 'S'.charCodeAt(0);
  this.dataPacket[6] = 'A'.charCodeAt(0);
  this.dataPacket[7] = 'F'.charCodeAt(0);
  this.dataPacket[8] = 'E'.charCodeAt(0);
  this.dataPacket[9] = 0; // nick tag end

  for (let i = 0; i < this.lightCount; i++) {
    const light = this.headerSize + 6 * i;
    this.dataPacket[light + 0] = 1; // type = light
    this.dataPacket[light + 1] = i; // light id
    this.dataPacket[light + 2] = 0; // light type (0 = RGB)
    this.dataPacket[light + 3] = 0x00; // Red
    this.dataPacket[light + 4] = 0x00; // Green
    this.dataPacket[light + 5] = 0x00; // Blue
  }

  // just ensure that there will be black in the begin
  for (let i = 0; i < 3; i++) {
    this.setColor(0x00, 0x00, 0x00, 0, this.lightCount);
    this.sendData();
  }
};

DmxLightManager.prototype.setColor = function (
  r,
  g,
  b,
  lightIdStart,
  lightIdEnd
) {
  if (lightIdStart === undefined) {
    lightIdStart = 0;
  }
  if (lightIdEnd === undefined) {
    lightIdEnd = this.lightCount;
  } else if (lightIdEnd > this.lightCount) {
    lightIdEnd = this.lightCount;
  }

  for (let i = 0; i < this.lightCount; i++) {
    const light = this.headerSize + 6 * i;
    if (i >= lightIdStart && i < lightIdEnd) {
      this.dataPacket[light + 3] = r; // Red
      this.dataPacket[light + 4] = g; // Green
      this.dataPacket[light + 5] = b; // Blue
    } else {
      this.dataPacket[light + 3] = 0x00; // Red
      this.dataPacket[light + 4] = 0x00; // Green
      this.dataPacket[light + 5] = 0x00; // Blue
    }
  }
};

DmxLightManager.prototype.sendData = function () {
  /* //loggerWarning("PRKL! " + JSON.stringify(this.dataPacket,null,2));
    // NOTE: Sending all light data every time (mitigating possible UDP issues, like missing packets)
    if (!this.sock.sendData(this.dataPacket)) {
        // small retry mechanism
        loggerWarning("Data send failed, retrying once");
        this.sock.closeConnection();
        if (this.sock.establishConnection()) {
            if (!this.sock.sendData(this.dataPacket)) {
                loggerError("Data send failed");
            }
        }
    } */
};

export { DmxLightManager };
