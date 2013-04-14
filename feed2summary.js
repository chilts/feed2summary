// ----------------------------------------------------------------------------
//
// feed2summary.js
//
// Copyright 2013 Andrew Chilton <andychilton@gmail.com>
//
// ----------------------------------------------------------------------------

var fs = require('fs');
var http = require('http');
var https = require('https');
var util = require('util');

var async = require('async');
var sax = require('sax');
var levelup = require('levelup');
var fmt = require('fmt');

// ----------------------------------------------------------------------------

var filename = process.argv[2];
var data = fs.readFileSync(filename, 'utf8');
var feeds = data.split(/\n/);

// filter out blank lines and comment lines
feeds = feeds.filter(function(feed, i) {
    // if feed is a blank line then filter out
    if ( !feed.match(/\S/) ) {
        return false;
    }

    // if feed begins with //, then filter out
    if ( feed.match(/^\s*\#/) ) {
        return false;
    }

    return true;
});

// convert each URL into an object
feeds = feeds.map(function(feed, i) {
    // convert to an object so we can save stuff to it
    return {
        url   : feed,
        items : [],
    };
});

// open the LevelDB which we use as temporary storage
var db = levelup(filename + '.db');

// ----------------------------------------------------------------------------

async.eachSeries(
    feeds,
    function(feed, done) {
        // remember some state when parsing the file
        var type = 'unknown';
        var title;
        var link;
        var text; // the text in the last tag
        var state = 'new';

        debug('-------------------------------------------------------------------------------');
        debug('Fetching ' + feed.url);

        // create an XML streaming parser and save each item to the 'entries'
        var parser = sax.createStream(false);

        parser.on("opentag", function (node) {
            debug('Detected open tag : ' + node.name);

            if ( type === 'unknown' && node.name === 'RSS' ) {
                debug('Detected RSS feed');
                type = 'rss';
            }
            if ( type === 'unknown' && node.name === 'FEED' ) {
                debug('Detected Atom feed');
                type = 'atom';
            }

            // ok, let's look for an ITEM (if rss)
            if ( type === 'rss' && node.name === 'ITEM' ) {
                debug('Detected opening <item>');
                state = 'gotitemstart';
                title = undefined;
                link = undefined;
            }

            // ok, let's look for an <entry> (if atom)
            if ( type === 'atom' && node.name === 'ENTRY' ) {
                debug('Detected opening <entry>');
                state = 'gotitemstart';
                title = undefined;
                link = undefined;
            }

            // let's also look for a <link> (if atom)
            if ( type === 'atom' && state === 'gotitemstart' && node.name === 'LINK' ) {
                debug('Found link : ' + node.attributes.HREF);
                link = node.attributes.HREF;
            }
        });

        parser.on("closetag", function (node) {
            debug('Detected close tag : ' + node);

            // if we have seen an <item>, then we should see a <title> and <link>
            if ( type === 'rss' && state === 'gotitemstart' && node === 'TITLE' ) {
                debug('Saving title : ' + text);
                title = text;
            }
            if ( type === 'rss' && state === 'gotitemstart' && node === 'LINK' ) {
                debug('Saving link : ' + text);
                link = text;
            }

            // if we have seen an <entry>, then we should also see a <title>
            if ( type === 'atom' && state === 'gotitemstart' && node === 'TITLE' ) {
                debug('Saving title : ' + text);
                title = text;
            }
            // (link is an attribute on <entry>, so we've already seen that

            // if we have a </item> then, reset
            if ( type == 'rss' && state === 'gotitemstart' && node === 'ITEM' ) {
                debug('Got </item>, saving item');

                // save this for later processing
                feed.items.push({
                    title : title,
                    link  : link,
                });

                // reset some state
                state = 'new';
                title = undefined;
                link = undefined;
            }

            // if we have a </entry> then, reset
            if ( type == 'atom' && state === 'gotitemstart' && node === 'ENTRY' ) {
                debug('Got </entry>, saving item');

                // save this for later processing
                feed.items.push({
                    title : title,
                    link  : link,
                });

                // reset some state
                state = 'new';
                title = undefined;
                link = undefined;
            }

        });

        // always save what we have see when we get a text node
        parser.on("text", function (t) {
            debug('Text=' + t);
            text = t;
        });

        // stream each RSS file to the XML Parser
        request(feed, function(err, res) {
            if (err) {
                debug('');
                debug('' + err + "\n");
                debug('Finished ' + feed.url);
                return done();
            }

            // all good, so pipe into the parser
            res.pipe(parser);
            res.on('end', function() {
                // save the number if items found
                feed.total = feed.items.length;

                debug('Found ' + feed.total + ' item(s)');
                done();
            });
        });
    },
    function(results) {
        debug('-------------------------------------------------------------------------------');

        // filter out any results which we've already seen
        async.eachSeries(
            feeds,
            function(feed, callback) {
                // filter out any items we have already seen
                async.filter(
                    feed.items,
                    function(item, filter) {
                        // check if this feed.url exists in LevelDB and if not, allow it
                        db.get(item.link, function(err, value) {
                            if (err) {
                                if (err.name === 'NotFoundError' ) {
                                    debug('Putting ' + item.link);
                                    db.put(item.link, (new Date()).toISOString(), function(err) {
                                        filter(true);
                                    });
                                }
                                else {
                                    // something went wrong
                                    console.warn('Error:' + err);
                                    process.exit(2);
                                }
                            }
                            else {
                                // already exists
                                debug('Exists ' + item.link);
                                filter(false);
                            }
                        });
                    },
                    function(newItems) {
                        // finished filtering feed.items
                        feed.items = newItems;

                        // save the number if new items
                        feed.new = newItems.length;

                        callback();
                    }
                );
            },
            function(err) {
                // finally, print out all of the feeds as they now stand
                // console.log(util.inspect(feeds, false, null, false));

                feeds.forEach(function(feed) {
                    if ( feed.statusCode === 200 ) {
                        // see if there are any new feeds
                        if ( feed.new > 0 ) {
                            fmt.sep();
                            fmt.title(feed.url);
                            feed.items.forEach(function(item, i) {
                                fmt.li(item.title);
                                fmt.li(' -> ' + item.link + "\n");
                            });
                        }
                    }
                    else {
                        // something went wrong
                        fmt.sep();
                        fmt.title(feed.url);
                        fmt.field('status', feed.statusCode);
                        if ( feed.redirect ) {
                            fmt.field('redirect', feed.redirect);
                        }
                    }
                });

                fmt.sep();
            }
        );
    }
);

function request(feed, callback) {
    var protocol;
    if ( feed.url.match(/^http:\/\//) ) {
        protocol = http;
    }
    else if ( feed.url.match(/^https:\/\//) ) {
        protocol = https;
    }
    else {
        return callback(new Error('Unknown protocol'));
    }

    protocol.get(feed.url, function(res) {
        debug("Got response " + res.statusCode);

        // save the statusCode so we can see it
        feed.statusCode = res.statusCode;

        // if this looks a bit suspicious, return an error
        if ( res.statusCode !== 200 ) {
            if ( res.statusCode === 301 || res.statusCode === 302 ) {
                // save this so we can print it out later
                feed.redirect = res.headers.location;
            }
            return callback(new Error('Status code was not 200 (' + res.statusCode + ')'));
        }

        // everything looks ok
        callback(null, res);
    }).on('error', function(e) {
        callback(e);
    });
}

// ----------------------------------------------------------------------------

function debug(msg) {
    if ( false ) {
        console.log(msg);
    }
};
function log(msg) {
    console.log(msg);
}

function line() {
    console.log('-------------------------------------------------------------------------------');
}

// ----------------------------------------------------------------------------
