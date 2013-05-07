var map,
    dropbox = document.getElementById('map-canvas'),
    log = document.getElementById('log'),
    status = document.getElementById('status');

function addInfoWindow(marker, message) {
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
  var files = e.target.files || e.dataTransfer.files;
  for (var i = 0; i < files.length; i++) {
    process_file(files[i]);
  }
  return false;
}

// Prevent event from bubbling up
function no_bubble(e) {
  e.stopPropagation();
  e.preventDefault();
}

function process_file(file) {
  var reader = new FileReader(),
      marker = new google.maps.Marker({
        map: map
      });

  reader.readAsArrayBuffer(file);

  reader.onloadend = function (event) {
    var exif_data = Exif.loadFromArrayBuffer(event.target.result).gpsifd;
    // console.log(exif_data);
    if(typeof exif_data === 'undefined') {
      console.log('No GPS data available.');
    }
    else {
      var lat = exif_data.latitude;
      var lon = exif_data.longitude;
      if(lat && lon) {
        var lat_deg = lat[0] + (lat[1]/60.0) + (lat[2]/3600.0);
        var lon_deg = lon[0] + (lon[1]/60.0) + (lon[2]/3600.0);

        if(exif_data.latitudeRef.indexOf("S") != -1) lat_deg *= -1;
        if(exif_data.longitudeRef.indexOf("W") != -1) lon_deg *= -1;
        marker.setPosition(new google.maps.LatLng(lat_deg, lon_deg));

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
        reader.readAsDataURL(file);
      }
      else {
        console.log('No GPS data available.');
      }
    }
  }
}

dropbox.addEventListener("drop", drop, false);
dropbox.addEventListener("dragleave", no_bubble, false);
dropbox.addEventListener("dragexit", no_bubble, false)
dropbox.addEventListener("dragover", no_bubble, false);

google.maps.event.addDomListener(window, 'load', initialize);
