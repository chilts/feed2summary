# rss2summary.js #

Simple program to process a list of feeds, fetch them, extract each item (title and link) and print out each item if it
is new.

Deals with both RSS and Atom feeds.

## Example ##

### Feeds File ###

The feeds file is a plain text file which contains your RSS/Atom links. Each line can be either the feed ```url``` or a
```title=url``` format. The title is used in the output (helpful for feeds which are opaque):

```
http://example.com/rss
Example=http://example.com/rss
```

Empty lines and lines starting with # are ignored.

### Running feed2summary.js ###

```
$ which node
/home/ubuntu/.nvm/v0.8.23/bin/node

$ git clone git://github.com/chilts/feed2summary.git
...etc...

$ cd feed2summary

$ npm install
...etc...

$ vi feeds/mine.txt

$ node feed2summary.js feeds/mine.txt
...etc...
```

### Output ###

For a feed file such as this:

```
# Mine
Chilts=http://chilts.org/blog/atom.xml

# Geek
http://www.kickstarter.com/backing-and-hacking.atom
GitHub-Ship=https://github.com/blog/ship.atom
```

And run it as follows to get the output:

```
$ node feed2summary.js feeds/readme.txt
===============================================================================
--- Chilts (http://chilts.org/blog/atom.xml) ----------------------------------

* Using Queues in a State Machine
*  -> http://chilts.org/blog/using-async-queue-as-a-state-machine.html

* AwsSum's Overall Plan
*  -> http://chilts.org/blog/awssums-overall-plan.html

* Introducing Node AwsSum
*  -> http://chilts.org/blog/node-awssum.html

--- GitHub-Ship (https://github.com/blog/ship.atom) ---------------------------

* Redesigned merge button
*  -> https://github.com/blog/1469-redesigned-merge-button

===============================================================================
===============================================================================
```

# Author #

Written by [Andrew Chilton](http://chilts.org/) - [Blog](http://chilts.org/blog/) -
[Twitter](https://twitter.com/andychilton).

# License #

* [Copyright 2013 Andrew Chilton.  All rights reserved.](http://chilts.mit-license.org/2013/)

(Ends)
