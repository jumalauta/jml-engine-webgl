import { Timer } from './Timer';
import { Settings } from './Settings';
const settings = new Settings();

const initialTime = performance.now();

function log(type, txt) {
  // This console printing thing causes heavy delays in the browser
  // let elem = document.getElementById('panel-console');
  // if (elem) {
  //    elem.innerHTML += '<p>'+((new Date()).toISOString())+' ['+type.toUpperCase()+']: '+txt+'</p>';
  //    elem.scrollTop = elem.scrollHeight;
  // }

  if (settings.engine.enabledLogLevels.includes(type) === false) {
    return;
  }

  const originalType = type;

  if (type === 'trace') {
    type = 'debug';
    if (settings.engine.enabledLogLevels.includes(type) === false) {
      return;
    }
  }

  let time = new Timer().getTimeInSeconds().toFixed(2);
  if (time === '0.00') {
    time += ` (${(performance.now() - initialTime).toFixed(0)} ms)`;
  }
  const msg = `${time} [${originalType.toUpperCase()}]: ${txt}`;
  console[type](msg);
}

export function loggerTrace(txt) {
  log('trace', txt);
}
export function loggerDebug(txt) {
  log('debug', txt);
}
export function loggerInfo(txt) {
  log('info', txt);
}
export function loggerWarning(txt) {
  log('warn', txt);
}
export function loggerError(txt) {
  log('error', txt);
}

let windowTitle = '';
export function windowSetTitle(title) {
  windowTitle = title;
  document.title = windowTitle;
}

export function windowSetTitleTime() {
  const newTitle = `${windowTitle} - ${new Timer().getTimeInSeconds().toFixed(0)}/${(new Timer().endTime / 1000.0).toFixed(0)}`;
  if (newTitle !== document.title) {
    document.title = newTitle;
  }
}
