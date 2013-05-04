var exif = require('exif2');
var fs = require('fs');
var pics_folder = './pics/';

function printExif(filename) {
  exif(pics_folder + filename, function(err, obj) {
    console.log('Filename: \t' + obj['file name']);
    console.log('Altitude: \t' + obj['gps altitude']);
    console.log('Date Time: \t' + obj['gps date time']);
    console.log('Latitude: \t' + obj['gps latitude']);
    console.log('Longitude: \t' + obj['gps longitude']);
    console.log('Position: \t' + obj['gps position']);
    console.log('Latitude Ref: \t' + obj['gps latitude ref']);
    console.log('Longitude Ref: \t' + obj['gps longitude ref']);
    console.log('Altitude Ref: \t' + obj['gps altitude ref']);
    console.log('Time Stamp: \t' + obj['gps time stamp']);
    console.log('Process Method: ' + obj['gps processing method']);
    console.log('Date Stamp: \t' + obj['gps date stamp']);
  });
}

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

fs.readdir(pics_folder, function(err, files) {
  if(err) throw err;
  files.forEach(function(file) {
    if(file.toString().toLowerCase().endsWith('.jpg')) {
      printExif(file.toString());
    }
  });
  console.log('All photos in ' + pics_folder + ' were processed.');
});

