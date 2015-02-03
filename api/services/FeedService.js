// FeedService.js - in api/services
// 

/*jshint node: true */


/**
 * [exports description]
 * @type {Object}
 */
module.exports = {
    subscribe: function(url, callback) {
        var getfeedFlow = PluginService.getFeedService(url);
        getfeedFlow.on('Channel', function(data) {
                callback('Channel', data);
            })
            .on('Episode', function(data) {
                callback('Episode', data);
            });
        getfeedFlow.emit('start', {});
    }
};
