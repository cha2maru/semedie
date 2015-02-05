// FeedService.js - in api/services
// 

/*jshint node: true */

var EventEmitter = require('events').EventEmitter;
var util = require("util");
var merge = require('merge');

/**
 * [exports description]
 * @type {Object}
 */
module.exports = {
    getSubscribeFlow: function(url) {
        return  new SubscribeFlow(url);
    }
};


var SubscribeFlow = function(url) {
    var flow = {
        start: {
            action: 'start',
            param: 'FindUrl'
        },
        done: {
            FindUrl: {
                action: 'start',
                param: 'RequestFeed'
            },
            RequestFeed: {
                action: 'notify',
                param: 'End'
            },
            GetChannel: {
                action: 'start',
                param: 'ModifyChannel'
            },
            ModifyChannel: {
                action: 'notify',
                param: 'Channel'
            },
            GetEpisode: {
                action: 'start',
                param: 'ModifyEpisode'
            },
            ModifyEpisode: {
                action: 'notify',
                param: 'Episode'
            },
            GetMedia: {
                action: 'notify',
                param: 'Media'
            },
            ModifyMedia: {
                action: 'notify',
                param: 'Media'
            }
        },
        get: {
            Meta: {
                action: 'start',
                param: 'GetChannel'
            },
            Item: {
                action: 'start',
                param: 'GetEpisode'
            }
        }
    };
    return new BasicFlow(url,flow);
};


var BasicFlow = function(url,flow) {
    var Obj = function(url,flow) {
        this.url = url;
        this.actions = [];
        this.flow = flow;

        this.on('start', function() {
            var next = getNextAction('start', {}, this);
            startNextAction(next, {}, this);
        });

        this.on('done', function(data) {
            var next = getNextAction('done', data, this);
            startNextAction(next, data, this);
        });

        this.on('get', function(data) {
            var next = getNextAction('get', data, this);
            startNextAction(next, data, this);
        });

        this.on('error', function(data) {
            console.log('error');
            console.log(data);
        });

        var getNextAction = function(event, data, self) {
            if (event === 'start') return self.flow[event];
            return self.flow[event][data.type];
        };

        var startNextAction = function(next, data, self) {
            if (!next) {
                next = {
                    action: 'notify',
                    param: 'next action missing'
                };
            }
            switch (next.action) {
                case 'start':
                    var targetAction = getAction(next.param, data.url, {}, PluginService.PluginList);
                    var num = self.actions.push(targetAction);
                    self.actions[num - 1].action(data, self);
                    break;
                case 'notify':
                    self.emit(next.param, data.data);
                    break;
                default:
                    break;
            }
        };

        var getAction = function(action, url, option, plugin) {
            var op = option;
            if (plugin[action].list) {
                plugin[action].list.forEach(function(ele) {
                    var re = new RegExp(ele.regexp);
                    if (re.exec(url)) {
                        return ele
                            .action(url, merge(op, ele.option));
                    }

                });
            }
            return plugin[action].action(url, merge(op, plugin[action].option));
        };

        EventEmitter.call(this);
    }
    util.inherits(Obj, EventEmitter);
    return new Obj(url,flow);
}
