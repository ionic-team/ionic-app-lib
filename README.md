## Getting started

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

Commands to convert:

* [X] start
* [X] serve
* [ ] cordova (using cordova-lib)
  * [ ] run
  * [ ] emulate
  * [ ] compile
  * [ ] build
  * [X] add platform
  * [X] remove platform
  * [X] add plugin
  * [X] remove plugin
* [ ] utils
* [ ] login
* [ ] upload
* [ ] hooks
* [ ] browser
* [ ] resources
* [ ] docs
* [ ] state

cordova (using cordova-lib - run/emulate/compile/build)
upload
stats
