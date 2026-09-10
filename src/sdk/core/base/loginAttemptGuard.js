let socketLoginResultGuard = () => true;

const setSocketLoginResultGuard = (guard) => {
  socketLoginResultGuard = typeof guard === 'function' ? guard : () => true;
};

const shouldAcceptSocketLoginResult = (result) => {
  return socketLoginResultGuard(result);
};

export { setSocketLoginResultGuard, shouldAcceptSocketLoginResult };
