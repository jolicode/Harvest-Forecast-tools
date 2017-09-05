import _ from 'lodash';
import moment from 'moment';
import {
  assignementsSelector as forecastAssignementsSelector,
  holidaysSelector as forecastHolidaysSelector,
  projectsSelector as forecastProjectsSelector,
  usersSelector as forecastUsersSelector,
  workingDaysSelector as forecastWorkingDaysSelector,
} from './selectors/forecast';
import {
  assignementsSelector as harvestAssignementsSelector,
  holidaysAsStringSelector,
  holidaysSelector as harvestHolidaysSelector,
  projectsSelector as harvestProjectsSelector,
  usersSelector as harvestUsersSelector,
} from './selectors/harvest';
require('moment-recur');

const extractHolidays = (
  start,
  end,
  harvestData,
  forecastData,
  holidayProjectIds
) => {
  // harvest analysis
  let harvestappUsers = harvestUsersSelector(harvestData[0]);
  let harvestappProjects = harvestProjectsSelector(harvestData[1]);
  let harvestappHolidays = holidaysAsStringSelector(
    harvestHolidaysSelector(
      harvestData[2],
      harvestappProjects,
      holidayProjectIds
    )
  );

  // forecast analysis
  let forecastWorkingDays = forecastWorkingDaysSelector(forecastData[0]);
  let forecastProjects = forecastProjectsSelector(forecastData[1]);
  let forecastAssignements = forecastAssignementsSelector(
    forecastData[2],
    start,
    end,
    forecastWorkingDays,
    forecastProjects
  );
  let forecastUsers = forecastUsersSelector(forecastData[0]);
  let forecastHolidays = holidaysAsStringSelector(
    forecastHolidaysSelector(
      forecastAssignements,
      forecastUsers,
      harvestappProjects,
      holidayProjectIds
    )
  );

  // glue this all
  _.each(harvestappUsers, user => {
    if (_.has(harvestappHolidays, user.id)) {
      user.harvestHolidays = harvestappHolidays[user.id];
    }

    if (_.has(forecastHolidays, user.id)) {
      user.forecastHolidays = forecastHolidays[user.id];
    }
  });

  return _.filter(harvestappUsers, u => {
    return _.has(u, 'harvestHolidays') || _.has(u, 'forecastHolidays');
  });
};

const reconcilier = (
  start,
  end,
  harvestData,
  forecastData,
  nonreconciliableClientIds
) => {
  let days = moment
    .recur(start, end)
    .every(1)
    .day()
    .all('YYYY-MM-DD');

  // forecast analysis
  let workingDays = forecastWorkingDaysSelector(forecastData[0]);
  let projects = forecastProjectsSelector(forecastData[1]);
  let clients = forecastData[3];
  let assignements = forecastAssignementsSelector(
    forecastData[2],
    start,
    end,
    workingDays,
    projects
  );
  let data = forecastUsersSelector(forecastData[0]);

  // harvest analysis
  let harvestappProjects = harvestProjectsSelector(harvestData[1]);
  let harvestappAssignements = harvestAssignementsSelector(
    harvestData[2],
    harvestappProjects
  );

  // glue this all
  _.each(data, user => {
    if (_.has(assignements, user.id)) {
      user.forecastAssignements = assignements[user.id];
    }

    if (_.has(harvestappAssignements, String(user.harvest_user_id))) {
      user.harvestAssignements =
        harvestappAssignements[String(user.harvest_user_id)];
    }
  });

  // filter out users who have no forecast nor harvest assignements
  data = _.filter(data, user => {
    return user.forecastAssignements || user.harvestAssignements;
  });

  // make the comparison, day by day
  _.each(data, user => {
    user.diff = {};
    _.each(days, day => {
      let error = 0; // 0 = no error, 1 = same client but not same project, 2 = there's a real difference
      let forecastAssignement = _.get(
        user,
        ['forecastAssignements', day],
        null
      );
      let harvestappAssignement = _.clone(
        _.get(user, ['harvestAssignements', day], null)
      );

      if (forecastAssignement === null && harvestappAssignement === null) {
        error = 0;
      } else if (
        forecastAssignement === null ||
        harvestappAssignement === null
      ) {
        error = 2;
      } else {
        error = 0;
        _.each(forecastAssignement, forecastTask => {
          let clientId = _.find(clients, o => {
            return o.id === forecastTask.project.client_id;
          }).harvest_id;

          // search for equivalent harvest assignement (based on harvest_id + duration)
          let equivalentHarvestProject = _.find(harvestappAssignement, {
            project_id: forecastTask.project.harvest_id,
            allocation: forecastTask.allocation,
          });
          let equivalentHarvestProjectByClient;

          if (!_.includes(nonreconciliableClientIds, clientId)) {
            equivalentHarvestProjectByClient = _.find(harvestappAssignement, {
              client_id: clientId,
              allocation: forecastTask.allocation,
            });
          }

          if (equivalentHarvestProject === undefined) {
            // if no project is found but the same client found, count a half-error
            // and remove this client's project from the day assignements
            if (equivalentHarvestProjectByClient !== undefined) {
              error = Math.max(error, 1);
              _.remove(harvestappAssignement, equivalentHarvestProjectByClient);
            } else {
              error = 2;
            }
          } else {
            // project found, remove it from the day assignements
            _.remove(harvestappAssignement, equivalentHarvestProject);
          }
        });

        error = harvestappAssignement.length > 0 ? 2 : error;
      }
      user.diff[day] = error;
    });
  });

  return data;
};

export { extractHolidays, reconcilier };
