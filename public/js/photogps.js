var map;

function addPoint(lat, lon, file_base64) {
  var coords = new google.maps.LatLng(lat, lon);
  var marker = new google.maps.Marker({
    position: coords,
    map: map,
  });
  addInfoWindow(marker, file_base64);
}

function addInfoWindow(marker, message) {
  var info = message;

  var infoWindow = new google.maps.InfoWindow({
      content: '<img src="' + message + '"/>'
  });

  google.maps.event.addListener(marker, 'click', function () {
      infoWindow.open(map, marker);
  });
}

function initialize() {
  var mapOptions = {
    zoom: 2,
    center: new google.maps.LatLng(45.012143, 16.347125),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
}

google.maps.event.addDomListener(window, 'load', initialize);

var dropbox = document.getElementById('map-canvas');
var log = document.getElementById('log');

// Handle each file that was dropped (you can drop multiple at once)
function drop(e) {
  no_bubble(e);
  var files = e.dataTransfer.files;
  for (var i = 0; i < files.length; i++) {
    upload_file(files[i]);
  }
  return false;
}

// Prevent event from bubbling up
function no_bubble(e) {
  e.stopPropagation();
  e.preventDefault();
}

function upload_file(file) {
  // Make a progress bar
  var label = document.createElement('div');
  label.innerHTML = '<progress></progress>' + file.name;
  log.insertBefore(label, null);

  // Build a form for the data
  var data = new FormData(),
      reader = new FileReader(),
      xhr = new XMLHttpRequest(),
      file_base64;

  reader.readAsDataURL(file);
  data.append('file', file);

  // Periodically update progress bar
  if(xhr.upload) {
    xhr.upload.addEventListener('progress', function (e) {
      update_progress(e, label);
    }, false);
  }

  xhr.onreadystatechange = function(e) {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        label.parentNode.removeChild(label);
        var coords = JSON.parse(xhr.responseText);
        console.log('added point');
        if(coords.lat && coords.lon) addPoint(coords.lat, coords.lon, file_base64);
      } else {
        console.log('An error occurred!');
      }
    }
  }

  reader.onloadend = function (event) {
    var img = new Image;
    img.src = event.target.result;

    img.onload = function() {
      var maxWidth = 100,
        maxHeight = 100,
        imageWidth = img.width,
        imageHeight = img.height;

      if (imageWidth > imageHeight) {
        if (imageWidth > maxWidth) {
          imageHeight *= maxWidth / imageWidth;
          imageWidth = maxWidth;
        }
      }
      else {
        if (imageHeight > maxHeight) {
          imageWidth *= maxHeight / imageHeight;
          imageHeight = maxHeight;
        }
      }

      var canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight;

      var ctx = canvas.getContext("2d");
      ctx.drawImage(this, 0, 0, imageWidth, imageHeight);
      file_base64 = canvas.toDataURL();
      xhr.open('POST', '/upload', true);
      xhr.send(data); //post!
    }
  };
}

// Update the progress bar
function update_progress(e, label) {
  if (e.lengthComputable) {
    var progress = label.getElementsByTagName('progress')[0]
    progress.setAttribute('value', e.loaded);
    progress.setAttribute('max', e.total);
  }
}

dropbox.addEventListener("drop", drop, false);
dropbox.addEventListener("dragleave", no_bubble, false);
dropbox.addEventListener("dragexit", no_bubble, false)
dropbox.addEventListener("dragover", no_bubble, false);
