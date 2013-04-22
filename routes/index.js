var mongojs = require('mongojs')
    , passport = require('passport')
    , TwitterStrategy = require('passport-twitter').Strategy
    , check = require('validator').check
    , utils = require('../utils')
    , Twit = require('twit')
    , moment = require('moment');


var db = mongojs(utils.generate_mongo_url(), ['users', 'events' ]);

db.users.ensureIndex({twitter_id:1} , {unique : true});
db.users.ensureIndex({username:1} , {unique : true});
db.users.ensureIndex({slug:1} , {unique : true});

db.events.ensureIndex({slug:1} , {unique : true});
db.events.ensureIndex({coordinates:"2d"});
db.events.ensureIndex({"user.slug":1});
db.events.ensureIndex({start_utc:1,end_utc:1});

var slug_length = 4;

var TWITTER_CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY;
var TWITTER_CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET;
var TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
var TWITTER_TOKEN_SECRET = process.env.TWITTER_TOKEN_SECRET;
var TWITTER_CALLBACK = process.env.TWITTER_CALLBACK;

var T = new Twit({
    consumer_key: TWITTER_CONSUMER_KEY,
    consumer_secret: TWITTER_CONSUMER_SECRET,
    access_token: TWITTER_ACCESS_TOKEN,
    access_token_secret: TWITTER_TOKEN_SECRET
});

/*
 user schema
 {
 _id,
 slug,
 twitter_id,
 username,
 token,
 token_secret,
 artist_name,
 picture,
 digital_tip_jar_url,
 created,
 description
 }
 */


/*
 event schema
 {
 _id,
 slug,
 coordinates: {lat, lon},
 location,
 start,
 end,
 start_utc,
 end_utc,
 user,
 created
 }
 */


passport.use(new TwitterStrategy({
        consumerKey: TWITTER_CONSUMER_KEY,
        consumerSecret: TWITTER_CONSUMER_SECRET,
        callbackURL: TWITTER_CALLBACK
    },
    function (token, tokenSecret, profile, done) {
        db.users.findOne({twitter_id: profile.id}, function (err, user) {
            if (err) {
                return done(err);
            }

            if (!user) {
                user = {
                    created: Date.now(),
                    slug: utils.generateRandomToken(slug_length)
                };
            }

            user.twitter_id = profile.id;
            user.displayName = profile.displayName;
            user.username = profile.username;
            user.token = token;
            user.token_secret = tokenSecret;

            db.users.save(user, function (err) {
                if (err) {
                    return done(err);
                }
                return done(null, user);
            });
        });
    }
));


passport.serializeUser(function (user, done) {
    return done(null, user.twitter_id);
});

passport.deserializeUser(function (twitter_id, done) {
    db.users.findOne({twitter_id: twitter_id }, function (err, user) {
        done(err, user);
    });
});

validateUpdateProfile = function (req, callback) {
    try {
        check(req.body.name, 'Artist Name Required').notEmpty();

        req.user.artist_name = req.body.name;
        req.user.description = req.body.description;
        req.user.digital_tip_jar_url = req.body.digital_tip_url;

        if (req.files.picture.name != '') {
            utils.uploadPhoto(req.files.picture, function (err, data) {
                if (err) {
                    callback(err, null);
                }

                req.user.picture = data;
                callback(null, req.user);
            });
        } else {
            callback(null, req.user);
        }

    } catch (e) {
        callback(e, null);
    }
};


validateNewEvent = function (req, callback) {
    try {
        check(req.body.starttime, 'Start Required').notEmpty();
        check(req.body.endtime, 'End Required').notEmpty();
        check(req.body.location, 'Location Required').notEmpty();
        check(req.body.coordinates, 'Please click on map for location of event').notEmpty();

        if(!moment(req.body.starttime).isValid())
            return callback({message: 'Start is not a valid date'}, null);

        if(!moment(req.body.endtime).isValid())
            return callback({message: 'End is not a valid date'}, null);

        var coordinates = JSON.parse(req.body.coordinates);

        var event = {};
        event.coordinates = {lng: coordinates.lng, lat: coordinates.lat};
        event.location = req.body.location;
        event.start = req.body.starttime;
        event.end = req.body.endtime;
        event.start_utc = moment(req.body.starttime).utc().format("YYYY-MM-DDTHH:mm:ss\\Z");
        event.end_utc = moment(req.body.endtime).utc().format("YYYY-MM-DDTHH:mm:ss\\Z");
        event.created = Date.now();
        event.slug = utils.generateRandomToken(slug_length);
        event.user = req.user;
        callback(null, event);

    } catch (e) {
        callback(e, null);
    }
};


validateUpdateEvent = function (req, callback) {
    try {
        check(req.body.starttime, 'Start Required').notEmpty();
        check(req.body.endtime, 'End Required').notEmpty();
        check(req.body.location, 'Location Required').notEmpty();
        check(req.body.coordinates, 'Please click on map for location of event').notEmpty();

        if(moment(req.body.starttime).isValid())
            return callback({message: 'Start is not a valid date'}, null);

        if(moment(req.body.endtime).isValid())
            return callback({message: 'End is not a valid date'}, null);

        db.events.findOne({slug: req.params.slug}, function (error, event) {
            if (event) {
                var coordinates = JSON.parse(req.body.coordinates);
                event.coordinates = {lng: coordinates.lng, lat: coordinates.lat};
                event.location = req.body.location;
                event.start = req.body.starttime;
                event.end = req.body.endtime;
                event.start_utc = moment(req.body.starttime).utc().format("YYYY-MM-DDTHH:mm:ss\\Z");
                event.end_utc = moment(req.body.endtime).utc().format("YYYY-MM-DDTHH:mm:ss\\Z");
                event.user = req.user;
                callback(null, event);

            } else {
                e = {
                    message: 'No Event with that id exists'
                };

                callback(e, null);
            }
        });


        callback(null, event);

    } catch (e) {
        callback(e, null);
    }
};


exports.ensureAuthenticated = function (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/')
};


/*
 * GET home page.
 */

exports.index = function (req, res) {

    res.render('index', { title: 'Express', message: null, user: utils.getUser(req) });

};

exports.about = function (req, res) {
    res.render('about', {message: null, user: utils.getUser(req) });
};

exports.auth_twitter = passport.authenticate('twitter',
    {successRedirect: '/new', failureRedirect: '/', failureFlash: true }
);

exports.log_out = function (req, res) {
    req.logout();
    res.redirect('/');
};

exports.new_profile = function (req, res) {
    if (req.user.artist_name != null) {
        return res.redirect('/profiles/' + req.user.slug);
    } else {
        return res.redirect('/create-profile');
    }
};

exports.create_profile = function (req, res) {
    res.render('create-profile', { user: utils.getUser(req), message: req.flash('error') });
};

exports.create_profile_post = function (req, res) {
    validateUpdateProfile(req, function (e, user) {
        if (e) {
            return res.render('create-profile', {user: utils.getUser(req), message: e.message});
        }

        db.users.save(user, function (err) {
            if (err) {
                res.render('create-profile', { user: utils.getUser(req), message: req.flash('error') });
            } else {
                res.redirect('/profiles/' + user.slug);
            }
        });
    });
};

exports.profile = function (req, res) {
    db.users.findOne({slug: req.params.slug}, function (err, user) {
        if (err) {
            return res.redirect('/');
        }

        if (user == null) {
            return res.send(404);
        }

        db.events.find({ "user.slug": user.slug}, function (err, events) {
            if (err) {
                return res.redirect('/');
            }

            res.render('profile', {user: utils.getUser(req), message: req.flash('error'), performer: user, events: events});
        });
    });
};

exports.edit_profile = function (req, res) {
    res.render('edit-profile', {user: utils.getUser(req), message: req.flash('error')});
};

exports.edit_profile_post = function (req, res, next) {
    validateUpdateProfile(req, function (e, user) {
        if (e) {
            return res.render('edit-profile', {user: utils.getUser(req), message: e.message});
        }

        db.users.save(user, function (err) {
            if (err) {
                res.render('edit-profile', { user: utils.getUser(req), message: req.flash('error') });
            } else {
                db.events.update({ "user.slug": req.user.slug}, {$set:{user:req.user}}, {multi:true}, function(err, updated) {
                    res.redirect('/profiles/' + user.slug);
                });
            }
        });
    });
};


exports.user_events = function (req, res) {
    db.events.find({ "user.slug": req.params.slug}, function (err, events) {
        if (err) {
            return res.redirect('/');
        }

        res.render('events', {user: utils.getUser(req), message: req.flash('error'), events: events});
    });
};

exports.user_events_json = function (req, res) {
    db.events.find({ "user.slug": req.params.slug}, function (err, events) {
        if (err) {
            res.json(500, err);
        }

        for (var i = 0; i < events.length; i++) {
            delete events[i].user.twitter_id;
            delete events[i].user.token;
            delete events[i].user.token_secret;
        }

        res.json(events);
    });
};

exports.events = function (req, res) {
    db.events.find({}, function (err, events) {
        if (err) {
            return res.redirect('/');
        }

        res.render('events', {user: utils.getUser(req), message: req.flash('error'), events: events});
    });
};

exports.events_json = function (req, res) {
    db.events.find({}, function (err, events) {
        if (err) {
            res.json(500, err);
        }

        for (var i = 0; i < events.length; i++) {
            delete events[i].user.twitter_id;
            delete events[i].user.token;
            delete events[i].user.token_secret;
        }

        res.json(events);
    });
};


exports.event = function (req, res) {
    db.events.findOne({slug: req.params.event_slug}, function (err, event) {
        if (err) {
            return res.redirect('/');
        }

        if (event == null) {
            return res.send(404);
        }

        T.get('search/tweets', { q: '#buskerue_' + event.slug }, function (err, reply) {
            res.render('event', {user: utils.getUser(req), message: req.flash('error'), event: event, tweets: reply.statuses});
        });
    });
};

exports.new_event = function (req, res) {
    res.render('new-event', {user: utils.getUser(req), message: null});
};

exports.new_event_post = function (req, res) {
    validateNewEvent(req, function (e, event) {
        if (e) {
            return res.render('new-event', {user: utils.getUser(req), message: e.message});
        }

        db.events.save(event, function (err, event) {
            if (err) {
                res.render('new-event', { user: utils.getUser(req), message: req.flash('error') });
            } else {
                res.redirect('/events/' + event.slug);
            }
        });
    });
};


exports.edit_event = function (req, res) {
    db.events.findOne({slug: req.params.event_slug, "user.slug": req.user.slug}, function (err, event) {
        if (err) {
            return res.redirect('/');
        }

        if (event == null) {
            res.send(404)
        }

        res.render('new-event', {user: utils.getUser(req), message: req.flash('error'), event: event});
    });
};

exports.edit_event_post = function (req, res) {
    validateUpdateEvent(req, function (e, event) {
        if (e) {
            return res.render('new-event', {user: utils.getUser(req), message: e.message});
        }

        if (event.user.slug != req.user.slug) {
            return res.send(404);
        }

        db.events.save(event, function (err, event) {
            if (err) {
                res.render('new-event', { user: utils.getUser(req), message: req.flash('error') });
            } else {
                res.redirect('/events/' + event.slug);
            }
        });
    });
};


