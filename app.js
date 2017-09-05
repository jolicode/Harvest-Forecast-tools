import express from 'express'
import session from 'express-session'
import sessionStorage from './lib/storage/session'
import path from 'path'
import favicon from 'serve-favicon'
import helmet from 'helmet'
import logger from 'morgan'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
const RedisStore = require('connect-redis')(session);

let app = express();

// harden a little our little app
app.use(helmet({
  noCache: true,
  referrerPolicy: true,
}));

// setup the session
app.use(session({
  store: new RedisStore(),
  secret: 'pacific ☮️ unicorn 🦄',
  resave: false,
  saveUninitialized: true
}));
app.use(sessionStorage('storage'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// mount our main routes
app.use('/', require('./routes/index'));
app.use('/auth/forecast', require('./routes/forecast'));
app.use('/auth/harvest', require('./routes/harvest'));
app.use('/diff', require('./routes/diff'));
app.use('/holidays', require('./routes/holidays'));
app.use('/insert', require('./routes/insert'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
