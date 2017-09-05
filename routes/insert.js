import express from 'express';
import _ from 'lodash';
import moment from 'moment';
import { check, validationResult } from 'express-validator/check';
import { matchedData } from 'express-validator/filter';
import HarvestFetcher from '../lib/fetchers/harvest';
import ForecastFetcher from '../lib/fetchers/forecast';
import {
  activeUsersSelector,
  clientAndProjectSelector
} from '../lib/selectors/forecast';
const router = express.Router();

const buildForm = (req, res, next, values = {}, errors = {}) => {
  let forecastFetcher = new ForecastFetcher(req.storage, process.env.forecast_account_id, req.session.forecast.token);
  Promise.all([
    forecastFetcher.getClients(),
    forecastFetcher.getPeople(),
    forecastFetcher.getProjects(),
  ]).then(data => {
    if (req.method !== 'POST') {
      values = {
        project: parseInt(process.env.forecast_insert_default_project_id),
        comment: '',
        date: '',
        duration: 8,
        in: {
          forecast: 'true',
          harvest: 'true',
        },
        people: {}
      };

      _.each(data[1], user => {
        values.people[user.id] = 'true';
      });
    }

    res.render('insert', {
      title: 'Mass insert entries in forecast schedules &amp; Harvest timesheets',
      people: activeUsersSelector(data[1]),
      projects: clientAndProjectSelector(data[0], data[2]),
      values,
      errors
    });
  }).catch(reason => {
    if (reason === 'harvest_authentication_failed') {
      res.redirect('/auth/harvest/redirect');
    }

    res.redirect('/');
  });
}

const getValidators = () => {
  return [
    check('comment').isLength({ min: 0 }).withMessage('dummy validator'),
    check('date').not().isEmpty().withMessage('please choose a date'),
    check('date').isAfter('02/28/2012').withMessage('please choose a valid date'),
    check('project').not().isEmpty().withMessage('please choose one project'),
    check('people').not().isEmpty().withMessage('should contain at least one user'),
    check('duration').isInt({ min: 1, max: 8 }).withMessage('should be an integer (between 1 and 8 hours).'),
    check('people.*').isBoolean().withMessage('should be a boolean'),
    check('in').custom(value => {
      return !_.isEmpty(_.keys(value))
        && _.isEmpty(_.difference(_.keys(value), ['forecast', 'harvest']));
    }).withMessage('Please choose "forecast" or "harvest" as a target'),

    check('people').custom((value, { req, location, path }) => {
      return new Promise((resolve, reject) => {
        const forecastFetcher = new ForecastFetcher(req.storage, process.env.forecast_account_id, req.session.forecast.token);
        forecastFetcher.getPeople().then(data => {
          let userIds = _.reduce(data, function(result, value) {
            result.push(value.id);
            return result;
          }, []);
          let checkedUserIds = _.map(_.keys(value), v => { return parseInt(v, 10) });
          if (!_.isEmpty(checkedUserIds) && _.isEmpty(_.difference(checkedUserIds, userIds))) {
            resolve(true);
          } else {
            reject(true);
          }
        });
      });
    }).withMessage('Please choose valid users'),

    check('preexisting_assignement').custom((values, { req, location, path }) => {
      return new Promise((resolve, reject) => {
        let values = req.body;
        if (_.get(values.in, 'forecast', false)) {
          // in case of a forecast mass-insertion, check that there's no existing
          // assignment for the same day, user and project
          const forecastFetcher = new ForecastFetcher(req.storage, process.env.forecast_account_id, req.session.forecast.token);
          let date = moment(values.date, 'MM/DD/YYYY').format('YYYY-MM-DD');
          forecastFetcher.getAssignements(date, date).then(assignments => {
            let checkedUserIds = _.map(_.keys(values.people), v => { return parseInt(v, 10) });
            _.each(checkedUserIds, userId => {
              if (_.find(assignments, {person_id: userId, project_id: parseInt(values.project, 10)})) {
                return reject(true);
              }
            });

            resolve(true);
          });
        } else {
          resolve(true);
        }
      });
    }).withMessage('At least one of the selected users already has a Forecast assignement for this project on that day.'),
  ];
}

router.get('/', (req, res, next) => {
  buildForm(req, res, next);
});

router.post('/', getValidators(), (req, res, next) => {
  try {
    validationResult(req).throw();
    const values = matchedData(req, {onlyValidData: true});
    const forecastFetcher = new ForecastFetcher(req.storage, process.env.forecast_account_id, req.session.forecast.token);
    const harvestFetcher = new HarvestFetcher(req.storage, process.env.harvest_client_domain, req.session.harvest.token);

    Promise.all([
      forecastFetcher.getPeopleByIds(_.map(_.keys(values.people), v => { return parseInt(v, 10) })),
      forecastFetcher.getProject(parseInt(values.project, 10)),
    ]).then(data => {
      let addPromises = [];
      let projectId = data[1].harvest_id;
      let date = moment(values.date, 'MM/DD/YYYY').format('YYYY-MM-DD');

      if (_.get(values.in, 'forecast', false)) {
        _.each (data[0], user => {
          addPromises.push(forecastFetcher.addAssignement({
            notes: values.comment,
            allocation: parseInt(values.duration) * 3600,
            project_id: data[1].id,
            person_id: user.id,
            repeated_assignment_set_id: null,
            start_date: date,
            end_date: date
          }));
        });
      }

      harvestFetcher.getTasksByProjectId(projectId).then(tasks => {
        if (_.get(values.in, 'harvest', false)) {
          if (!_.has(tasks, [0, 'task_assignment', 'task_id'])) {
            throw 'no task found for this project';
          }

          let taskId = tasks[0].task_assignment.task_id;
          _.each (data[0], user => {
            addPromises.push(harvestFetcher.addDaily({
              notes: values.comment,
              hours: values.duration,
              project_id: projectId,
              of_user: user.harvest_user_id,
              task_id: taskId,
              spent_at: date
            }));
          });
        }

        // run the assignement promises
        Promise.all(addPromises).then(insertions => {
          let assignements = { forecast: [], harvest: [] };
          _.each(insertions, insertion => {
            if (_.has(insertion, 'task_id')) {
              // this is an harvest assignement
              let user = _.find(data[0], { harvest_user_id: insertion.user_id });
              assignements.harvest.push({
                username: user.first_name + ' ' + user.last_name,
                name: insertion.client + ' - ' + insertion.project + ' (' + insertion.task + ')',
                url: moment(insertion.spent_at, 'YYYY-MM-DD').format('YYYY/MM/DD') + '/' + user.harvest_user_id
              });
            } else {
              // this is a forecast assignement
              let user = _.find(data[0], { id: insertion.person_id });
              assignements.forecast.push({
                username: user.first_name + ' ' + user.last_name,
                user_id: insertion.person_id,
                name: data[1].name,
                id: insertion.id
              });
            }
          });

          assignements = {
            forecast: _.sortBy(assignements.forecast, 'username'),
            harvest: _.sortBy(assignements.harvest, 'username'),
          };
          return res.render('inserted', {
            title: 'Mass insert entries in forecast schedules &amp; Harvest timesheets',
            forecast_account_id: process.env.forecast_account_id,
            harvest_client_domain: process.env.harvest_client_domain,
            assignements
          });
        }).catch(reason => {
          return buildForm(req, res, next, values, { global: reason });
        });

      }).catch(err => {
        throw err;
      });
    }).catch(reason => {
      return buildForm(req, res, next, values, { global: reason });
    });
  } catch (err) {
    const values = matchedData(req, {onlyValidData: false});
    return buildForm(req, res, next, values, err.mapped());
  }
});

module.exports = router;
