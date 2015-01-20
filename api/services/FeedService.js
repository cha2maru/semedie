// FeedService.js - in api/services
// 

var FeedParser = require('feedparser'),
    http = require('http'),
    request = require('request'),
    Iconv = require('iconv').Iconv;

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




/**
 * [getTask description]
 * @param  {[type]} target [description]
 * @param  {[type]} url    [description]
 * @return {[type]}        [description]
 */
var getTask = function(target, tasks, url) {
    var tasklist = tasks[target].list;
    for (var i = 0; i < tasklist.length; i++) {
        if (url.regexp(tasklist[i].regexp)) {
            return tasklist[i];
        }
    }
    return {
        action: tasks[target].action,
        option: tasks[target].action
    };
};


/**
 * [defaultTasks description]
 * @type {Object}
 */
var defaultTasks = {
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
            action: function(url, callback) {
                callback(url);
            }
        };
    },
    GetFeed: function(url, option) {
        var getFeedDynamic = function(url, tasks, callback) {
            // 指定urlにhttpリクエストする
            request.get(url)
                .on('error', function(err) {
                    console.log(err);
                }).on('response', function(res) {
                    if (res.statusCode !== 200)
                        return this.emit('error', new Error('Bad status code'));
                    var charset;
                    if (tasks.checkContentType(res.headers['content-type'])) {
                        charset =
                            getParams(res.headers['content-type'] || '').charset;
                        console.log(res.headers['content-type']);
                        res = maybeTranslate(res, charset);
                        res.pipe(tasks.getFeedParser(tasks, callback));
                    } else {
                        // TODO: フィードのURL探してきて突っ込む？
                        charset =
                            getParams(res.headers['content-type'] || '').charset;
                        console.log(res.headers['content-type']);
                        res = maybeTranslate(res, charset);
                        res.pipe(tasks.parseFeed(tasks, callback));
                    }
                });
        };
        var getFeedStatic = function(url, tasks, callback) {
            // 指定urlにhttpリクエストする
            request.get(url)
                .on('error', function(err) {
                    console.log(err);
                }).on('response', function(res) {
                    if (res.statusCode !== 200)
                        return this.emit('error', new Error('Bad status code'));
                    if (tasks.checkContentType(res.headers['content-type']))
                        return this.emit('error', new Error('Bad Content Type'));
                    var charset =
                        getParams(res.headers['content-type'] || '').charset;
                    console.log(res.headers['content-type']);
                    res = maybeTranslate(res, charset);
                    res.pipe(tasks.parseFeed(tasks, callback));
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
    checkContentType: function(param) {
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
    },
    parseFeed: function(tasks, callback) {
        var parser = new FeedParser();
        parser.on('error', function(err) {
                console.error('HTTP failure while fetching feed');
                callback('error', err);
            })
            .on('meta', function(meta) {
                var channel = tasks.getChannel(meta);
                channel = tasks.modifyChannel(channel);
                // console.log(channel);
                callback('channel', channel);
            })
            .on('readable', function() {
                var stream = this,
                    item;
                // chunkデータを保存する
                while (item = stream.read()) {
                    var episode = tasks.getEpisode(item);
                    episode = tasks.modifyEpisode(episode);
                    // console.log(episode);
                    callback('episode', episode);
                }
            })
            .on('end', function() {
                callback('end', {});
            });
        return parser;
    },
    /**
     * [getChannel description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    getChannel: function(data) {
        return {
            title: data.title,
            description: data.description,
            link: data.link,
            date: data.date,
            xmlurl: data.xmlurl,
            image: (data.image) ? data.image : "",
        };
    },
    /**
     * [modifyChannel description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
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
