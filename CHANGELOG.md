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
