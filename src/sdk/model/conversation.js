function conversation(params) {
  typeof params.type !== 'undefined' && (this.type = params.type);
  typeof params.operation !== 'undefined' && (this.operation = params.operation);
}

conversation.prototype = {
  setType: function (type) {
    this.type = type;
  },
  setOperation: function (operation) {
    this.operation = operation;
  }
};

export default conversation;
