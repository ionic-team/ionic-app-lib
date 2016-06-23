# 0.7.3

* Fix [#60](https://github.com/driftyco/ionic-app-lib/pull/60), thanks [jarodms6](https://github.com/jarodms6)!

# 0.7.2

* Remove "beta" from platform message

# 0.7.1

* Update starter help text
* Add icon for iPad Pro, removes unused icon-60

# 0.7.0

* Add --noresources flag to package builds to optionally do nothing with resources.
* Fix(package): If a security profile is not found, stop the build.

# 0.6.4

* Fix(serve): stop setting address to null when checking for address/port conflicts with localhost.

# 0.6.3

* Fix [#36](https://github.com/driftyco/ionic-app-lib/pull/36), thanks [@kentongray](https://github.com/kentongray)!

# 0.6.2

* Fix login issue with creator start command

# 0.6.1

* Fix missing cookies error in creator start command

# 0.6.0

* Add `creator:[id]` template option to `ionic start` command

# 0.5.3

* Fix localhost that got into npm version

# 0.5.2

* Various fixes to catch problems with package

# 0.5.1

* Add security command for managing Security Profiles.
* Add package command for Ionic Package.

# 0.4.1

* Logging now done with `logging` module - using the node js winston logger.
* Lazy load all modules in ionic-app-lib - gives 8x performance gain.
* Added `package` command to build applications on ionic servers.
* Fix - remove globals that were set by accident - correct files to not rely on the globals.
* Upload command now properly checks 522 status code from CloudFlare.
* Stats command added to ionic-app-lib.
* Added gulp dependent start up tasks to run before `ionic serve` - specify them in your `ionic.project` file as attribute `gulpStartupTasks`.
* On starting apps - now calls `ionic add` instead of `bower install`.
* State command now saves package.json with newline character at end of file. 
* Resources have been extracted to the ionic-app-lib - now usable in the module.
* Add release feature as alpha - will compress images and concat/minify CSS/JS via usemin specified in index.html.

# 0.4.0

* Erronous publish on NPM - invalid version.

# 0.3.9

* Refactor: Use winston logging library for log messages
* Adding ionic-platform-web-client to the `ionic add` injection list
* Updated config writes to handle both minified and non-minified versions of ionic-platform-web-client

# 0.3.8

* Fix(config): Forcing string values for string types in io-config

# 0.3.7

* Fix(tests): Update test to pass options for stdio: pipe
* Fix: Writes to io-config happen even if ionic-service-core is missing

# 0.3.6

* Fix(cordova): Ensure cordova plugin commands are passed options for stdio to be pipe'.
* Fix(package): Update ionic-cordova-lib to 5.1.7.
* Added io init command.
* Added io init skeleton.
* Added list of ionic services and ngCordova to initialize.

# 0.3.5

* Fix(cordova): Expose cordova-lib so users of the lib can attach the cordova-lib events.

# 0.3.4

* Fix(start): Check for bower packages to avoid having exception when they are not provided in app.json file for starters.

# 0.3.3

* Fix(start): show message for user if invalid starter URL is passed or an invalid starter template name is provided. Show the user a message to view starter templates.

# 0.3.2

* Fix(cordova platform): Pass stdio for pipe for the create commands.

# 0.3.1

* Fix(upload): Bumped archiver back to 0.5.1 - it was causing an issue related to unzipped compressed files on Android devices - see: https://github.com/driftyco/ionic-cli/issues/494 and https://github.com/archiverjs/node-archiver/issues/113.

# 0.3.0

* Refactor(share): Share is now available in ionic-app-lib.
* Update serve method `start` to check for document root and reject promise if it does not exist instead of exiting process with Util.fail.
* Fix for upload - if you have a script with a query string, it will not get mangled from the removeCacheBusters call. Fixes issue https://github.com/driftyco/ionic-cli/issues/504.
* Fix(browser): Fix for remove crosswalk, pass in the app directory for the project file, then use that instance object to save. Fixes CLI bug https://github.com/driftyco/ionic-cli/issues/500.
* Fix(state): cordovaPlatforms in package.json no longer gets duplicate entry.
* Feature(start): add the ability to add bower packages to a starter project.
* Fix(start): Ensure appSetup.bower is set so that the appSetup.bower.length call doesnt cause a run time exception. Handle the exception thrown from initCordova in the chain by rethrowing the exception if the app setup process fails.
* Fix(platform): Remove console.log command from ionic-cordova-lib, bump to 5.1.5 to have that change.
* Fix(lab): Update preview.html to have utf-8 charset meta tag.
* Style(share): Show the finished message as green
* Fix(login): Remove lowercase of email.
* Feature(project): Expose project to module.
* Fix(upload): Remove entity parsing to fix https://github.com/driftyco/ionic-cli/issues/452#issuecomment-117376542
* Fix(info): Add check runtime call to show upgrade messages for dependencies that are not fulfilled.
* Fix(start): Ensure appSetup.bower is set so that the appSetup.bower.length call doesnt cause a run time exception. Handle the exception thrown from initCordova in the chain by rethrowing the exception if the app setup process fails.
* Fix(platform): Remove console.log command from ionic-cordova-lib, bump to 5.1.5 to have that change.

# 0.2.5

* Update ionic-cordova-lib to 5.1.4 for fix with cordova lib run propagating errors to callers.

# 0.2.4

* Fix for serve - directory root is using path.join instead of path.resolve

# 0.2.3

* Add build platform to the cordova command. 
* Bump version of ionic-cordova-lib.

# 0.2.2

* Fix(start): Fetch codepen was trying to fetch invalid html/css/js files because of a leading '/'. The trailing slash has been removed.

# 0.2.1

* Fix for `browser` command doing manual install for  Cordova CLI 5.1+, fixed to use cordova commands.

# 0.2.0

* Forked `cordova-lib` to use `ionic-cordova-lib` - this was done to correct some issues the cordova command had with passing stdio streams for the script calls.
* Fix(cordova): Update stdio option to pipe. Update tests to reflect ionic-cordova-lib.

# 0.1.1

* Fix(upload): Remove BOM for index.html file. Add bomindex.html file to have BOM (byte order mark) at beginning of file, remove the BOM, and have test to verify
* Fix(upload): Fix for CLI issue #452 and #440 - remove BOM character are beginning of index.html
* Fix(serve): Add in live reload port by environment variable. Add in test for serve with proper live reload port number
* Fix(utils): Look at the argv['no-cordova'] boolean option
* Fix(serve): Fix for ionic refernence to change to Utils, for CLI #451 issue
* Fix(upload): Update archive to 0.14.4 - update for certain users behind malware detection. Remove cordova-lib. Inclide ionic-cordova-lib


# 0.1.0

* Fix for Project - now can work from any directory, not just a directory that contains a project.
* Login command now exists in ionic-app-lib.
* Upload command now exists in ionic-app-lib.
* Setup command now exists in ionic-app-lib.
* Add tests for login and update.
* Add 10.39.236.1 for crosswalk lite.
* Add in settings file to have settings across applications.
* Fix for `ionic start --io-app-id <app_id>` to properly add the app ID to the project file.

# 0.0.21

* Fix for `ionic browser remove crosswalk` - fix for passing arguments and app directory.
* Fix for `ionic browser upgrade crosswalk` - passes app directory correctly.
* Update to unit tests for browser pre and post Cordova CLI 5.0.0

# 0.0.20

* Use cordova CLI to install plugins/platforms for start command.
* Update cordova-lib to 5.0.0.
* Use cordova 5.0 plugin ID's for npm format.
* Correct the option for platform on serve command.

# 0.0.19

* Fixing a bug with serve that will duplicate console logging from the browser.
* Fix for a bug when serve wont start console logs with `--consolelogs` argument.
* Added flag `--platform` for serve command that opens the browser with those platform specific styles (android/ios).

# 0.0.18

* Fix for Ionic state restore - fixes an issue with reset that does not pass the correct app directory path for the restore command.

# 0.0.17

* Add option for no gulp - only run tasks if this is not specified

# 0.0.16

* Ionic info now checks for gulp and ios-deploy (if mac)
* Ionic browser command now shows information about deprecation and using the cordova CLI directly, as well as directions on how to specify Crosswalk version.

# 0.0.14 - 0.0.15

* Fix for Windows and the 0.0.0.0 host problem with serve

# 0.0.13

* Ionic sass setup now checks that gulp is installed globally - and if not - tells the user how to set it up.

# 0.0.12

* Browser checks for Cordova CLI 5.0 installed - thereby using default cordova commands instead of downloading and installing the cordova android and crosswalk engine plugins.
* Serve now opens the browser correctly when the `--all` or `0.0.0.0` address is used - specifying `localhost` instead to open correctly on windows environments.

# 0.0.11

* Remove unused modules - mocha, chai, chai as promised.

# 0.0.10

* Adding in the ability for ionic-labs preview page to serve local assets

# 0.0.9

* Bumping plugin names to be the new format for 5.0

# 0.0.8

* Added in GUI opbeat credientials.
* Added in Crosswalk-lite for the browsers
* Updated process.version for Ionic info

# 0.0.7

* State command now respects local and remote urls for saving package.json
* Proxy adding Reject Unauthorized
