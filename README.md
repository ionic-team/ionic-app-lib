[![Circle CI](https://circleci.com/gh/driftyco/ionic-app-lib.svg?style=svg)](https://circleci.com/gh/driftyco/ionic-app-lib)

[![NPM](https://nodei.co/npm/ionic-app-lib.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/ionic-app-lib/)

## Getting started

`npm install ionic-app-lib --save`

## Using this library

Here's a snippet of JavaScript that shows how to use this library:

```javascript
var ionicAppLib = require('ionic-app-lib'),
    cordova = ionicAppLib.cordova,
    serve = ionicAppLib.serve,
    start = ionicAppLib.start;

var options = { 
  appDirectory: 'IonicApp',
  appName: 'Test',
  packageName: 'com.ionic.test',
  isCordovaProject: true,
  template: 'tabs',
  targetPath: '/User/Path/Development/' 
};

start.startApp(options);

//Start an Ionic server with LiveReload on your files
serve.start(options)

cordova.addPlatform(appPath, platform);
cordova.runPlatform(appPath, platform);



```

## Status

Commands to convert:

* [X] start
* [X] serve
* [X] cordova (using cordova-lib)
  * [X] run
  * [X] emulate
  * [X] compile
  * [X] build
  * [X] add platform
  * [X] remove platform
  * [X] add plugin
  * [X] remove plugin
* [X] utils
* [X] setup
* [X] login
* [X] upload
* [X] share
* [ ] push
* [X] hooks
* [X] browser
* [ ] resources
* [ ] docs
* [X] state

cordova (using cordova-lib - run/emulate/compile/build)
upload
stats

## Developing this library

To use this library from another project, simply take your command line to the root of this directory and run `npm link`.

Then in the project you wish to consume the library, run `npm link ionic-app-lib`. Then `require('ionic-app-lib')` and start using the commands listed in index.js.

## The idea and plan

The idea here is to make the CLI library easier to use from any interface. 

This project will contain all the logic to make all of the commands happen - start/serve/platform/run/emulate/etc..

The root file, index.js - will import all of the other modules/commands, to provide an interface to run all of the tasks.

The lib folder will contain all of the individual commands.

The specs will test passing the commands the correct parameters, instead of if they properly read in command line arguments. Starting out, tests will just ensure there are no silly JavaScript errors by just requireing them.

## Strategy going forward

Need to think about how to start cutting over forward development and passing it off to this library instead of straight parsing arguments from CLI.

