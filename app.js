/**
 * Module dependencies.
 */
var express = require('express')
  , routes = require('./routes')
  , passport = require('passport')
  , MongoDBSession = require('connect-mongodb')
  , http = require('http')
  ,flash = require('connect-flash')
  , config = require('./config')
  , path = require('path');


var app = express();

app.configure(function(){
  app.set('port', config.PORT);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser({ keepExtension: true }));
  app.use(express.methodOverride());
  app.use(express.cookieParser('sxglhe8m'));
  app.use(express.session({secret:'sxglhe8m',  store: new MongoDBSession({url: config.DB_NAME})}));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash());
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);

app.get('/login', routes.login);
app.post('/login', routes.login_post);

app.get('/logout', routes.log_out);

app.get('/signup', routes.signup);
app.post('/signup', routes.signup_post);

app.get('/update',routes.ensureAuthenticated, routes.update);
app.post('/update',routes.ensureAuthenticated, routes.update_post);
app.get('/user/:username', routes.user_profile);

app.get("/events", routes.events);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
