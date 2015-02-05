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
    getAction: function(){},
    reloadPlugin: function(){},
    addPlugin: function(){},
    delPlugin: function(){}
};

var DefaultPlugin = {
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
            request.get(target.target)
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
                        parseFeed(res, target, flow);
                    }
                    else {
                        // TODO: フィードのURL探してきて突っ込む？
                        charset =
                            getParams(res.headers['content-type'] || '').charset;
                        console.log(res.headers['content-type']);
                        res = maybeTranslate(res, charset);
                        parseFeed(res, target, flow);
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
                    parseFeed(res, target, flow);
                });
        };

        var parseFeed = function(res, target, flow) {
            var parser = new FeedParser();
            parser
                .on('meta', function(meta) {
                    flow.emit('get', {
                        type: 'Meta',
                        target: meta.link,
                        data: meta
                    });
                })
                .on('readable', function() {
                    var stream = this;
                    // chunkデータを保存する
                    while (item = stream.read()) {
                        // if (!data.episode) data.episode = [];
                        // data.feed.episode.push(episode);
                        flow.emit('get', {
                            type: 'Item',
                            target: item.link,
                            data: item
                        });
                    }
                })
                .on('end', function() {
                    flow.emit('done', {
                        type: 'RequestFeed',
                        target: target.target,
                        data: {}
                    });
                }).on('error', function(err) {
                    console.error('HTTP failure while fetching feed');
                    flow.emit('error', err);
                });
            res.pipe(parser);
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
    /**
     * [getChannel description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    GetChannel: function(data, option) {
        return {
            option: option,
            action: function(target, flow) {
                var data = {
                    title: target.data.title,
                    description: target.data.description,
                    link: target.data.link,
                    date: target.data.date,
                    xmlurl: target.data.xmlurl,
                    image: (target.data.image) ? target.data.image : "",
                };
                flow.emit('done', {
                    type: 'ModifyChannel',
                    target: data.link,
                    data: data
                });
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
                flow.emit('done', {
                    type: 'ModifyChannel',
                    target: target.link,
                    data: target.data
                });
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
                var data = {
                    title: (target.data.title) ? target.data.title : "",
                    description: (target.data.description) ? target.data.description : "",
                    date: (target.data.date) ? target.data.date : "",
                    link: (target.data.link) ? target.data.link : "",
                    image: (target.data.image) ? target.data.image : "",
                    enclosures: target.data.enclosures,
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


/**
 * [defaultTasks description]
 * @type {Object}
 */
module.exports.PluginList = {
    FindUrl: {
        list: [{
            regexp: ".*nico.*",
            action: DefaultPlugin.FindUrl,
            option: {}
        }],
        action: DefaultPlugin.FindUrl,
        option: {},
    },
    RequestFeed: {
        list: [{
            regexp: ".*nico.*",
            action: DefaultPlugin.RequestFeed,
            option: {}
        }],
        action: DefaultPlugin.RequestFeed,
        option: {},
    },
    GetChannel: {
        list: [{
            regexp: ".*nico.*",
            action: DefaultPlugin.GetChannel,
            option: {}
        }],
        action: DefaultPlugin.GetChannel,
        option: {}
    },
    GetEpisode: {
        list: [{
            regexp: ".*nico.*",
            action: DefaultPlugin.GetEpisode,
            option: {}
        }],
        action: DefaultPlugin.GetEpisode,
        option: {}
    },
    ModifyChannel: {
        list: [{
            regexp: ".*nico.*",
            action: DefaultPlugin.ModifyChannel,
            option: {}
        }],
        action: DefaultPlugin.ModifyChannel,
        option: {}
    },
    ModifyEpisode: {
        list: [{
            regexp: ".*nico.*",
            action: DefaultPlugin.ModifyEpisode,
            option: {}
        }],
        action: DefaultPlugin.ModifyEpisode,
        option: {}
    }
};
