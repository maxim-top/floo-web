const __events = {};

const __judgeEvent = (name) => {
  if (typeof __events[name] === 'undefined') {
    __events[name] = [];
  }
  return __events[name];
};

const bind = (name, func) => {
  const judge = __judgeEvent(name);
  const idx = judge.findIndex((f) => f.toString() === func.toString());
  if (idx > -1) {
    __judgeEvent(name).splice(idx, 1);
  }
  __judgeEvent(name).push(func);
};

const unBind = (name, func) => {
  const index = __judgeEvent(name).findIndex((item) => item.toString() === func.toString());
  if (index >= 0) {
    __events[name].splice(index, 1);
  }
};

const unBindAll = (name) => {
  __events[name] = null;
};

const fire = (name, param) => {
  __judgeEvent(name).forEach((func) => {
    func(param);
  });
};

export { bind, unBind, unBindAll, fire };
