import express from 'express';
import rp from 'request-promise-native';
import _ from 'lodash';
const router = express.Router();

router.get('/code', (req, res, next) => {
  let code = req.query.code;
  let scope = req.query.scope;

  rp({
    method: 'POST',
    uri: 'https://id.getharvest.com/api/v1/oauth2/token',
    form: {
      code: code,
      client_id: process.env.harvest_id_client_id,
      client_secret: process.env.harvest_id_client_secret,
      redirect_uri: process.env.harvest_id_client_redirect_uri,
      grant_type: 'authorization_code',
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
  })
    .then(body => {
      let harvestAccountId = getAccountId(scope, 'harvest');
      let forecastAccountId = getAccountId(scope, 'forecast');

      if (null === harvestAccountId || null === forecastAccountId) {
        // ask the user to exactly choose one harvest and one forecast account
        return res.render('authError', {
          title: 'Authorization error',
        });
      }

      const parsedBody = JSON.parse(body);
      req.session.token = parsedBody.access_token;

      rp({
        method: 'GET',
        uri: 'https://api.harvestapp.com/v2/company',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + parsedBody.access_token,
          'Harvest-Account-Id': harvestAccountId,
          'User-Agent': 'Harvest Forecast Tools/1.0',
        },
      }).then(companyBody => {
        const parsedCompanyBody = JSON.parse(companyBody);
        req.session.harvest = {
          account_id: harvestAccountId,
          base_uri: parsedCompanyBody.base_uri,
        };
        req.session.forecast = {
          account_id: forecastAccountId,
        };
        req.session.save();
        res.redirect('/');
      });
    })
    .catch(err => {
      console.log('Woops...', err);
      res.redirect('/');
    });
});

router.get('/logout', (req, res, next) => {
  delete req.session.token;
  req.session.save();
  res.redirect('/');
});

router.get('/redirect', (req, res, next) => {
  res.redirect(
    'https://id.getharvest.com/oauth2/authorize?client_id=' +
      process.env.harvest_id_client_id +
      '&amp;redirect_uri=' +
      encodeURIComponent(process.env.harvest_id_client_redirect_uri) +
      '&amp;response_type=code'
  );
});

function getAccountId(scope, type) {
  let scopes = scope.split(' ');
  let accountId, matches;
  const regex = new RegExp('^' + type + ':(\\d+)$');

  if (scopes.length !== 2) {
    return null;
  }

  _.each(scopes, scope => {
    if ((matches = scope.match(regex))) {
      accountId = matches[1];
    }
  });

  return accountId;
}

module.exports = router;
