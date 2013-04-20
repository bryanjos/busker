/**
 * Module dependencies.
 */
var express = require('express')
  , routes = require('./routes')
  , passport = require('passport')
  , MongoDBSession = require('connect-mongodb')
  , http = require('http')
  , flash = require('connect-flash')
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
app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback', routes.auth_twitter);
app.get('/logout', routes.log_out);
app.get("/events", routes.events);
app.get("/event", routes.event);
app.get("/create-profile", routes.create_profile);
app.post("/create-profile", routes.create_profile_post);
app.get("/profile", routes.profile);
app.get("/new-event", routes.new_event);
app.post("/new-event", routes.new_event);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
