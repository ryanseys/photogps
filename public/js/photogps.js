var map,
dropbox = document.getElementById('map-canvas'),
log = document.getElementById('log');

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

// Update the progress bar
function update_progress(e, label) {
  if (e.lengthComputable) {
    var progress = label.getElementsByTagName('progress')[0]
    progress.setAttribute('value', e.loaded);
    progress.setAttribute('max', e.total);
  }
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

  // var coords = new google.maps.LatLng(0, 0);
  var marker = new google.maps.Marker({
    map: map,
  });

  reader.readAsDataURL(file);
  data.append('file', file);

  // Periodically update progress bar
  if(xhr.upload) {
    xhr.upload.addEventListener('progress', function (e) {
      update_progress(e, label);
    }, false);
  }

  // image upload finished?
  xhr.onreadystatechange = function(e) {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        label.parentNode.removeChild(label);
        var coords = JSON.parse(xhr.responseText);
        if(coords.lat && coords.lon) {
          marker.setPosition(new google.maps.LatLng(coords.lat, coords.lon));
        }
      } else {
        console.log('An error occurred!');
      }
    }
  }

  // image file loaded in filereader?
  reader.onloadend = function (event) {
    var img = new Image;
    img.src = event.target.result;

    // image loaded in img?
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
      // redraw smaller
      ctx.drawImage(this, 0, 0, imageWidth, imageHeight);
      addInfoWindow(marker, canvas.toDataURL());
    }
  };

  xhr.open('POST', '/upload', true);
  xhr.send(data); //post!
}

dropbox.addEventListener("drop", drop, false);
dropbox.addEventListener("dragleave", no_bubble, false);
dropbox.addEventListener("dragexit", no_bubble, false)
dropbox.addEventListener("dragover", no_bubble, false);

google.maps.event.addDomListener(window, 'load', initialize);
