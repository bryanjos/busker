/**
 * Module dependencies.
 */
var express = require('express')
  , routes = require('./routes')
  , passport = require('passport')
  , MongoDBSession = require('connect-mongodb')
  , http = require('http')
  , flash = require('connect-flash')
  , utils = require('./utils')
  , path = require('path');


var app = express();

app.configure('development', function(){
    app.use(express.errorHandler());
});

app.configure(function(){
  app.set('port', process.env.PORT || 9000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('gacode', process.env.GOOGLE_ANALYTICS);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser({ keepExtension: true }));
  app.use(express.methodOverride());
  app.use(express.cookieParser('sxglhe8m'));
  app.use(express.session({secret:'sxglhe8m',  store: new MongoDBSession({url: utils.generate_mongo_url()})}));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash());
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(app.router);
});


app.get('/', routes.index);
app.get('/about', routes.about);
app.get('/logout', routes.log_out);

app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback', routes.auth_twitter);

app.get("/new", routes.ensureAuthenticated, routes.new_profile);

app.get("/create-profile", routes.ensureAuthenticated, routes.create_profile);
app.post("/create-profile", routes.ensureAuthenticated, routes.create_profile_post);

app.get("/edit-profile", routes.ensureAuthenticated, routes.edit_profile);
app.post("/edit-profile", routes.ensureAuthenticated, routes.edit_profile_post);

app.get("/delete-profile", routes.ensureAuthenticated, routes.delete_profile);
app.post("/delete-profile", routes.ensureAuthenticated, routes.delete_profile_post);

app.get("/profiles/:slug", routes.profile);

app.get("/profiles/:slug/events", routes.user_events);
app.get("/profiles/:slug/events.json", routes.user_events_json);
app.get("/events/create", routes.ensureAuthenticated, routes.new_event);
app.post("/events/create", routes.ensureAuthenticated, routes.new_event_post);

app.get("/events", routes.events);
app.get("/events.json", routes.events_json);
app.get("/events/:event_slug", routes.event);
app.get("/events/:event_slug/edit", routes.ensureAuthenticated, routes.edit_event);
app.post("/events/:event_slug/edit", routes.ensureAuthenticated, routes.edit_event_post);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
