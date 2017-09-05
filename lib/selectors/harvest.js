import _ from 'lodash';
import moment from 'moment';
moment.locale('fr');

const assignementsSelector = (assignements, projects) => {
  let data = {};
  _.each(assignements, userAssignements => {
    _.each(userAssignements, assignement => {
      if (!_.has(data, assignement.day_entry.user_id)) {
        data[assignement.day_entry.user_id] = {};
      }
      let day = assignement.day_entry.spent_at;

      if (!_.has(data[assignement.day_entry.user_id], day)) {
        data[assignement.day_entry.user_id][day] = [];
      }

      data[assignement.day_entry.user_id][day].push({
        id: assignement.day_entry.id,
        day: day,
        allocation: assignement.day_entry.hours,
        notes: assignement.day_entry.notes,
        project_id: assignement.day_entry.project_id,
        client_id: projects[assignement.day_entry.project_id].client_id,
        project_name: projects[assignement.day_entry.project_id].name,
        person_id: assignement.day_entry.user_id,
      });
    });
  });
  return data;
};

const holidaysSelector = (assignements, projects, holidayProjectIds) => {
  let data = {};
  _.each(assignements, userAssignements => {
    _.each(userAssignements, assignement => {
      if (_.includes(holidayProjectIds, assignement.day_entry.project_id)) {
        if (!_.has(data, assignement.day_entry.user_id)) {
          data[assignement.day_entry.user_id] = {};
        }

        let projectName = projects[assignement.day_entry.project_id].name;

        if (!_.has(data[assignement.day_entry.user_id], projectName)) {
          data[assignement.day_entry.user_id][projectName] = [];
        }

        data[assignement.day_entry.user_id][projectName].push({
          date: assignement.day_entry.spent_at,
          day: moment(assignement.day_entry.spent_at).format('D'),
          month: moment(assignement.day_entry.spent_at).format('MMMM'),
          allocation: assignement.day_entry.hours,
        });
      }
    });
  });

  return data;
};

const holidaysAsStringSelector = data => {
  _.each(data, (userAssignements, userId) => {
    data[userId] = _.mapValues(userAssignements, o => {
      let sortedDates = _.sortBy(o, ['date']);
      let dates = '';
      let currentMonth = '';
      let totalHours = 0;

      _.each(sortedDates, date => {
        if (date.month !== currentMonth) {
          if ('' !== currentMonth) {
            dates += ' ' + currentMonth + ', ';
          }
          currentMonth = date.month;
        } else {
          dates += ', ';
        }
        dates += date.day;
        totalHours += date.allocation;

        if (date.allocation === 4) {
          dates += ' (demi-journée)';
        }
      });
      dates += ' ' + currentMonth + ' (' + totalHours / 8 + 'j)';

      return dates;
    });
  });

  return data;
};

const projectsSelector = projects => {
  let data = {};
  _.each(projects, project => {
    data[project.project.id] = {
      name: project.project.name,
      client_id: project.project.client_id,
    };
  });
  return data;
};

const usersSelector = users => {
  let data = [];
  _.each(users, user => {
    data.push({
      id: user.user.id,
      first_name: user.user.first_name,
      last_name: user.user.last_name,
    });
  });
  return _.sortBy(data, ['first_name', 'last_name']);
};

export {
  assignementsSelector,
  holidaysSelector,
  holidaysAsStringSelector,
  projectsSelector,
  usersSelector,
};
