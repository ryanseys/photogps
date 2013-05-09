var map,
    dropbox = document.getElementById('map-canvas'),
    log = document.getElementById('log'),
    status = document.getElementById('status'),
    curr_info,
    done = 0,
    processing = 0,
    reader = new FileReader(),
    img = new Image();

function addInfoWindow(marker, message) {
  var infoWindow = new google.maps.InfoWindow({
    content: message
  });

  google.maps.event.addListener(marker, 'click', function () {
    if(curr_info) curr_info.close();
    infoWindow.open(map, marker);
    curr_info = infoWindow;
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

function updateStatus() {
  if(done == processing) {
    done = processing = 0;
    status.innerHTML = "";
  }
  else status.innerHTML = "(Processing... " + done + "/" + processing + ")";
}

// Handle each file that was dropped (you can drop multiple at once)
function drop(e) {
  no_bubble(e);
  var files = e.target.files || e.dataTransfer.files;
  processing = files.length;
  updateStatus();
  process_file(files, 0, files.length);
  return false;
}

// Prevent event from bubbling up
function no_bubble(e) {
  e.stopPropagation();
  e.preventDefault();
}

function process_file(files, i, n) {
  if(i == n) return;
  var file = files[i],
      marker = new google.maps.Marker({
        map: map,
        flat: true
      });

  reader.readAsBinaryString(file);

  reader.onloadend = function (event) {
    var exif_data = EXIF.readFromBinaryFile(new BinaryFile(event.target.result));
    // var exif_data = Exif.loadFromArrayBuffer(event.target.result).gpsifd;
    if(!exif_data || !exif_data.GPSLatitude || !exif_data.GPSLongitude) {
      // No GPS data available
      done++;
      updateStatus();
      process_file(files, i+1, n); // process next file
    }
    else {
      var lat = exif_data.GPSLatitude;
      var lon = exif_data.GPSLongitude;
      var lat_deg = (lat[0] + (lat[1]/60.0) + (lat[2]/3600.0)).toFixed(6);
      var lon_deg = (lon[0] + (lon[1]/60.0) + (lon[2]/3600.0)).toFixed(6);

      if(exif_data.GPSLatitudeRef.indexOf("S") != -1) lat_deg *= -1;
      if(exif_data.GPSLongitudeRef.indexOf("W") != -1) lon_deg *= -1;
      marker.setPosition(new google.maps.LatLng(lat_deg, lon_deg));

      if(exif_data.thumbnail) {
        // yay! thumbnail found!
        addInfoWindow(marker, exif_data.thumbnail);
        done++;
        updateStatus();
        process_file(files, i+1, n); // process next file
      }
      else {
        // load image fully for thumbnail --> slow! :(
        reader.onloadend = function (event) {
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
            addInfoWindow(marker, '<img class="info_window" style="width:'+imageWidth+'px; height:'+
              imageHeight+'px;" src="' + canvas.toDataURL("image/jpeg") + '"/>' +
              '<div style="display:inline-block;">Lat: ' + lat_deg +'<br>Lon: '+ lon_deg +'</div>');
            done++;
            updateStatus();
            process_file(files, i+1, n); // process next file
          }
        };
        reader.readAsDataURL(file);
      }
    }
  }
}

dropbox.addEventListener("drop", drop, false);
dropbox.addEventListener("dragleave", no_bubble, false);
dropbox.addEventListener("dragexit", no_bubble, false)
dropbox.addEventListener("dragover", no_bubble, false);

google.maps.event.addDomListener(window, 'load', initialize);
