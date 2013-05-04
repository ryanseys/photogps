var exif = require('exif2');
var fs = require('fs');
var pics_folder = './pics/';

function printExif(filename) {
  exif(pics_folder + filename, function(err, obj) {
    console.log('Filename: \t' + obj['file name']);
    console.log('Altitude: \t' + (obj['gps altitude'] || 'Unavailable'));
    console.log('Date Time: \t' + (obj['gps date time'] || 'Unavailable'));
    console.log('Latitude: \t' + (obj['gps latitude'] || 'Unavailable'));
    console.log('Longitude: \t' + (obj['gps longitude'] || 'Unavailable'));
    console.log('Position: \t' + (obj['gps position'] || 'Unavailable'));
    console.log('Latitude Ref: \t' + (obj['gps latitude ref'] || 'Unavailable'));
    console.log('Longitude Ref: \t' + (obj['gps longitude ref'] || 'Unavailable'));
    console.log('Altitude Ref: \t' + (obj['gps altitude ref'] || 'Unavailable'));
    console.log('Time Stamp: \t' + (obj['gps time stamp'] || 'Unavailable'));
    console.log('Process Method: ' + (obj['gps processing method'] || 'Unavailable'));
    console.log('Date Stamp: \t' + (obj['gps date stamp'] || 'Unavailable'));
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

