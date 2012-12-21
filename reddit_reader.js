'use strict';

var http = require('http'),
    sys = require('util'),
    events = require('events');

function Reader() {


    if (!(this instanceof Reader)) {
        //console.log("external constructor");
        return new Reader();
    }

    events.EventEmitter.call(this);

    var config = {
        cookie: "reddit_session=11938600%2C2012-03-08T21%3A49%3A03%2C79faf3df2f07ff03897e67943b15ddc911c8188c",
    },
    get_new_posts = function (subreddit, cb, error) {
        var data,
        res = http.get({
                host: 'www.reddit.com',
                port: 80,
                path: '/r/' + subreddit + '/new/.json',
                method: 'GET',
                headers: {
                    'Host': 'www.reddit.com',
                    'Cookie': config.cookie
                }
        }, function (res) {
            data = "";

            res.on('data', function (chunk) {
                data += chunk;
            });

            res.on('error', function (e) {
                error(e);       
            });
            res.on('end', function () {

                var posts = [],
                    results = {},
                    items = {},
                    article; //cache

                try {
                    results = JSON.parse(data);
                } catch (e) {
                    error(e);
                }


                items = results.data.children;
            
                for (var i = 0; i < items.length; i++) {
                    article = items[i].data;
                    posts.push({
                        title: article.title,
                        url: article.permalink,
                        id: article.id,
                        author: article.author
                    });
                }

                cb(posts);
            });
        });
    },
    cache = {
        
    },
    interval,
    self = this,
    error = function (err) {
        self.emit('error', err);
    },
    go = function (subreddit, how_often) {
        var interval_t = (how_often ? how_often : 120000),
            new_posts = [],
            post = {},
            i,
            count = 0,
            program = function () {

                get_new_posts(subreddit, function (posts) {
                    new_posts = [];
                    for (i=0; i< posts.length; i++) {
                        if (cache[posts[i].id]) {
                            //we already have this post, do nothing
                        } else {
                            cache[posts[i].id] = posts[i]; //cache the post
                            new_posts.push(posts[i]);
                        }
                    }

                    if(count < 1) {
                        interval = setInterval(program, interval_t);
                    }

                    if (new_posts.length) {
                        self.emit('posts', {
                            posts: new_posts,
                            count: count
                        });
                    } else {
                        self.emit('silence', {
                            posts: null,
                            count: count
                        });
                    }

                    count++;

                }, error)

            };

            program();
    };

    this.get = get_new_posts;
    this.go  = go;
    this.stop = function () {
        clearInterval(interval);
    }

}


sys.inherits(Reader, events.EventEmitter);
exports.Reader = Reader;
