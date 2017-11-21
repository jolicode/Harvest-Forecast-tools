import Harvest from '../harvestapp/index';
import _ from 'lodash';

export default class {
  constructor(storage, accountId, accessToken) {
    this.storage = storage;
    this.harvest = new Harvest(accountId, accessToken);
  }

  addDaily(options) {
    return new Promise(
      ((resolve, reject) => {
        this.harvest.addTimeTracking(options, (error, body) => {
          if (error) {
            reject(error);
          }
          resolve(body);
        });
      }).bind(this)
    );
  }

  getAssignements(start, end) {
    return new Promise(
      ((resolve, reject) => {
        this.harvest.getTimeEntries(start, end, (error, body) => {
          if (error) {
            reject(error);
          }
          resolve(body);
        })
      }).bind(this)
    );
  }

  getClients() {
    return new Promise(
      ((resolve, reject) => {
        if (!this.storage.has('harvest.clients')) {
          this.harvest.getClients((error, body) => {
            if (error) {
              reject(error);
            }
            this.storage.set('harvest.clients', body);
            resolve(body);
          });
        } else {
          resolve(this.storage.get('harvest.clients'));
        }
      }).bind(this)
    );
  }

  getData(start, end) {
    let self = this;

    return new Promise((resolve, reject) => {
      let usersPromise = this.getUsers();
      let clientsPromise = this.getClients();
      let projectsPromise = this.getProjects();
      let assignementsPromise = this.getAssignements(start, end);

      Promise.all([
        usersPromise,
        projectsPromise,
        assignementsPromise,
        clientsPromise,
      ])
        .then(values => {
          resolve(values);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  getProjects() {
    return new Promise(
      ((resolve, reject) => {
        if (!this.storage.has('harvest.projects')) {
          this.harvest.getProjects((error, body) => {
            if (error) {
              reject(error);
            }
            this.storage.set('harvest.projects', body);
            resolve(body);
          });
        } else {
          resolve(this.storage.get('harvest.projects'));
        }
      }).bind(this)
    );
  }

  getTasksByProjectId(projectId) {
    return new Promise(
      ((resolve, reject) => {
        if (!this.storage.has('harvest.tasks.' + projectId)) {
          this.harvest.getTaskAssignments(projectId, (error, body) => {
            this.storage.set('harvest.tasks.' + projectId, body);
            resolve(body);
          });
        } else {
          resolve(this.storage.get('harvest.tasks.' + projectId));
        }
      }).bind(this)
    );
  }

  getUsers() {
    return new Promise(
      ((resolve, reject) => {
        if (!this.storage.has('harvest.users')) {
          this.harvest.getUsers((error, body) => {
            if (error) {
              reject(error);
            }
            this.storage.set('harvest.users', body);
            resolve(body);
          });
        } else {
          resolve(this.storage.get('harvest.users'));
        }
      }).bind(this)
    );
  }
}
