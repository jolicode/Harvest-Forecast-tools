import request from 'request';
import _ from 'lodash';

export default class {
  constructor(accountId, accessToken) {
    this.accountId = accountId;
    this.accessToken = accessToken;
  }

  addTimeTracking(options, callback) {
    this._request('/time_entries', (err, body) => {
      if (err) {
        return callback(err);
      }

      return callback(null, body);
    }, {
      method: 'POST',
      qs: options
    });
  }

  getClients(callback, page = 1, clients = []) {
    this._request('/clients', (err, body) => {
      if (err) {
        return callback(err);
      }

      clients = _.concat(clients, body.clients);

      if (body.next_page > page) {
        return this.getClients(callback, body.next_page, clients);
      }

      return callback(null, clients);
    }, {qs: {page: page}});
  }

  getProjects(callback, page = 1, projects = []) {
    this._request('/projects', (err, body) => {
      if (err) {
        return callback(err);
      }

      projects = _.concat(projects, body.projects);

      if (body.next_page > page) {
        return this.getProjects(callback, body.next_page, projects);
      }

      return callback(null, projects);
    }, {qs: {page: page}});
  }

  getTaskAssignments(projectId, callback, page = 1, taskAssignments = []) {
    this._request('/projects/' + projectId + '/task_assignments', (err, body) => {
      if (err) {
        return callback(err);
      }

      taskAssignments = _.concat(taskAssignments, body.task_assignments);

      if (body.next_page > page) {
        return this.getProjects(projectId, callback, body.next_page, taskAssignments);
      }

      return callback(null, taskAssignments);
    }, {qs: {page: page}});
  }

  getTimeEntries(from, to, callback, page = 1, time_entries = []) {
    this._request('/time_entries', (err, body) => {
      if (err) {
        return callback(err);
      }

      time_entries = _.concat(time_entries, body.time_entries);
      let nextPage = parseInt(body.next_page);

      if (nextPage > page) {
        return this.getTimeEntries(from, to, callback, nextPage, time_entries);
      }

      return callback(null, time_entries);
    }, {qs: {from: from, to: to, page: page}});
  }

  getUsers(callback, page = 1, users = []) {
    this._request('/users', (err, body) => {
      if (err) {
        return callback(err);
      }

      users = _.concat(users, body.users);

      if (body.next_page > page) {
        return this.getUsers(callback, body.next_page, users);
      }

      return callback(null, users);
    }, {qs: {page: page}});
  }

  _request(endpoint, callback, options = {}) {
    _.defaultsDeep(options, {
      json: true,
      headers: {
        'Authorization': 'Bearer ' + this.accessToken,
        'Harvest-Account-Id': this.accountId,
        'User-Agent': 'harvest api client',
      },
      url: 'https://api.harvestapp.com/v2' + endpoint,
    });

  	request(options, function(err, res, body) {
  		if (err) {
  			return callback(err);
  		}
  		if (res.statusCode === 422) {
  			return callback(body);
  		}
  		callback(null, body);
  	});
  }
}
