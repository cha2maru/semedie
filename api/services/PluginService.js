/**
 * PluginService.js - in api/services
 */

/*jshint node: true */


var FeedParser = require('feedparser'),
    // http = require('http'),
    request = require('request'),
    Iconv = require('iconv').Iconv,
    merge = require('merge');


module.exports = {
    pluginList: defaultList,
    getAction: function(target, data, option) {
        return getAction(target, data.url, option, this.pluginList);
    },
    getFindUrl: function(data, option) {
        return getAction('FindUrl', data.url, option, this.pluginList);
    },
    getGetFeed: function(data, option) {
        return getAction('GetFeed', data.url, option, this.pluginList);
    },
    getParseFeed: function(data, option) {
        return getAction('ParseFeed', data.url, option, this.pluginList);
    },
    getFeedServiceData: function(url, eventemit, callback) {
        return {
            url: url,
            http: {},
            feed: {
                meta: {},
                items: []
            },
            channel: {},
            episodes: [],
            media: [],
            eventemit:eventemit,
            callback: callback
        };
    }
};


var getAction = function(target, url, option, plugin) {
    var op = option;
    for (var i = 0; i < plugin[target].list.length; i++) {
        if (url.regexp(plugin[target].list[i].regexp)) {
            return plugin[target].list[i]
                .action(url, merge(op, plugin[target].option));
        }
    }
    return plugin[target].action(url, merge(op, plugin[target].option));
};

/**
 * [defaultTasks description]
 * @type {Object}
 */
var defaultList = {
    FindUrl: {
        list: [{
            regexp: ".*",
            action: defaultAction.FindUrl,
            option: {}
        }],
        action: defaultAction.FindUrl
    },
    GetFeed: {
        list: [{
            regexp: ".*",
            action: defaultAction.GetFeed,
            option: {}
        }],
        action: defaultAction.GetFeed,
        option: {}
    },
    ParseFeed: {
        list: [{
            regexp: ".*",
            action: defaultAction.ParseFeed,
            option: {}
        }],
        action: defaultAction.ParseFeed,
        option: {}
    },
    GetChannel: {
        list: [{
            regexp: ".*",
            action: defaultAction.GetChannel,
            option: {}
        }],
        action: defaultAction.GetChannel,
        option: {}
    },
    GetEpisode: {
        list: [{
            regexp: ".*",
            action: defaultAction.GetEpisode,
            option: {}
        }],
        action: defaultAction.GetEpisode,
        option: {}
    },
    ModifyChannel: {
        list: [{
            regexp: ".*",
            action: defaultAction.ModifyChannel,
            option: {}
        }],
        action: defaultAction.ModifyChannel,
        option: {}
    },
    ModifyEpisode: {
        list: [{
            regexp: ".*",
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
            action: function(data, callback) {
                callback(data);
            }
        };
    },
    GetFeed: function(url, option) {
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
                } catch (err) {
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
        var getFeedDynamic = function(data, callback) {
            // 指定urlにhttpリクエストする
            request.get(data.url)
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
                        callback(data);
                    } else {
                        // TODO: フィードのURL探してきて突っ込む？
                        charset =
                            getParams(res.headers['content-type'] || '').charset;
                        console.log(res.headers['content-type']);
                        data.http = maybeTranslate(res, charset);
                        callback(data);
                    }
                });
        };
        var getFeedStatic = function(data, callback) {
            // 指定urlにhttpリクエストする
            request.get(data.url)
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
                    data.http = maybeTranslate(res, charset);
                    callback(data);
                });
        };


        if (option.pattern === "static") {
            return {
                option: option,
                action: getFeedStatic
            };
        } else {
            return {
                option: option,
                action: getFeedDynamic
            };
        }
    },
    ParseFeed: function(url, option) {
        return {
            option: option,
            action: function(data, callback) {
                var parser = new FeedParser();
                parser.on('error', function(err) {
                        console.error('HTTP failure while fetching feed');
                        data.eventemit('error', err);
                    })
                    .on('meta', function(meta) {
                        data.feed.meta = meta;
                        data.eventemit('channel', data);
                    })
                    .on('readable', function() {
                        var stream = this,
                            episode;
                        // chunkデータを保存する
                        while (episode = stream.read()) {
                            if (!data.episode) data.episode = [];
                            data.feed.episode.push(episode);
                            data.eventemit('episode', data);
                        }
                    })
                    .on('end', function() {
                        callback('end', data);
                    });
                data.http.pipe(parser(data, callback));
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
            action: function(data, callback) {
                data.channel ={
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
    ModifyChannel: function(data, option) {
        return {
            option: option,
            action: function(data, callback) {
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
    modifyChannel: function(data) {
        for (var i in data) {
            data[i] = setNullChar(data[i]);
        }
        return data;
    },
    /**
     * [getEpisode description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    getEpisode: function(data) {
        return {
            title: (data.title) ? data.title : "",
            description: (data.description) ? data.description : "",
            date: (data.date) ? data.date : "",
            link: (data.link) ? data.link : "",
            image: (data.image) ? data.image : "",
            enclosures: data.enclosures,
        };
    },
    /**
     * [modifyEpisode description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    modifyEpisode: function(data) {
        for (var i in data) {
            data[i] = setNullChar(data[i]);
        }
        data.image = "";
        return data;
    },
    /**
     * [getMedia description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    getMedia: function(data) {
        return data;
    },
    /**
     * [modifyMedia description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    modifyMedia: function(data) {
        for (var i in data) {
            data[i] = setNullChar(data[i]);
        }
        data.image = "";
        return data;
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
