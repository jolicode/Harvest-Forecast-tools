import Harvest from 'harvest';
import _ from 'lodash';

export default class {
  constructor(storage, subdomain, accessToken) {
    this.storage = storage;
    this.harvest = new Harvest({
      subdomain: subdomain,
      accessToken: accessToken
    });
  }

  addDaily(options) {
    return new Promise(((resolve, reject) => {
      this.harvest.timeTracking.create(options, (error, res, body) => {
        if (res.statusCode === 401) {
          return reject('harvest_authentication_failed');
        }

        resolve(body);
      });
    }).bind(this));
  }

  getAssignements(users, start, end) {
    return new Promise(((resolve, reject) => {
      let usersAssignementsPromises = [];
      let harvest = this.harvest;

      _.each(users, user => {
        usersAssignementsPromises.push(
          new Promise((resolveUser, rejectUser) => {
            harvest.reports.timeEntriesByUser(user.user.id, {
              from: start,
              to: end,
            }, (error, res, body) => {
              if (res.statusCode === 401) {
                return rejectUser('harvest_authentication_failed');
              }
              resolveUser(body);
            });
          })
        );
      });

      Promise.all(usersAssignementsPromises).then(values => {
        resolve(values);
      }).catch(err => {
        reject(err);
      });
    }).bind(this));
  }

  getClients() {
    return new Promise(((resolve, reject) => {
      if (!this.storage.has('harvest.clients')) {
        this.harvest.clients.list({}, (error, res, body) => {
          if (res.statusCode === 401) {
            reject('harvest_authentication_failed');
          }
          this.storage.set('harvest.clients', body);
          resolve(body);
        });
      } else {
        resolve(this.storage.get('harvest.clients'));
      }
    }).bind(this));
  }

  getData(start, end) {
    let self = this;

    return new Promise((resolve, reject) => {
      let usersPromise = this.getUsers();
      let clientsPromise = this.getClients();
      let projectsPromise = this.getProjects();
      let assignementsPromise = usersPromise.then(((users) => {
        return this.getAssignements(users, start, end);
      }).bind(this)).catch(err => {
        reject(err);
      });

      Promise.all([usersPromise, projectsPromise, assignementsPromise, clientsPromise]).then(values => {
        resolve(values);
      }).catch(err => {
        reject(err);
      });
    });
  }

  getProjects() {
    return new Promise(((resolve, reject) => {
      if (!this.storage.has('harvest.projects')) {
        this.harvest.projects.list({}, (error, res, body) => {
          if (res.statusCode === 401) {
            reject('harvest_authentication_failed');
          }
          this.storage.set('harvest.projects', body);
          resolve(body);
        });
      } else {
        resolve(this.storage.get('harvest.projects'));
      }
    }).bind(this));
  }

  getTasksByProjectId(projectId) {
    return new Promise(((resolve, reject) => {
      if (!this.storage.has('harvest.tasks.' + projectId)) {
        this.harvest.taskAssignment.list(projectId, (error, res, body) => {
          if (res.statusCode === 401) {
            reject('harvest_authentication_failed');
          }
          this.storage.set('harvest.tasks.' + projectId, body);
          resolve(body);
        });
      } else {
        resolve(this.storage.get('harvest.tasks.' + projectId));
      }
    }).bind(this));
  }

  getUsers() {
    return new Promise(((resolve, reject) => {
      if (!this.storage.has('harvest.users')) {
        this.harvest.users.list({}, (error, res, body) => {
          if (res.statusCode === 401) {
            reject('harvest_authentication_failed');
          }
          this.storage.set('harvest.users', body);
          resolve(body);
        });
      } else {
        resolve(this.storage.get('harvest.users'));
      }
    }).bind(this));
  }
};
