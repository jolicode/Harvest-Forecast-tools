import express from 'express';
import rp from 'request-promise-native';
const router = express.Router();

router.get('/code', (req, res, next) => {
  let code = req.query.code;
  rp({
    method: 'POST',
    uri: 'https://' + process.env.harvest_client_domain + '.harvestapp.com/oauth2/token',
    form: {
      code: code,
      client_id: process.env.harvest_client_id,
      client_secret: process.env.harvest_client_secret,
      redirect_uri: process.env.harvest_client_redirect_uri,
      grant_type: 'authorization_code'
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    }
  }).then(body => {
    const parsedBody = JSON.parse(body);
    req.session.harvest = {
      token: parsedBody.access_token
    };
    req.session.save();
    res.redirect('/');
  }).catch(err => {
    console.log('Woops...', err);
  });
});

router.get('/logout', (req, res, next) => {
  req.session.harvest = {};
  req.session.save();
  res.redirect('/');
});

router.get('/redirect', (req, res, next) => {
  res.redirect(
    'https://' + process.env.harvest_client_domain + '.harvestapp.com/oauth2/authorize?client_id=' + process.env.harvest_client_id + '&amp;redirect_uri=' + encodeURIComponent(process.env.harvest_client_redirect_uri) + '&amp;state=optional-csrf-token&amp;response_type=code'
  );
});

module.exports = router;
