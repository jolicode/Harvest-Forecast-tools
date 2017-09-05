import Forecast from 'forecast-api';
import _ from 'lodash';

export default class {
  constructor(storage, accountId, accessToken) {
    this.storage = storage;
    this.forecast = new Forecast({
      accountId: accountId,
      authorization: accessToken
    });
  }

  addAssignement(options) {
    return new Promise(((resolve, reject) => {
      this.forecast.addAssignment(options, (err, assignment) => {
        if (err) {
      		reject(err);
      	}

        resolve(assignment);
      });
    }).bind(this));
  }

  getAssignements(start, end) {
    return new Promise(((resolve, reject) => {
      let options = {
        startDate: start,
        endDate: end
      };
      this.forecast.assignments(options, (err, assignments) => {
        if (err) {
      		reject(err);
      	}

        resolve(assignments);
      });
    }).bind(this));
  }

  getClients() {
    return new Promise(((resolve, reject) => {
      if (!this.storage.has('forecast.clients')) {
        this.forecast.clients((err, clients) => {
          if (err) {
        		reject(err);
        	}

          this.storage.set('forecast.clients', clients);
          resolve(clients);
        });
      } else {
        resolve(this.storage.get('forecast.clients'));
      }
    }).bind(this));
  }

  getData(start, end) {
    return new Promise((resolve, reject) => {
      let usersPromise = this.getPeople();
      let projectsPromise = this.getProjects();
      let clientsPromise = this.getClients();
      let assignementsPromise = this.getAssignements(start, end);

      Promise.all([usersPromise, projectsPromise, assignementsPromise, clientsPromise]).then(values => {
        resolve(values);
      }).catch(err => {
        reject(err);
      });
    });
  }

  getPeople() {
    return new Promise(((resolve, reject) => {
      if (!this.storage.has('forecast.people')) {
        this.forecast.people((err, people) => {
          if (err) {
        		reject(err);
        	}

          this.storage.set('forecast.people', people);
          resolve(people);
        });
      } else {
        resolve(this.storage.get('forecast.people'));
      }
    }).bind(this));
  }

  getPeopleByIds(ids) {
    return new Promise(((resolve, reject) => {
      this.getPeople().then((people) => {
        resolve(_.compact(_.filter(people, user => { return _.includes(ids, user.id)})));
      }).catch(err => {
        reject(err);
      });
    }).bind(this));
  }

  getProject(id) {
    return new Promise(((resolve, reject) => {
      this.getProjects().then((projects) => {
        resolve(_.find(projects, {id: id}));
      }).catch(err => {
        reject(err);
      });
    }).bind(this));
  }

  getProjects() {
    return new Promise(((resolve, reject) => {
      if (!this.storage.has('forecast.projects')) {
        this.forecast.projects((err, projects) => {
          if (err) {
        		reject(err);
        	}

          this.storage.set('forecast.projects', projects);
          resolve(projects);
        });
      } else {
        resolve(this.storage.get('forecast.projects'));
      }
    }).bind(this));
  }
};
