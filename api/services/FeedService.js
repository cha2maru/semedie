// FeedService.js - in api/services
// 

/*jshint node: true */


var async = require('async');

/**
 * [exports description]
 * @type {Object}
 */
module.exports = {
    subscribe: function(url, callback) {
        var findUrl = getTask("findUrl", defaultTasks, url);
        var callbackWrapper = {
            defaultCallback: callback,
            callback: function(target, option, data, callback) {
                switch (event) {
                    case 'channel':

                        break;
                    default:
                }
            }
        };
        findUrl.action(url, findUrl.option, function(target) {
            var getFeed = getTask("getFeed", defaultTasks, target);
            getFeed.action(target, getFeed.option, callbackWrapper);
        });
    }
};


var flowController = function(url, callback) {
    var data = {};
    data.url = url;
    data.callback = callback;
    data.eventemit = function(event, data) {
        switch (event) {
            case 'channel':
                this.callback('channel', data);
                break;
            case 'episode':
                this.callback('episode', data);
                break;
            case 'media':
                this.callback('media', data);
                break;
            case 'end':
                this.callback('end', data);
                break;
            case 'error':
                this.callback('error', data);
                break;
            default:
                this.callback('error', data);
        }
    };

    async.waterfall([
        /**
         * findUrl
         * @param  {Function} callback [description]
         * @return {[type]}            [description]
         */
        function(url, callback) {
            var findUrl = PluginService.getAction('FindUrl',data, {});
            findUrl(data, function(data) {
                callback(null, data);
            });
        },
        /**
         * getFeed
         * @param  {[type]}   url      [description]
         * @param  {Function} callback [description]
         * @return {[type]}            [description]
         */
        function(data, callback) {
            var getFeed = PluginService.getAction('GetFeed',data, {});
            getFeed(data, function(data) {
                callback(null, data);
            });

        },
        /**
         * ParseFeed
         * @param  {[type]}   url      [description]
         * @param  {[type]}   res      [description]
         * @param  {Function} callback [description]
         * @return {[type]}            [description]
         */
        function(data, callback) {
            var parseFeed = PluginService.getAction('ParseFeed',data, {});
            parseFeed(data, function(data) {
                callback(null, data);
            });
        }
    ], function(err, data) {
        if (err) {
            throw err;
        }
        console.log('all done.');
        console.log(data);
    });
};
