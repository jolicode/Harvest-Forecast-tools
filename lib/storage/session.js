import _ from 'lodash';

class SessionStorage {
  constructor(session) {
    this.session = session;
  }

  clear() {
    this.session.destroy();
  }

  get(key) {
    return _.get(this.session, key);
  }

  has(key) {
    return _.has(this.session, key);
  }

  remove(key) {
    delete this.session[key];
    this.session.save();
  }

  set(key, value) {
    this.session[key] = value;
    this.session.save();
  }
}

let sessionStorageBuilder = (storageName = 'sessionStorage') => {
  return (req, res, next) => {
    if (!req.session) {
      next(
        new Error(
          'A session must exist. Please use express-session middleware.'
        )
      );
      return;
    }

    req[storageName] = new SessionStorage(req.session);
    next();
  };
};

exports = module.exports = sessionStorageBuilder;
