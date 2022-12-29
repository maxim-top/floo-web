const isProduction = process.env.NODE_ENV === 'production';
var logLevel = 'debug';
const errList = [];
const empty = () => {};
const requestLog = (info) => {
  errList.push(info);
  if (errList.length > 5) {
    errList.splice(-5);
  }
  document.querySelector('#slog').innerHTML = errList.join('<br />');
};

function formatDate(date) {
  let y = date.getFullYear();
  let m = (date.getMonth() + 1).toString().padStart(2, '0');
  let d = date.getDate().toString().padStart(2, '0');
  let h = date.getHours().toString().padStart(2, '0');
  let f = date.getMinutes().toString().padStart(2, '0');
  let s = date.getSeconds().toString().padStart(2, '0');
  let ss = date.getMilliseconds().toString().padStart(3, '0');
  return y + '-' + m + '-' + d + ' ' + h + ':' + f + ':' + s + '.' + ss;
}

const timestamp = () => `${formatDate(new Date())}`;

const log = (...args) => {
  if (logLevel == 'debug') {
    console.log(timestamp(), '[debug]', ...args);
  }
};

const info = (...args) => {
  if (logLevel == 'debug' || logLevel == 'info') {
    console.info(timestamp(), '[info]', ...args);
  }
};

const warn = (...args) => {
  if (logLevel == 'debug' || logLevel == 'info' || logLevel == 'warn') {
    console.warn(timestamp(), '[warn]', ...args);
  }
};

const error = (...args) => {
  if (logLevel == 'debug' || logLevel == 'info' || logLevel == 'warn' || logLevel == 'error') {
    console.error(timestamp(), '[error]', ...args);
  }
};

const dir = (...args) => {
  if (logLevel == 'debug') {
    console.dir(timestamp(), '[dir]', ...args);
  }
};

const req = isProduction ? empty : requestLog;
const setLogLevel = (level) => {
  logLevel = level;
};
export default {
  error,
  log,
  info,
  warn,
  dir,
  req,
  setLogLevel
};
