var path = require('path')
    , bcrypt = require('bcrypt')
    , rest = require('restler')
    , config = require('../config');

exports.slugify = function(text) {
    text = text.replace(/[^-a-zA-Z0-9,&\s]+/ig, '');
    text = text.replace(/-/gi, "_");
    text = text.replace(/\s/gi, "-");
    return text;
};

exports.path = function() {
    return path.dirname(process.mainModule.filename);
};

exports.getExtension = function(filename) {
    var ext = path.extname(filename||'').split('.');
    return ext[ext.length - 1];
};


exports.validPassword = function(user, password){
    return bcrypt.compareSync(password, user.password);
};

exports.generateRandomToken = function(user){
    var chars = "_!abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
        token = new Date().getTime() + '_';
    for ( var x = 0; x < 16; x++ ) {
        var i = Math.floor( Math.random() * 62 );
        token += chars.charAt( i );
    }
    return token;
};

exports.uploadPhoto = function(file, callback){
    rest.post(config.FILE_SERVER, {
        multipart: true,
        data: {
            'image': rest.file(file.path, file.name, file.size, null, file.type)
        }
    }).on('success', function(data) {
            callback(null, data);
        }).on('error', function(err){
            callback(err, null);
        });
};


