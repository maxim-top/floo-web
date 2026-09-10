export const createHistoryRequestGate = () => {
  const active = new Set();

  return {
    begin(sid) {
      const key = `${sid}`;
      if (active.has(key)) return false;
      active.add(key);
      return true;
    },
    finish(sid) {
      active.delete(`${sid}`);
    },
    reset() {
      active.clear();
    },
    has(sid) {
      return active.has(`${sid}`);
    }
  };
};
