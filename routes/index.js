var mongojs = require('mongojs')
    , passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy
    , fs = require('fs')
    , bcrypt = require('bcrypt')
    , check = require('validator').check
    , sanitize = require('validator').sanitize
    , underscore = require('underscore')
    , crypto = require('crypto')
    , utils = require('../utils')
    , config = require('../config');


var db = mongojs(config.DB_NAME, ['users']);

passport.use(new LocalStrategy(
    function(username, password, done) {
        db.users.findOne({ username: username }, function (err, user) {
            if (err) { return done(err); }

            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }

            if (!utils.validPassword(user, password)) {
                return done(null, false, { message: 'Incorrect password.' });
            }

            return done(null, user);
        });
    }
));


passport.serializeUser(function(user, done) {
    return done(null, user.username);
});

passport.deserializeUser(function(username, done) {
    db.users.findOne( {username: username } , function (err, user) {
        done(err, user);
    });
});


validateSignUp = function(req, callback){
    try{
        check(req.body.email, 'Email Required').notEmpty();
        check(req.body.username, 'Username Required').notEmpty();
        check(req.body.password, 'Password Required').notEmpty();
        check(req.body.email, 'Please enter a valid email').isEmail();
        db.users.findOne({username: req.body.username}, function(error, user){
            if(user){
                e = {};
                e.message = 'Username taken';
                callback(e, null);
            }else{
                db.users.findOne({email: req.body.email}, function(error, user){
                    if(user){
                        e = {};
                        e.message = 'Email taken';
                        callback(e, null);
                    }else{
                        var user = {
                            username: req.body.username,
                            password: bcrypt.hashSync(req.body.password, config.BCRYPT_WORK_FACTOR),
                            email: req.body.email,
                            created: Date.now
                        };

                        callback(null, user);
                    }
                });
            }
        });

    } catch (e) {
        callback(e, null);
    }
};

validateUpdate = function(req, callback){
    try{
        check(req.body.email, 'Email Required').notEmpty();
        check(req.body.email, 'Please enter a valid email').isEmail();

        db.users.findOne({email: req.body.email}, function(error, user){
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


exports.signup = function(req, res){
    res.render('user_signup', {user: req.user, message: req.flash('error')});
};

exports.signup_post = function(req, res){

    validateSignUp(req,function(e, user){
        if(e != null){
            return res.render('user_signup', {user: req.user, message: e.message});
        }

        db.users.save(user, function (err) {
            if (err){
                res.redirect('/signup');
            }else{
                req.flash('error', 'Signed up successfully');
                res.redirect('/login');
            }
        });
    });

};

exports.login = function(req, res){
    res.render('user_login', {user: req.user, message: req.flash('error')});
};

exports.login_post = passport.authenticate('local',
    { successRedirect: '/', failureRedirect: '/login', failureFlash: true }
);

exports.log_out = function(req, res){
    req.logout();
    res.redirect('/');
};

exports.update = function(req, res, next){
    res.render('user_update', { user:req.user, message: req.flash('error') });
};

exports.update_post = function(req, res, next){
    validateUpdate(req,function(e, user){
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

exports.events = function(req, res){
    res.render('events');
}
exports.event = function(req, res){
    res.render('event');
}
exports.create_profile = function(req, res){
    res.render('create-profile');
}
