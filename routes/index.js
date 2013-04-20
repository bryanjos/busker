var mongojs = require('mongojs')
    , passport = require('passport')
    , TwitterStrategy = require('passport-twitter').Strategy
    , fs = require('fs')
    , check = require('validator').check
    , sanitize = require('validator').sanitize
    , underscore = require('underscore')
    , crypto = require('crypto')
    , utils = require('../utils')
    , config = require('../config');


var db = mongojs(config.DB_NAME, ['users', 'events' ]);
var slug_length = 4;

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
    user,
    created
 }
 */


passport.use(new TwitterStrategy({
        consumerKey: config.TWITTER_CONSUMER_KEY,
        consumerSecret: config.TWITTER_CONSUMER_SECRET,
        callbackURL: config.TWITTER_CALLBACK
    },
    function(token, tokenSecret, profile, done) {
        db.users.findOne({twitter_id: profile.id}, function(err, user){
            if (err) { return done(err); }

            if(!user){
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

            db.users.save(user, function(err) {
                if (err) { return done(err); }
                return done(null, user);
            });
        });
    }
));


passport.serializeUser(function(user, done) {
    return done(null, user.twitter_id);
});

passport.deserializeUser(function(twitter_id, done) {
    db.users.findOne({twitter_id: twitter_id } , function (err, user) {
        done(err, user);
    });
});

validateUpdateProfile = function(req, callback){
    try{
        check(req.body.name, 'Artist Name Required').notEmpty();

        req.user.artist_name = req.body.name;
        req.user.description = req.body.description;
        req.user.digital_tip_jar_url = req.body.digital_tip_url;

        if(req.files.picture.name != ''){
            utils.uploadPhoto(req.files.picture, function(err, data){
                if(err){
                    callback(err, null);
                }

                req.user.picture = data;
                callback(null, req.user);
            });
        }else{
            callback(null, req.user);
        }

    } catch (e) {
        callback(e, null);
    }
};


validateNewEvent = function(req, callback){
    try{
        check(req.body.starttime, 'Start Required').notEmpty();
        check(req.body.endtime, 'End Required').notEmpty();
        check(req.body.location, 'Location Required').notEmpty();
        check(req.body.coordinates, 'Please click on map for location of event').notEmpty();

        var coordinates = JSON.parse(req.body.coordinates);

        var event = {};
        event.coordinates = {lng: coordinates.lng, lat: coordinates.lat};
        event.location = req.body.location;
        event.start = req.body.starttime;
        event.end = req.body.endtime;
        event.created = Date.now();
        event.slug = utils.generateRandomToken(slug_length);
        event.user = req.user;
        callback(null, event);

    } catch (e) {
        callback(e, null);
    }
};


validateUpdateEvent = function(req, callback){
    try{
        check(req.body.starttime, 'Start Required').notEmpty();
        check(req.body.endtime, 'End Required').notEmpty();
        check(req.body.location, 'Location Required').notEmpty();
        check(req.body.coordinates, 'Please click on map for location of event').notEmpty();

        db.events.findOne({slug: req.params.slug}, function(error, event){
            if(event){
                var coordinates = JSON.parse(req.body.coordinates);
                event.coordinates = {lng: coordinates.lng, lat: coordinates.lat};
                event.location = req.body.location;
                event.start = req.body.start;
                event.end = req.body.end;
                event.user = req.user;
                callback(null, event);

            }else{
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


exports.ensureAuthenticated = function(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/')
};


/*
 * GET home page.
 */

exports.index = function(req, res){

  res.render('index', { title: 'Express', message: null, user: utils.getUser(req) });

};

exports.about = function(req, res){
    res.render('about', {message: null, user: utils.getUser(req) });
}

exports.auth_twitter = passport.authenticate('twitter',
    {successRedirect: '/create-profile', failureRedirect: '/', failureFlash: true }
);

exports.log_out = function(req, res){
    req.logout();
    res.redirect('/');
};

exports.create_profile = function(req, res){
    res.render('create-profile', { user: utils.getUser(req), message: req.flash('error') });
};

exports.create_profile_post = function(req, res){
    validateUpdateProfile(req, function(e, user){
        if(e){
            console.log(e);
            return res.render('create-profile', {user: utils.getUser(req), message: e.message});
        }

        db.users.save(user, function (err) {
            if (err){
                res.render('create-profile', { user: utils.getUser(req), message: req.flash('error') });
            }else{
                res.redirect('/profiles/' + user.slug);
            }
        });
    });
};

exports.profile = function(req, res){
    db.users.findOne({slug: req.params.slug}, function(err, user){
        if(err){
            return res.redirect('/');
        }

        if(user == null){
            return res.send(404);
        }
        console.log(user);
        res.render('profile', {user:utils.getUser(req), message: req.flash('error'), performer: user});
    });
};

exports.edit_profile = function(req, res){
    db.users.findOne({slug: req.params.slug}, function(err, user){
        if(err){
            return res.redirect('/');
        }

        if(user == null || user.slug != req.user.slug){
            return res.send(404);
        }

        res.render('create-profile', {user:utils.getUser(req), message: req.flash('error'), performer: user});
    });
};

exports.edit_profile_post = function(req, res, next){
    validateUpdateProfile(req, function(e, user){
        if(err){
            return res.render('/create-profile', {user: utils.getUser(req), message: e.message});
        }

        db.users.save(user, function (err, user) {
            if (err){
                res.render('create-profile', { user:utils.getUser(req), message: req.flash('error') });
            }else{
                res.redirect('/profiles/' + user.slug);
            }
        });
    });
};


exports.user_events = function(req, res){
    db.events.find({ "user.slug" : req.params.slug}, function(err, events){
        if(err){
            return res.redirect('/');
        }

        res.render('events', {user: utils.getUser(req), message: req.flash('error'), events: events});
    });
};

exports.events = function(req, res){
    db.events.find({}, function(err, events){
        if(err){
            return res.redirect('/');
        }

        res.render('events', {user: utils.getUser(req), message: req.flash('error'), events: events});
    });
};


exports.event = function(req, res){
    db.events.findOne({slug: req.params.event_slug}, function(err, event){
        if(err){
            return res.redirect('/');
        }

        res.render('event', {user: utils.getUser(req), message: req.flash('error'), event: event});
    });
};

exports.new_event = function(req, res){
    res.render('new-event', {user: utils.getUser(req), message: null});
};

exports.new_event_post = function(req, res){
    validateNewEvent(req, function(e, event){
        if(e){
            return res.render('new-event', {user: utils.getUser(req), message: e.message});
        }

        db.events.save(event, function (err, event) {
            if (err){
                res.render('new-event', { user: utils.getUser(req), message: req.flash('error') });
            }else{
                res.redirect('/events/' + event.slug);
            }
        });
    });
};


exports.edit_event = function(req, res){
    db.events.findOne({slug: req.params.event_slug, "user.slug": req.user.slug}, function(err, event){
        if(err){
            return res.redirect('/');
        }

        if(event == null){
           res.send(404)
        }

        res.render('new-event', {user: utils.getUser(req), message: req.flash('error'), event: event});
    });
};

exports.edit_event_post = function(req, res){
    validateUpdateEvent(req, function(e, event){
        if(e){
            return res.render('new-event', {user: utils.getUser(req), message: e.message});
        }

        db.events.save(event, function (err, event) {
            if (err){
                res.render('new-event', { user: utils.getUser(req), message: req.flash('error') });
            }else{
                res.redirect('/events/' + event.slug);
            }
        });
    });
};
