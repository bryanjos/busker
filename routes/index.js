var mongojs = require('mongojs')
    , ObjectId = mongojs.ObjectId
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
var slug_length = 4;

/*
user schema
{
    _id,
    slug,
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
    slug,
    artist_name,
    description,
    picture,
    digital_tip_jar_url,
    user,
    created
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
                user = { created: Date.now, slug: utils.generateRandomToken(slug_length) };
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
        check(req.body.name, 'Artist Name Required').notEmpty();
        var performer = {};
        performer.artist_name = req.body.name;
        performer.description = req.body.description;
        performer.digital_tip_jar_url = req.body.digital_tip_url;
        performer.user = req.user;
        performer.created = Date.now;
        performer.slug = utils.generateRandomToken(slug_length);

        if(req.files.picture.name != ''){
            utils.uploadPhoto(req.files.picture, function(err, data){
                if(err){
                    callback(err, null);
                }

                performer.picture = data;
                callback(null, performer);
            });
        }else{
            callback(null, performer);
        }

    } catch (e) {
        callback(e, null);
    }
};

validateUpdateProfile = function(req, callback){
    try{
        check(req.body.artist_name, 'Artist Name Required').notEmpty();

        db.performers.findOne({slug: req.body.slug}, function(error, performer){
            if(performer == null){
                e = {};
                e.message = 'No performer found';
                callback(e, null);
            }else if(error){
                callback(error, null);
            }else{
                performer.artist_name = req.body.name;
                performer.description = req.body.description;
                performer.digital_tip_jar_url = req.body.digital_tip_url;
                performer.user = req.user;

                if(req.files.picture.name != ''){
                    utils.uploadPhoto(req.files.picture, function(err, data){
                        if(err){
                            callback(err, null);
                        }

                        performer.picture = data;
                        callback(null, performer);
                    });
                }else{
                    callback(null, performer);
                }
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
        event.coordinates = req.body.coordinates;
        event.location = req.body.location;
        event.start = req.body.start;
        event.end = req.body.end;
        event.created = Date.now;
        event.slug = utils.generateRandomToken(slug_length);

        db.performers.findOne({slug: req.params.id}, function(e, performer){
            if(e){
                callback(e, null);
            }else{
                event.performer = performer;
                callback(null, event);
            }
        });

    } catch (e) {
        callback(e, null);
    }
};


validateUpdateEvent = function(req, callback){
    try{
        check(req.body.start, 'Start Required').notEmpty();
        check(req.body.end, 'End Required').notEmpty();

        db.events.findOne({slug: req.params.slug}, function(error, event){
            if(event){
                event.coordinates = req.body.coordinates;
                event.location = req.body.location;
                event.start = req.body.start;
                event.end = req.body.end;

                db.performers.findOne({slug: req.params.performer_slug}, function(e, performer){
                    if(e){
                        callback(e, null);
                    }else{
                        event.performer = performer;
                        callback(null, event);
                    }
                });

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
  res.render('index', { title: 'Express', message: null });
};

exports.auth_twitter = passport.authenticate('twitter',
    {successRedirect: '/create-profile', failureRedirect: '/', failureFlash: true }
);

exports.log_out = function(req, res){
    req.logout();
    res.redirect('/');
};

exports.performer_events = function(req, res){
    db.events.find({ "performer.slug" : req.params.slug}, function(err, events){
        if(err){
            return res.redirect('/');
        }

        res.render('events', {user:req.user, message: req.flash('error'), events: events});
    });
};

exports.events = function(req, res){
    db.events.find({}, function(err, events){
        if(err){
            return res.redirect('/');
        }

        res.render('events', {user:req.user, message: req.flash('error'), events: events});
    });
};


exports.event = function(req, res){
    db.events.findOne({slug: req.params.event_slug}, function(err, event){
        if(err){
            return res.redirect('/');
        }

        res.render('event', {user:req.user, message: req.flash('error'), event: event});
    });
};

exports.create_profile = function(req, res){
    res.render('create-profile', { user:req.user, message: req.flash('error') });
};

exports.create_profile_post = function(req, res){
    validateNewProfile(req, function(e, performer){
        if(e){
            console.log(e);
            return res.render('create-profile', {user:req.user, message: e.message});
        }

        db.performers.save(performer, function (err) {
            if (err){
                res.render('create-profile', { user:req.user, message: req.flash('error') });
            }else{
                res.redirect('/profiles/' + performer.slug);
            }
        });
    });
};

exports.profile = function(req, res){
    db.performers.findOne({slug: req.params.slug}, function(err, performer){
        if(err){
            return res.redirect('/');
        }

        if(performer == null){
            return res.send(404);
        }

        res.render('profile', {user:req.user, message: req.flash('error'), performer: performer});
    });
};

exports.edit_profile = function(req, res){
    db.performers.findOne({slug: req.params.slug}, function(err, performer){
        if(err){
            return res.redirect('/');
        }

        if(performer == null || performer.user.twitter_id != req.user.twitter_id){
            return res.send(404);
        }

        res.render('create-profile', {user:req.user, message: req.flash('error'), performer: performer});
    });
};

exports.edit_profile_post = function(req, res, next){
    db.performers.findOne({slug: req.params.slug}, function(err, performer){
        if(err){
            return res.render('/create-profile', {user:req.user, message: e.message});
        }

        if(performer == null || performer.user.twitter_id != req.user.twitter_id){
            return res.send(404);
        }

        validateUpdateProfile(req, function(e, profile){
            if(e){
                return res.render('/create-profile', {user:req.user, message: e.message});
            }

            db.performers.save(profile, function (err) {
                if (err){
                    res.render('/create-profile', { user:req.user, message: null });
                }else{
                    res.redirect('/profiles/' + performer.slug);
                }
            });
        });
    });
};

exports.new_event = function(req, res){
    res.render('new-event', {message: null});
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


exports.edit_event = function(req, res){
    res.render('new-event', {message: null});
};

exports.edit_event_post = function(req, res){
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
