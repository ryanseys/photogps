var map,
dropbox = document.getElementById('map-canvas'),
log = document.getElementById('log'),
status = document.getElementById('status');

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

var num_files_currently_uploading = 0;
var num_files_completed_this_round = 0;

// Handle each file that was dropped (you can drop multiple at once)
function drop(e) {
  no_bubble(e);
  var files = e.dataTransfer.files;
  for (var i = 0; i < files.length; i++) {
    upload_file(files[i]);
    num_files_currently_uploading++;
  }
  return false;
}

// Prevent event from bubbling up
function no_bubble(e) {
  e.stopPropagation();
  e.preventDefault();
}

// Update the progress bar
function update_progress(e) {
  if (e.lengthComputable) {
    //status.innerHTML = "Loaded " + num_files_completed_this_round + "/" + num_files_currently_uploading;
  }
}

// function read_binary_data(file) {
//   var r = new FileReader();

//   r.readAsBinaryString(file);
//   r.onloadend = function (event) {
//     console.log(EXIF.readFromBinaryFile(file));
//   }
// }

function upload_file(file) {
  // Build a form for the data
  var data = new FormData(),
      reader = new FileReader(),
      xhr = new XMLHttpRequest(),
      file_base64,
      marker = new google.maps.Marker({
        map: map
      });

  reader.readAsDataURL(file);
  //read_binary_data(file);
  data.append('file', file);

  // Periodically update progress bar
  if(xhr.upload) {
    xhr.upload.addEventListener('progress', function (e) {
      update_progress(e);
    }, false);
  }

  // image upload finished?
  xhr.onreadystatechange = function(e) {
    if (xhr.readyState === 4) {
      num_files_completed_this_round++;
      if(num_files_currently_uploading == num_files_completed_this_round) {
        num_files_currently_uploading = 0;
        num_files_completed_this_round = 0;
        status.innerHTML = "";
      }
      else status.innerHTML = "Loaded " + num_files_completed_this_round + "/" + num_files_currently_uploading;
      if (xhr.status === 200) {
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
