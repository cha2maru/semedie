/**
 * PluginService.js - in api/services
 */

/*jshint node: true */


var FeedParser = require('feedparser'),
    // http = require('http'),
    request = require('request'),
    Iconv = require('iconv').Iconv,
    merge = require('merge');
var EventEmitter = require('events').EventEmitter;
var util = require("util");


module.exports = {
    pluginList: defaultList,
    getAction: function(action, target, option) {
        return getAction(action, target.url, option, this.pluginList);
    },
    getFeedService: function(url) {
        var flow = new SubscribeFlow(url);
        return flow;
    }
};

var SubscribeFlow = function(url) {
    this.url = url;
    this.actions = [];
    this.done = {};
    this.get = {};
    this.flow = {
        start: {
            action: 'start',
            param: 'FindUrl'
        },
        done: {
            FindUrl: {
                action: 'start',
                param: 'GetFeed'
            },
            GetFeed: {
                action: 'start',
                param: 'ParseFeed'
            },
            ParseFeed: {
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
                target: 'GetChannel'
            },
            Item: {
                action: 'start',
                param: 'GetEpisode'
            }
        }
    };

    // var data = {
    //     type: 'Meta',
    //     target: 'url',
    //     data: {}
    // };
    // var next = {
    //     action: 'start',
    //     param: 'GetEpisode'
    // };

    this.on('start', fucntion() {
        var next = getNextAction('start', {});
        startNextAction(next, {});
    }).on('done', fucntion(data) {
        var next = getNextAction('done', data);
        startNextAction(next, data);
    }).on('get', fucntion(data) {
        var next = getNextAction('get', data);
        startNextAction(next, data);
    });

    var getNextAction = function(event, data) {
        if (event === 'start') return this.flow[event];
        return this.flow[event][data.type];
    };

    var startNextAction = function(next, data) {
        switch (next.action) {
            case 'start':
                var targetAction = getAction(next.param, data.url, {}, PluginService.pluginList);
                var num = this.actions.push(targetAction);
                this.actions[num - 1].action(data, this);
                break;
            case 'notify':
                this.emit(next.param, data.data);
                break;
            default:
                break;
        }
    };

    var getAction = function(action, url, option, plugin) {
        var op = option;
        for (var i = 0; i < Plugin[action].list.length; i++) {
            if (url.regexp(plugin[action].list[i].regexp)) {
                return plugin[action].list[i]
                    .action(url, merge(op, plugin[action].option));
            }
        }
        return plugin[action].action(url, merge(op, plugin[action].option));
    };

    EventEmitter.call(this);
};

util.inherits(FeedServiceData, EventEmitter);



/**
 * [defaultTasks description]
 * @type {Object}
 */
var defaultList = {
    FindUrl: {
        list: [{
            regexp: ".*nico.*",
            action: defaultAction.FindUrl,
            option: {}
        }],
        action: defaultAction.FindUrl,
        option: {},
    },
    RequestFeed: {
        list: [{
            regexp: ".*nico.*",
            action: defaultAction.RequestFeed,
            option: {}
        }],
        action: defaultAction.RequestFeed,
        option: {},
    },
    ParseFeed: {
        list: [{
            regexp: ".*nico.*",
            action: defaultAction.ParseFeed,
            option: {}
        }],
        action: defaultAction.ParseFeed,
        option: {},
    },
    GetChannel: {
        list: [{
            regexp: ".*nico.*",
            action: defaultAction.GetChannel,
            option: {}
        }],
        action: defaultAction.GetChannel,
        option: {}
    },
    GetEpisode: {
        list: [{
            regexp: ".*nico.*",
            action: defaultAction.GetEpisode,
            option: {}
        }],
        action: defaultAction.GetEpisode,
        option: {}
    },
    ModifyChannel: {
        list: [{
            regexp: ".*nico.*",
            action: defaultAction.ModifyChannel,
            option: {}
        }],
        action: defaultAction.ModifyChannel,
        option: {}
    },
    ModifyEpisode: {
        list: [{
            regexp: ".*nico.*",
            action: defaultAction.ModifyEpisode,
            option: {}
        }],
        action: defaultAction.ModifyEpisode,
        option: {}
    }
};

var defaultAction = {
    FindUrl: function(url, option) {
        return {
            option: option,
            // var data = {
            //     type: 'Meta',
            //     target: 'url',
            //     data: {}
            // };
            action: function(target, flow) {
                flow.emit('done', {
                    type: 'FindUrl',
                    target: flow.url,
                    data: target
                });
            }
        };
    },
    RequestFeed: function(url, option) {
        /**
         * [getParams description]
         * @param  {[type]} str [description]
         * @return {[type]}     [description]
         */
        var getParams = function(str) {
            var params = str.split(';').reduce(function(params, param) {
                var parts = param.split('=').map(function(part) {
                    return part.trim();
                });
                if (parts.length === 2) {
                    params[parts[0]] = parts[1];
                }
                return params;
            }, {});
            return params;
        };

        /**
         * [checkContentType description]
         * @param  {[type]} param [description]
         * @return {[type]}       [description]
         */
        var checkContentType = function(param) {
            var typearray = [
                "application/xml",
                "application/rdf+xml",
                "application/rss+xml",
                "application/atom+xml"
            ];

            for (var i = 0; i < typearray.length; i++) {
                if (param.indexOf(typearray[i]) > -1) {
                    return true;
                }
                return false;
            }
        };

        /**
         * [maybeTranslate description]
         * @param  {[type]} res     [description]
         * @param  {[type]} charset [description]
         * @return {[type]}         [description]
         */
        var maybeTranslate = function(res, charset) {
            var iconv;
            // Use iconv if its not utf8 already.
            if (!iconv && charset && !/utf-*8/i.test(charset)) {
                try {
                    iconv = new Iconv(charset, 'utf-8');
                    console.log('Converting from charset %s to utf-8', charset);
                    iconv.on('error');
                    // If we're using iconv, stream will be the output of iconv
                    // otherwise it will remain the output of request
                    res = res.pipe(iconv);
                }
                catch (err) {
                    res.emit('error', err);
                }
            }
            return res;
        };


        /**
         * [getFeedDynamic description]
         * @param  {[type]}   url      [description]
         * @param  {[type]}   tasks    [description]
         * @param  {Function} callback [description]
         * @return {[type]}            [description]
         */
        var getFeedDynamic = function(target, flow) {
            // 指定urlにhttpリクエストする
            request.get(target.url)
                .on('error', function(err) {
                    console.log(err);
                }).on('response', function(res) {
                    if (res.statusCode !== 200)
                        return this.emit('error', new Error('Bad status code'));
                    var charset;
                    if (checkContentType(res.headers['content-type'])) {
                        charset =
                            getParams(res.headers['content-type'] || '').charset;
                        console.log(res.headers['content-type']);
                        res = maybeTranslate(res, charset);
                        // var data = {
                        //     type: 'Meta',
                        //     target: 'url',
                        //     data: {}
                        // };
                        flow.emit('done', {
                            type: 'GetFeed',
                            target: target.url,
                            data: res
                        });
                    }
                    else {
                        // TODO: フィードのURL探してきて突っ込む？
                        charset =
                            getParams(res.headers['content-type'] || '').charset;
                        console.log(res.headers['content-type']);
                        data.http = maybeTranslate(res, charset);
                        flow.emit('done', {
                            type: 'GetFeed',
                            target: target.url,
                            data: res
                        });
                    }
                });
        };
        var getFeedStatic = function(target, flow) {
            // 指定urlにhttpリクエストする
            request.get(target.url)
                .on('error', function(err) {
                    console.log(err);
                }).on('response', function(res) {
                    if (res.statusCode !== 200)
                        return this.emit('error', new Error('Bad status code'));
                    if (checkContentType(res.headers['content-type']))
                        return this.emit('error', new Error('Bad Content Type'));
                    var charset =
                        getParams(res.headers['content-type'] || '').charset;
                    console.log(res.headers['content-type']);
                    res = maybeTranslate(res, charset);
                    flow.emit('done', {
                        type: 'GetFeed',
                        target: target.url,
                        data: res
                    });
                });
        };


        if (option.pattern === "static") {
            return {
                option: option,
                action: getFeedStatic
            };
        }
        else {
            return {
                option: option,
                action: getFeedDynamic
            };
        }
    },
    ParseFeed: function(url, option) {
        return {
            option: option,
            action: function(target, flow) {
                var parser = new FeedParser();
                parser.on('error', function(err) {
                        console.error('HTTP failure while fetching feed');
                        flow.emit('error', err);
                    })
                    .on('meta', function(meta) {
                        flow.emit('get', {
                            type: 'Meta',
                            target: target.url,
                            data: meta
                        });
                    })
                    .on('readable', function() {
                        var stream = this,
                            // chunkデータを保存する
                            while (item = stream.read()) {
                                // if (!data.episode) data.episode = [];
                                // data.feed.episode.push(episode);
                                flow.emit('get', {
                                    type: 'Item',
                                    target: target.url,
                                    data: item
                                });
                            }
                    })
                    .on('end', function() {
                        flow.emit('done', {
                            type: 'ParseFeed',
                            target: target.url,
                            data: {}
                        });
                    });
                target.data.pipe(parser(data, callback));
            }
        };
    },
    /**
     * [getChannel description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    GetChannel: function(data, option) {
        return {
            option: option,
            action: function(target, flow) {
                data.channel = {
                    title: data.title,
                    description: data.description,
                    link: data.link,
                    date: data.date,
                    xmlurl: data.xmlurl,
                    image: (data.image) ? data.image : "",
                };
                callback(data);
            }
        };

    },
    /**
     * [modifyChannel description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    ModifyChannel: function(url, option) {
        return {
            option: option,
            action: function(target, flow) {
                data.channel = {
                    title: data.title,
                    description: data.description,
                    link: data.link,
                    date: data.date,
                    xmlurl: data.xmlurl,
                    image: (data.image) ? data.image : "",
                };
                callback(data);
            }
        };

    },
    /**
     * [getEpisode description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    GetEpisode: function(url, option) {
        return {
            option: option,
            action: function(target, flow) {
                data = {
                    title: (target.title) ? target.title : "",
                    description: (target.description) ? target.description : "",
                    date: (target.date) ? target.date : "",
                    link: (target.link) ? target.link : "",
                    image: (target.image) ? target.image : "",
                    enclosures: target.enclosures,
                };
                flow.emit('done', {
                    type: 'GetEpisode',
                    target: data.link,
                    data: data
                });
            }
        };

    },
    /**
     * [modifyEpisode description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    ModifyEpisode: function(url, option) {
        return {
            option: option,
            action: function(target, flow) {
                flow.emit('done', {
                    type: 'ModifyEpisode',
                    target: target.data.link,
                    data: target.data
                });
            }
        };

    },
    /**
     * [getMedia description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    GetMedia: function(url, option) {
        return {
            option: option,
            action: function(target, flow) {
                flow.emit('done', {
                    type: 'GetMedia',
                    target: target.data.link,
                    data: target.data
                });
            }
        };

    },
    /**
     * [modifyMedia description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    ModifyMedia: function(url, option) {
        return {
            option: option,
            action: function(target, flow) {
                flow.emit('done', {
                    type: 'ModifyMedia',
                    target: target.data.link,
                    data: target.data
                });
            }
        };

    }

};
/**
 * [setNullChar description]
 * @param {[type]} c [description]
 */
var setNullChar = function(c) {
    if (c !== undefined) return c;
    return "";
};
