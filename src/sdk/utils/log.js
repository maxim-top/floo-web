const isProduction = process.env.NODE_ENV === 'production';
const errList = [];
const empty = () => {};
const requestLog = (info) => {
  errList.push(info);
  if (errList.length > 5) {
    errList.splice(-5);
  }
  document.querySelector('#slog').innerHTML = errList.join('<br />');
};

const error = isProduction ? empty : console.error;
const log = isProduction ? empty : console.log;
const info = isProduction ? empty : console.info;
const warn = isProduction ? empty : console.warn;
const dir = isProduction ? empty : console.dir;
const req = isProduction ? empty : requestLog;

export default {
  error,
  log,
  info,
  warn,
  dir,
  req
};
