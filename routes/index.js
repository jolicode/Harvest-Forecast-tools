import express from 'express';
import _ from 'lodash';
const router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Homepage',
    harvestAuthorized: _.has(req, 'session.harvest.token'),
    forecastAuthorized: _.has(req, 'session.forecast.token'),
  });
});

router.get('/clear-cache', function(req, res, next) {
  req.storage.remove('forecast.people');
  req.storage.remove('forecast.projects');
  req.storage.remove('harvest.users');
  req.storage.remove('harvest.projects');
  res.redirect('/');
});

module.exports = router;
