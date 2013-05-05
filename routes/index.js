var exif = require('exif2');

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
    if(lat_s && lon_s) {
      callback(parseCoords(lat_s, lon_s));
    }
    else if(obj['gps position']) {
      var split_position = obj['gps position'].split(',');
      lat_s = split_position[0];
      lon_s = split_position[1];
      callback(parseCoords(lat_s, lon_s));
    }
    else {
      callback({});
    }
  });
}

exports.index = function(req, res){
  res.render('index', { title: 'PhotoGPS' });
};

exports.upload = function(req, res) {
  var file = req.files.file.path;
  res.writeHead(200, {'Content-Type': 'text/json'});
  if(file) {
    printExif(file, function(coords) {
      res.end(JSON.stringify(coords));
    });
  }
  else {
    res.end("{}");
  }
}
