var fs = require('fs'),
    IonicProject = require('./project'),
    path = require('path'),
    Release = module.exports,
    shelljs = require('shelljs'),
    useminLib = require('usemin-lib');

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
      console.log('Release only supports android, ios, and browser currently');
      return;
  }
  // var argv = {
  //   htmlmin: true,
  //   dest: './www/',
  //   removeLivereload: true,
  //   _ : ['./www/index.html']
  // }
  console.log('Scanning', indexPath);
  var content = fs.readFileSync(indexPath).toString();
  var blocks = useminLib.getBlocks(indexPath, content, removeLivereload);
  
  // console.log(blocks);

  var process = useminLib.processBlocks(blocks, wwwPath);
  var minifiedIndexHtml = useminLib.getHTML(content, blocks, htmlmin);

  var filesList = [];

  blocks.forEach(function(block) {
    // console.log('block');
    // console.log(block);
    block.src.forEach(function(srcItem) {
      filesList.push(srcItem);
    })
  });

  try {
    var outIndexHtmlPath = path.join(wwwPath, 'index.html');
    console.log(wwwPath);
    fs.writeFileSync(outIndexHtmlPath, minifiedIndexHtml, 'utf8');
    console.log('Wrote', outIndexHtmlPath)
  } catch (ex) {
    console.log('ex');
    console.log(ex);
  }

  // console.log('minifiedIndexHtml', minifiedIndexHtml);
  console.log('Cleaning', appDirectory);
  Release.clean(appDirectory, wwwPath, filesList);

  if (compressImages) {
    var imgPaths = project.get('imagePaths') || [ path.join(appDirectory, documentRoot, 'img') ];
    console.log('Compressing images:', imgPaths);
    Release.compressImages(imgPaths);
  }

  console.log('Running minified app');
  var child_process = require('child_process');
  var iosPath = path.join(appDirectory, 'platforms', 'ios', 'cordova', 'lib', 'run.js');

  var spawnOpts = {
    stdio: 'inherit'
  };
  
  // child_process.spawn('node', [iosPath], spawnOpts);
};

Release.clean = function clean(appDirectory, wwwPath, filesList) {
  //Look at those hooks
  // https://www.airpair.com/ionic-framework/posts/production-ready-apps-with-ionic-framework

  console.log('Release clean', appDirectory, wwwPath, filesList);

  var appWwwDirectory = path.join(appDirectory, 'www');

  //Going to remove these files that got compiled from the platforms file release.
  filesList.forEach(function(fileToRemove) {
    var relativeFilePath = path.relative(appWwwDirectory, fileToRemove);
    var fileToRemovePath = path.join(wwwPath, relativeFilePath);
    console.log('Removing', fileToRemovePath);
    shelljs.rm(fileToRemovePath);
  });
};

Release.compressImages = function compressImages(imgPaths) {
  //Compress images
  imgPaths.forEach(function(imgPath) {
    useminLib.compressImages.processFiles(imgPath);
  });
};
