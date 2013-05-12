//work in progress
function bucket_sort(data, n) {
  data.sort(); // sort the original data
  var oldest = data[0]; // the oldest photo
  var newest = data[data.length-1]; // the most recent photo

  //initialize array
  var arr = [];
  for(var i = 0; i < n; i++) {
    arr[i] = []; //initialize
  }

  for(var j = 0; j < n; j++) {
    // put into specific bucket
  }
}
