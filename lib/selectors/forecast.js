import _ from 'lodash';
import moment from 'moment';

const activeUsersSelector = users => {
  return _.sortBy(_.compact(_.reject(users, 'archived')), [
    'first_name',
    'last_name',
  ]);
};

const assignementsSelector = (
  assignements,
  start,
  end,
  workingDays,
  projects
) => {
  let data = {};
  let formatedStart = start.format('YYYY-MM-DD');
  let formatedEnd = end.format('YYYY-MM-DD');

  _.each(assignements, assignement => {
    if (!_.has(data, assignement.person_id)) {
      data[assignement.person_id] = {};
    }
    if (
      formatedStart > assignement.end_date ||
      formatedEnd < assignement.start_date
    ) {
      return;
    }

    if (start > assignement.start_date) {
      assignement.start_date = formatedStart;
    }
    if (formatedEnd < assignement.end_date) {
      assignement.end_date = formatedEnd;
    }

    let days = moment
      .recur(assignement.start_date, assignement.end_date)
      .every(workingDays[assignement.person_id])
      .daysOfWeek()
      .all('YYYY-MM-DD');

    _.each(days, day => {
      if (!_.has(data[assignement.person_id], day)) {
        data[assignement.person_id][day] = [];
      }
      data[assignement.person_id][day].push({
        id: assignement.id,
        day: day,
        allocation: assignement.allocation / 3600,
        notes: assignement.notes,
        project: projects[assignement.project_id],
        person_id: assignement.person_id,
      });
    });
  });
  return data;
};

const clientAndProjectSelector = (clients, projects) => {
  projects = _.reject(projects, 'archived');
  projects = _.compact(_.filter(projects, 'client_id'));
  clients = _.compact(_.reject(clients, 'archived'));

  _.each(projects, (project, key) => {
    let client = _.find(clients, { id: project.client_id });
    if (!client) {
      _.pullAt(projects, key);
    } else {
      project.client_name = client.name;
    }
  });

  return _.sortBy(projects, ['client_name', 'name']);
};

const holidaysSelector = (
  assignements,
  users,
  harvestProjects,
  holidayProjectIds
) => {
  let data = {};
  _.each(assignements, userAssignements => {
    _.each(userAssignements, userDayAssignements => {
      _.each(userDayAssignements, assignement => {
        if (_.includes(holidayProjectIds, assignement.project.harvest_id)) {
          let projectName =
            harvestProjects[assignement.project.harvest_id].name;
          let user = _.find(users, { id: assignement.person_id });

          if (!_.has(data, user.harvest_user_id)) {
            data[user.harvest_user_id] = {};
          }
          if (!_.has(data[user.harvest_user_id], projectName)) {
            data[user.harvest_user_id][projectName] = [];
          }
          data[user.harvest_user_id][projectName].push({
            date: assignement.day,
            day: moment(assignement.day).format('D'),
            month: moment(assignement.day).format('MMMM'),
            allocation: assignement.allocation,
          });
        }
      });
    });
  });

  return data;
};

const projectsSelector = projects => {
  let data = {};
  _.each(projects, project => {
    data[project.id] = _.pick(project, ['name', 'harvest_id', 'client_id']);
  });
  return data;
};

const usersSelector = users => {
  return _.sortBy(
    _.map(users, user => {
      return _.pick(user, [
        'id',
        'first_name',
        'last_name',
        'avatar_url',
        'harvest_user_id',
        'working_days',
      ]);
    }),
    ['first_name', 'last_name']
  );
};

const workingDaysSelector = users => {
  let data = {};
  _.each(users, user => {
    data[user.id] = [];
    user.working_days.monday && data[user.id].push(1);
    user.working_days.tuesday && data[user.id].push(2);
    user.working_days.wednesday && data[user.id].push(3);
    user.working_days.thursday && data[user.id].push(4);
    user.working_days.friday && data[user.id].push(5);
  });
  return data;
};

export {
  activeUsersSelector,
  assignementsSelector,
  clientAndProjectSelector,
  holidaysSelector,
  projectsSelector,
  usersSelector,
  workingDaysSelector,
};
