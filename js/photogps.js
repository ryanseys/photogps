var map,
    dropbox = document.getElementById('map-canvas'),
    log = document.getElementById('log'),
    stat_div = document.getElementById('status'),
    curr_info, // current information dialog open
    done = 0, // done processing the current set of files?
    processing = 0, // how many images have been processed in this batch
    reader = new FileReader(), // for reading files dragged into browser
    img = new Image(), // Image object used to render a thumbnail
    maxWidth = 100, // maximum width of thumbnail image on marker
    maxHeight = 100; // maximum height of thumbnail image on marker

// TODO: Pull the latitude and longitude from the marker

/**
 * Add a marker to the Google Map
 * @param {[type]} marker         The Marker to add
 * @param {[type]} thumbnail_data The thumbnail image data/URL
 * @param {[type]} width          Width of the thumbnail
 * @param {[type]} height         Height of the thumbnail
 * @param {[type]} lat            latitude of marker
 * @param {[type]} lon            longitude of marker
 */
function addInfoWindow(marker, thumbnail_data, width, height, lat, lon) {
  var infoWindow = new google.maps.InfoWindow({
    content: '<img class="info_window" style="width:' +
              width + 'px; height:' + height + 'px;" src="' + thumbnail_data + '"/>' +
              '<div style="display:inline-block;">Lat: ' + lat + '<br>Lon: ' + lon + '</div>'
  });

  google.maps.event.addListener(marker, 'click', function () {
    if(curr_info) curr_info.close();
    infoWindow.open(map, marker);
    curr_info = infoWindow;
  });
}

/**
 * Initialize the Google Map
 */
function initialize() {
  var mapOptions = {
    zoom: 2,
    center: new google.maps.LatLng(51.985511, 34.628375),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
}

/**
 * Update the status of the processing amount
 */
function updateStatus() {
  if(done == processing) {
    done = processing = 0;
    stat_div.innerHTML = "";
  }
  else stat_div.innerHTML = "(Processing... " + done + "/" + processing + ")";
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

/**
 * Extracts information from the i'th file
 * of files and posts on map. Uses recursion
 * for enforcing 1-by-1 processing.
 * @param  {Array}        files files list to process
 * @param  {Number} i     index of file in files to process
 * @param  {Number} n     number of files in files
 * @return {Undefined}    undefined
 */
function process_file(files, i, n) {
  if(i == n) return;
  var file = files[i],
      marker = new google.maps.Marker({
        map: map,
        flat: true
      });

  if (file.slice) {
    filePart = file.slice(0, 131072);
  } else if (file.webkitSlice) {
      filePart = file.webkitSlice(0, 131072);
  } else if (file.mozSlice) {
      filePart = file.mozSlice(0, 131072);
  } else {
    filePart = file;
  }

  reader.readAsBinaryString(filePart);

  reader.onloadend = function (event) {
    var exif_data = EXIF.readFromBinaryFile(new BinaryFile(event.target.result));

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

      var imageWidth = exif_data.PixelXDimension,
          imageHeight = exif_data.PixelYDimension;

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

      if(exif_data.thumbnail) {
        // yay! thumbnail found!
        addInfoWindow(marker, exif_data.thumbnail, imageWidth, imageHeight, lat_deg, lon_deg);
        done++;
        updateStatus();
        process_file(files, i+1, n); // process next file
      }
      else {
        // load image fully for thumbnail --> slow! :(
        reader.onloadend = function (event) {
          img.src = event.target.result;
          img.onload = function() { // image loaded in img?

            var canvas = document.createElement('canvas');
            canvas.width = imageWidth;
            canvas.height = imageHeight;

            var ctx = canvas.getContext("2d");
            // redraw smaller
            ctx.drawImage(this, 0, 0, imageWidth, imageHeight);
            var thumbnail_data = canvas.toDataURL("image/jpeg");
            addInfoWindow(marker, thumbnail_data, imageWidth, imageHeight, lat_deg, lon_deg);

            done++;
            updateStatus();
            process_file(files, i+1, n); // process next file
          };
        };
        reader.readAsDataURL(file); //read original file
      }
    }
  };
}

// do initializations after everything is defined
dropbox.addEventListener("drop", drop, false);
dropbox.addEventListener("dragleave", no_bubble, false);
dropbox.addEventListener("dragexit", no_bubble, false);
dropbox.addEventListener("dragover", no_bubble, false);

google.maps.event.addDomListener(window, 'load', initialize);
