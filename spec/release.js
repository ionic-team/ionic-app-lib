var fs = require('fs'),
    IonicProject = require('./project'),
    Release = module.exports,
    useminLib = require('usemin-lib');

Release.start = function start(appDirectory) {
  var project = IonicProject.load(appDirectory);

  var argv = {
    htmlmin: true,
    dest: './www/dist/index.html',
    removeLivereload: true,
    _ : ['./www/index.html']
  }

  var content = fs.readFileSync(filePath).toString();
  var blocks = useminLib.getBlocks(argv._[0], content, argv.removeLivereload);
  var process = useminLib.processBlocks(blocks, argv.dest);
  var output = useminLib.getHTML(content, blocks, argv.htmlmin);

  // console.log('output', output);

};

