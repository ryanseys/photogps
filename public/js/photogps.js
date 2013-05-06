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
      content: '<img height="100" width="100" src="' + message + '"></img>'
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

var reader = new FileReader();



function upload_file(file) {
  // Make a progress bar
  var label = document.createElement('div');
  label.innerHTML = '<progress></progress>' + file.name;
  log.insertBefore(label, null);

  // Build a form for the data
  var data = new FormData;
  data.append('file', file);
  reader.readAsDataURL(file);
  var file_base64;

  reader.onload = function (oFREvent) {
    file_base64 = oFREvent.target.result;
  };

  // Create a new XHR object and assign its callbacks
  var xhr = new XMLHttpRequest();

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
        if(coords.lat && coords.lon) addPoint(coords.lat, coords.lon, file_base64);
      } else {
        console.log('An error occurred!');
      }
    }
  }

  xhr.open('POST', '/upload', true);
  xhr.send(data); //post!
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
