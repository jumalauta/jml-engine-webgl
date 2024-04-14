import { Timer } from '../Timer';
function log(type, txt) {
    //This console printing thing causes heavy delays in the browser
    //let elem = document.getElementById('panel-console');
    //if (elem) {
    //    elem.innerHTML += '<p>'+((new Date()).toISOString())+' ['+type.toUpperCase()+']: '+txt+'</p>';
    //    elem.scrollTop = elem.scrollHeight;
    //}

    if (type === 'trace') {
        type = 'debug';
    }
    let msg = `${(new Date()).toISOString()} - ${(new Timer()).getTimeInSeconds().toFixed(2)} [${type.toUpperCase()}]: ${txt}`;
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

export function processFutures() {
    //console.log('processFutures');
}

//notifyResourceLoaded, setResourceCount

var resourceCount = 0;
export function setResourceCount(c) {
    resourceCount = c;
}

export function notifyResourceLoaded() {
    resourceCount--;
}

export function windowSetTitle(title) {
    document.title = title;
}