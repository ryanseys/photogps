var exif = require('exif2');

exports.datastore = {};


function parseCoords(lat_s, lon_s) {
  var lon_arr = lon_s.split(' ');
  var lon_d = parseInt(lon_arr[0]); //
  var lon_m = parseInt(lon_arr[2]); //remove '
  var lon_s = parseFloat(lon_arr[3]); //remove "

  var lat_arr = lat_s.split(' ');
  var lat_d = parseInt(lat_arr[0]); //
  var lat_m = parseInt(lat_arr[2]); //remove '
  var lat_s = parseFloat(lat_arr[3]); //remove "

  var lat_deg = lat_d + (lat_m/60.0) + (lat_s/3600.0);
  var lon_deg = lon_d + (lon_m/60.0) + (lon_s/3600.0);
  if(lat_arr[4] == "S") lat_deg *= -1;
  if(lon_arr[4] == "W") lon_deg *= -1;
  return { lat: lat_deg, lon: lon_deg };
}

function printExif(filename, callback) {
  exif(filename, function(err, obj) {
    var lon_s = obj['gps longitude'];
    var lat_s = obj['gps latitude'];
    console.log('Filename: \t' + obj['file name']);
    console.log('Altitude: \t' + (obj['gps altitude'] || 'Unavailable'));
    console.log('Latitude: \t' + (obj['gps latitude'] || 'Unavailable'));
    console.log('Longitude: \t' + (obj['gps longitude'] || 'Unavailable'));
    console.log('Position: \t' + (obj['gps position'] || 'Unavailable'));
    if(lat_s && lon_s) {
      var coords = parseCoords(lat_s, lon_s);
      // exports.datastore[filename] = coords;
      callback(null, coords);
    }
    else {
      callback("No GPS data found", {});
    }
  });
}

String.prototype.endsWith = function(suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

exports.index = function(req, res){
  res.render('index', { title: 'PhotoGPS' });
};

exports.upload = function(req, res) {
  var file = req.files.file.path;
  printExif(file, function(err, coords) {
    if(err) console.log(err);
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end(JSON.stringify(coords));
  });
}
