/*
 * Release.js - this is a feature that is yet to be released.
 * It will concat/minify CSS/JS according to users mark up in HTML
 * via usemin. Removing usemin-lib from package.json.
 * It will need to be added back in once its ready.
*/

var fs = require('fs'),
    IonicProject = require('./project'),
    logging = require('./logging'),
    logger = logging.logger,
    path = require('path'),
    Release = module.exports,
    shelljs = require('shelljs');
    // useminLib = require('usemin-lib');

Release.start = function start(appDirectory, platform, compressImages) {
  var project = IonicProject.load(appDirectory);
  var documentRoot = project.get('documentRoot') || 'www';
  var indexPath = path.join(appDirectory, documentRoot, 'index.html');
  var removeLivereload = true;
  var htmlmin = true;

  var wwwPath;

  platform = platform || 'ios';
      
  switch (platform) {
    case 'android':
      wwwPath = path.join(appDirectory, 'platforms', platform, 'assets', 'www');
      break;
    case 'ios': 
    case 'browser':
      wwwPath = path.join(appDirectory, 'platforms', platform, 'www');
      break;        
    default:
      logging.logger.info('Release only supports android, ios, and browser currently');
      return;
  }
  // var argv = {
  //   htmlmin: true,
  //   dest: './www/',
  //   removeLivereload: true,
  //   _ : ['./www/index.html']
  // }
  logging.logger.info('Scanning', indexPath);
  var content = fs.readFileSync(indexPath).toString();
  var blocks = useminLib.getBlocks(indexPath, content, removeLivereload);
  
  // logging.logger.info(blocks);

  var process = useminLib.processBlocks(blocks, wwwPath);
  var minifiedIndexHtml = useminLib.getHTML(content, blocks, htmlmin);

  var filesList = [];

  blocks.forEach(function(block) {
    // logging.logger.info('block');
    // logging.logger.info(block);
    block.src.forEach(function(srcItem) {
      filesList.push(srcItem);
    })
  });

  try {
    var outIndexHtmlPath = path.join(wwwPath, 'index.html');
    logging.logger.info(wwwPath);
    fs.writeFileSync(outIndexHtmlPath, minifiedIndexHtml, 'utf8');
    logging.logger.info('Wrote', outIndexHtmlPath)
  } catch (ex) {
    logging.logger.info('ex');
    logging.logger.info(ex);
  }

  // logging.logger.info('minifiedIndexHtml', minifiedIndexHtml);
  logging.logger.info('Cleaning', appDirectory);
  Release.clean(appDirectory, wwwPath, filesList);

  if (compressImages) {
    var imgPaths = project.get('imagePaths') || [ path.join(appDirectory, documentRoot, 'img') ];
    logging.logger.info('Compressing images:', imgPaths);
    Release.compressImages(imgPaths);
  }

  logging.logger.info('Running minified app');
  var child_process = require('child_process');
  var iosPath = path.join(appDirectory, 'platforms', 'ios', 'cordova', 'run');

  var spawnOpts = {
    stdio: 'inherit'
  };
  
  var child = child_process.spawn('node', [iosPath], spawnOpts);

  if (child.stdout) {
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function(data) {
      logging.logger.info(data);
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function(data) {
      logging.logger.info(data);
    });
  }
};

Release.clean = function clean(appDirectory, wwwPath, filesList) {
  //Look at those hooks
  // https://www.airpair.com/ionic-framework/posts/production-ready-apps-with-ionic-framework

  logging.logger.info('Release clean', appDirectory, wwwPath, filesList);

  var appWwwDirectory = path.join(appDirectory, 'www');

  //Going to remove these files that got compiled from the platforms file release.
  filesList.forEach(function(fileToRemove) {
    var relativeFilePath = path.relative(appWwwDirectory, fileToRemove);
    var fileToRemovePath = path.join(wwwPath, relativeFilePath);
    logging.logger.info('Removing', fileToRemovePath);
    shelljs.rm(fileToRemovePath);
  });
};

Release.compressImages = function compressImages(imgPaths) {
  //Compress images
  imgPaths.forEach(function(imgPath) {
    useminLib.compressImages.processFiles(imgPath);
  });
};
