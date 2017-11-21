import express from 'express';
import ForecastFetcher from '../lib/fetchers/forecast';
import HarvestFetcher from '../lib/fetchers/harvest';
import { extractHolidays } from '../lib/reconcilier';
import _ from 'lodash';
import moment from 'moment';
const router = express.Router();

router.get(['/', '/:start/:end'], (req, res, next) => {
  let start, end;

  if (!_.has(req, 'session.token')) {
    return res.redirect('/');
  }

  if (req.params.start !== undefined) {
    start = moment
      .utc(req.params.start + ' +0000', 'YYYY-MM-DD Z')
      .startOf('day');
  } else {
    start = moment()
      .utc()
      .startOf('month')
      .startOf('day');
  }
  if (req.params.end !== undefined) {
    end = moment.utc(req.params.end + ' +0000', 'YYYY-MM-DD Z').endOf('day');
  } else {
    end = moment()
      .utc()
      .endOf('month')
      .endOf('day');
  }

  let prevStart = start
    .clone()
    .subtract(1, 'month')
    .startOf('month')
    .startOf('day');
  let prevEnd = prevStart
    .clone()
    .endOf('month')
    .endOf('day');
  let nextEnd = end
    .clone()
    .add(1, 'month')
    .endOf('month')
    .endOf('day');
  let nextStart = nextEnd
    .clone()
    .startOf('month')
    .startOf('day');

  let harvestFetcher = new HarvestFetcher(
    req.storage,
    req.session.harvest.account_id,
    req.session.token,
  );
  let forecastFetcher = new ForecastFetcher(
    req.storage,
    req.session.forecast.account_id,
    req.session.token
  );

  Promise.all([
    harvestFetcher.getData(start.toDate(), end.toDate()),
    forecastFetcher.getData(start.toDate(), end.toDate()),
  ])
    .then(values => {
      res.render('holidays', {
        title:
          'Holidays summary (' +
          start.format('YYYY-MM-DD') +
          ' → ' +
          end.format('YYYY-MM-DD') +
          ')',
        holidays: extractHolidays(
          start,
          end,
          values[0],
          values[1],
          process.env.harvest_holiday_projects
            .split(',')
            .map(id => parseInt(id))
        ),
        prevStart: prevStart.format('YYYY-MM-DD'),
        prevEnd: prevEnd.format('YYYY-MM-DD'),
        nextEnd: nextEnd.format('YYYY-MM-DD'),
        nextStart: nextStart.format('YYYY-MM-DD'),
      });
    })
    .catch(reason => {
      console.log('FAILED', reason);

      if (reason === 'harvest_authentication_failed') {
        res.redirect('/auth/harvest/redirect');
      }

      res.redirect('/');
    });
});

module.exports = router;
