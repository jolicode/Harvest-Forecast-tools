import express from 'express';
import rp from 'request-promise-native';
import Nightmare from 'nightmare';
const router = express.Router();

router.get('/logout', (req, res, next) => {
  req.session.forecast = {};
  req.session.save();
  res.redirect('/');
});

// temporary, for use while https://id.getharvest.com/developers doesn't work
router.get('/token', (req, res, next) => {
  Nightmare({ show: false })
    .goto(
      'https://id.getharvest.com/forecast?account_id=' +
        process.env.forecast_account_id
    )
    .insert('#email', process.env.forecast_username)
    .insert('#password', process.env.forecast_password)
    .click('#log-in')
    .wait('.ember-application')
    .url()
    .end()
    .then(function(result) {
      let temp = result.split('/');
      req.session.forecast = {
        token: 'Bearer ' + temp[5],
        userId: temp[3],
      };
      req.session.save();
      res.redirect('/');
    })
    .catch(function(error) {
      console.error('Search failed:', error);
    });
});

module.exports = router;
