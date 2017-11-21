import express from 'express';
import _ from 'lodash';
const router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Homepage',
    authorized: _.has(req, 'session.token'),
  });
});

router.get('/clear-cache', function(req, res, next) {
  req.storage.removePath('forecast.');
  req.storage.removePath('harvest.');
  res.redirect('/');
});

module.exports = router;
