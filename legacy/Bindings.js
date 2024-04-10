function log(type, txt) {
    let elem = document.getElementById('panel-console');
    if (elem) {
        elem.innerHTML += '<p>'+((new Date()).toISOString())+' ['+type.toUpperCase()+']: '+txt+'</p>';
        elem.scrollTop = elem.scrollHeight;
    }

    if (type === 'trace') {
        type = 'debug';
    }
    console[type](txt);
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

let startDummy = undefined;

export function startTimer() {
    startDummy = new Date().getTime() / 1000;
}

export function getSceneTimeFromStart() {
    let now = new Date().getTime() / 1000;
    if (startDummy === undefined) {
        startDummy = now;
    }
    return (now - startDummy);
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