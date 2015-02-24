The idea here is to make the CLI library easier to use from any interface. 

This project will contain all the logic to make all of the commands happen - start/serve/platform/run/emulate/etc..

The root file, index.js - will import all of the other modules/commands, to provide an interface to run all of the tasks.

The lib folder will contain all of the individual commands.

The specs will test passing the commands the correct parameters, instead of if they properly read in command line arguments.
