var path = require('path')
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

exports.generateRandomToken = function(len){
    var chars = "_!abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
        token = '';
    for ( var x = 0; x < len; x++ ) {
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

exports.getUser = function(req){
  if(req.user)
    return req.user;
  else
    return null;
}

