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


var db = mongojs(config.DB_NAME, ['users', 'performers', 'events' ]);


/*
user schema
{
    _id,
    twitter_id,
    displayName,
    username,
    token,
    token_secret,
    created
}
*/

/*
 performer schema
 {
    _id,
    artist_name,
    slug,
    image,
    digital_tip_jar_url,
    user,
    created
 }
 */


/*
 event schema
 {
    coordinates: {lat, lon},
    location,
    start,
    end,
    performer_slug,
    performer,
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

            console.log(profile);
            if(!user){
                user = { created: Date.now };
            }

            user.twitter_id = profile.id;
            user.displayName = profile.displayName;
            user.username = profile.username;
            user.token = token;
            user.token_secret = tokenSecret;

            db.users.save(user, function (err) {
                if (err) { return done(err); }

                done(null, user);
            });
        });
    }
));


passport.serializeUser(function(user, done) {
    return done(null, user.twitter_id);
});

passport.deserializeUser(function(twitter_id, done) {
    db.users.findOne( {twitter_id: twitter_id } , function (err, user) {
        done(err, user);
    });
});


validateNewProfile = function(req, callback){
    try{
        check(req.body.artist_name, 'Artist Name Required').notEmpty();
        var performer = {};
        performer.artist_name = req.body.artist_name;
        performer.slug = util.slugify(req.body.artist_name);
        performer.description = req.body.description;
        performer.image = req.body.image;
        performer.digital_tip_jar_url = req.body.digital_tip_jar_url;
        performer.user = req.user;

        callback(null, performer);

    } catch (e) {
        callback(e, null);
    }
};

validateUpdateProfile = function(req, callback){
    try{
        check(req.body.artist_name, 'Artist Name Required').notEmpty();

        db.performers.findOne({_id: req.body._id}, function(error, performer){
            if(performer == null){
                e = {};
                e.message = 'Email taken';
                callback(e, null);
            }
            if(user && user.username != req.user.username){
                e = {};
                e.message = 'Email taken';
                callback(e, null);
            }else{
                req.user.email = req.body.email;

                if(req.body.password.length > 0){
                    req.user.password = bcrypt.hashSync(req.body.password, config.BCRYPT_WORK_FACTOR)
                }

                callback(null, req.user);
            }
        });

    } catch (e) {
        callback(e, null);
    }
};


validateNewEvent = function(req, callback){
    try{
        check(req.body.start, 'Start Required').notEmpty();
        check(req.body.end, 'End Required').notEmpty();

        var event = {};
        event.id = '';
        event.coordinates = { lat: req.body.lat, lon: req.body.lon };
        event.location = req.body.location;
        event.start = req.body.start;
        event.end = req.body.end;
        event.performer = req.user;

        callback(null, event);

    } catch (e) {
        callback(e, null);
    }
};


validateUpdateEvent = function(req, callback){
    try{
        check(req.body.start, 'Start Required').notEmpty();
        check(req.body.end, 'End Required').notEmpty();

        db.events.findOne({id: req.body.id}, function(error, event){
            if(event){
                event.coordinates = { lat: req.body.lat, lon: req.body.lon };
                event.location = req.body.location;
                event.start = req.body.start;
                event.end = req.body.end;
                event.performer = req.user;

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
    res.redirect('/login')
};


/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Express' });
};

exports.auth_twitter = passport.authenticate('twitter',
    {successRedirect: '/create-profile', failureRedirect: '/', failureFlash: true }
);

exports.log_out = function(req, res){
    req.logout();
    res.redirect('/');
};

exports.update = function(req, res, next){
    res.render('user_update', { user:req.user, message: req.flash('error') });
};

exports.update_post = function(req, res, next){
    validateUpdate(req, function(e, user){
        if(e){
            return res.render('user_update', {user:req.user, message: e.message});
        }

        db.users.save(user, function (err) {
            if (err){
                res.render('user_update', { user:req.user });
            }else{
                res.redirect('/');
            }
        });
    });
};

exports.user_profile = function(req, res){
    var page = 1;

    if(req.params.page){
        page = req.params.page;
    }


    db.users.findOne({ username: req.params.username }, function(error, user){
        if(error || user == null){
            return res.send(404, 'Not Found');
        }

        res.render('user_profile', {user: req.user, message: req.flash('error'), profile_user: user});
    });
};

exports.performer_events = function(req, res){
    res.render('events');
};

exports.events = function(req, res){
    res.render('events');
};


exports.event = function(req, res){
    res.render('event');
};

exports.create_profile = function(req, res){
    res.render('create-profile', { user:req.user, message: req.flash('error') });
};

exports.create_profile_post = function(req, res){
    validateUpdate(req, function(e, user){
        if(e){
            return res.render('create-profile', {user:req.user, message: e.message});
        }

        db.users.save(user, function (err) {
            if (err){
                res.render('create-profile', { user:req.user, message: req.flash('error') });
            }else{
                res.redirect('/');
            }
        });
    });
};

exports.profile = function(req, res){
    res.render('profile');
};

exports.new_event = function(req, res){
    res.render('new-event');
};

exports.new_event_post = function(req, res){
    validateNewEvent(req, function(e, event){
        if(e){
            return res.render('new-event', {user:req.user, message: e.message});
        }

        db.events.save(event, function (err) {
            if (err){
                res.render('new-event', { user:req.user, message: req.flash('error') });
            }else{
                res.redirect('/');
            }
        });
    });
};
