String.prototype.format = function() {
    let a = this;
    for (let k in arguments) {
      a = a.replace("{" + k + "}", arguments[k])
    }
    return a
  }