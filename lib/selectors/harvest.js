import _ from 'lodash';
import moment from 'moment';
moment.locale('fr');

const assignementsSelector = assignements => {
  let data = {};
  _.each(assignements, assignement => {
    if (!_.has(data, assignement.user.id)) {
      data[assignement.user.id] = {};
    }
    let day = assignement.spent_date;

    if (!_.has(data[assignement.user.id], day)) {
      data[assignement.user.id][day] = [];
    }

    data[assignement.user.id][day].push({
      id: assignement.id,
      day: day,
      allocation: assignement.hours,
      notes: assignement.notes,
      project_id: assignement.project.id,
      client_id: assignement.client.id,
      project_name: assignement.project.name,
      person_id: assignement.user.id,
    });
  });

  return data;
};

const holidaysSelector = (assignements, holidayProjectIds) => {
  let data = {};

  _.each(assignements, assignement => {
    if (_.includes(holidayProjectIds, assignement.project.id)) {
      if (!_.has(data, assignement.user.id)) {
        data[assignement.user.id] = {};
      }

      if (!_.has(data[assignement.user.id], assignement.project.name)) {
        data[assignement.user.id][assignement.project.name] = [];
      }

      data[assignement.user.id][assignement.project.name].push({
        date: assignement.spent_date,
        day: moment(assignement.spent_date).format('D'),
        month: moment(assignement.spent_date).format('MMMM'),
        allocation: assignement.hours,
      });
    }
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
    data[project.id] = {
      name: project.name,
      client_id: project.client.id,
    };
  });
  return data;
};

const usersSelector = users => {
  let data = [];
  _.each(users, user => {
    data.push({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
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
