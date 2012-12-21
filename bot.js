#!/usr/bin/env node

// Make sure the irc lib is available

var irc = require('irc'),
    Reader = require('./reddit_reader.js').Reader,
    reader = Reader('pics'),
    bot = {

        initialized     : false,
        muted           : false,
        lastquack       : new Date().getTime(),
        channel         : "#drama",

        //join handler
        on_channel_join : function (client) {
            client.say(this.channel, "quacktivated");
            this.post_posts(this.client, this.channel);
        },

        //subscribe to reddit reader and post new threads in the chat
        post_posts      : function (client, to) {
            if (this.initialized) {
                console.log('already started...');
            } else if (!this.muted) {
                  console.log('starting');
                  reader.go('drama', 24000);
                  reader.on('posts', function (data) {
                      var posts = data.posts;
                      for (var i = 0; i <posts.length; i++) {
                          console.log(posts[i].title + ":" + "http://redd.it/" +posts[i].id);
                          bot.throttle(function () {
                              client.say(to, "New post - " + posts[i].title + ": " + "http://redd.it/" +posts[i].id);
                          });
                      }
                  });
                  reader.on('silence', function () {
                      console.log("SILENCE");
                  });
                  this.initialized = true;
             } else {
                 console.log("Muted");
             }
        },

        //message handler
        on_message       : function (client, from, to, message) {

            if ( to.match(/^[#&]/) ) {
                // channel message
                if ( message.match(/quack/i) && !from.match(/dramatron/) ) {
                    this.throttle(function () {
                        client.say(to, "quack quack");
                    });
                }
            }

            if ( message.match(/!sleep/) ) {
                this.throttle(function () {
                    this.muted = true;
                    client.say(to, "dequacktivated");
                });
            } else if ( message.match(/!quit/) ) {
                process.exit();
            } else if ( message.match(/!wake/) ) {
                this.muted = false;
            }


        },
        //only send messaegs at most once every 10 seconds
        throttle        : function (cb) {
            if ((new Date().getTime() - this.lastquack) > 10000) {
                cb();
                this.lastquack = new Date().getTime();
            } else {
                console.log("throttled!");
            }
        },
        client          : new irc.Client('irc.snoonet.com', 'dramatron', {
            debug: true
        }),

        init            : function () {
            console.log('init');
            this.client.addListener('error', function(message) {
                console.error('ERROR: %s: %s', message.command, message.args.join(' '));
            });

            this.client.addListener('message', function (from, to, message) {
                console.log('%s => %s: %s', from, to, message);
                bot.on_message(this, from, to, message);
            });

            this.client.addListener('join', function(channel, who) {
                console.log('%s has joined %s', who, channel);

                if (who.match(/reddit_new/)) {
                    console.log("REDDIT NEW IS BACK!");
                    bot.muted = true;
                }

            });

            this.client.addListener('part', function(channel, who, reason) {
                console.log('%s has left %s: %s', who, channel, reason);
            });

            this.client.addListener('kick', function(channel, who, by, reason) {
                console.log('%s was kicked from %s by %s: %s', who, channel, by, reason);
            });

            this.client.addListener('motd', function () {
                this.join(bot.channel, function () {
                    bot.on_channel_join(this)
                });
            });

        },
    };

bot.init();

