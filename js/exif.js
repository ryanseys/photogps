Exif = {};

(function () {
  var MARKER_SOI  = 0xffd8;
  var MARKER_APP1 = 0xffe1;
  var FMT_SIZE = [
    1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8
  ];

  function BinaryReader(arr, endian) {
    this.arr = new Uint8Array(arr);
    this.endian = endian || 0;
    this.cur = 0;
    this._stack = [];
  }

  BinaryReader.LITTLE_ENDIAN = 0;
  BinaryReader.BIG_ENDIAN    = 1;
  BinaryReader.SEEK_ABSOLUTELY = 0;
  BinaryReader.SEEK_RELATIVELY = 1;

  BinaryReader._makeReadMethod = function (size) {
    return function (endian) {
      var target;

      typeof endian === "undefined" && (endian = this.endian);
      target = this.arr.subarray(this.cur, this.cur + size);

      this.cur += size;

      return BinaryReader.pack(target, endian);
    };
  };

  BinaryReader.pack = function (arr, endian) {
    var f = endian === BinaryReader.LITTLE_ENDIAN
      ? Array.prototype.reduceRight   // Little Endian
      : Array.prototype.reduce;       // Big Endian

    return f.call(arr, function (a, b) {
      return (a << 8) + b;
    }, 0);
  };

  BinaryReader.pack_signed = function (arr, endian) {
    var n = BinaryReader.pack(arr, endian);

    if (n & (1 << arr.length * 8 - 1)) {
      n = n - (Math.pow(2, arr.length * 8));
    }

    return n;
  }

  BinaryReader.packstr = function (arr) {
      var res = "";
      for (var i=0; i<arr.length; i++)
        res += String.fromCharCode(arr[i]);
      return res;
      //return Array.prototype.map.call(arr, String.fromCharCode).join("");
  };

  BinaryReader.prototype = {
    constructor : BinaryReader,

    setEndian : function (endian) {
      this.endian = endian;
    },

    byte  : BinaryReader._makeReadMethod(2),
    word  : BinaryReader._makeReadMethod(4),
    dword : BinaryReader._makeReadMethod(8),

    skip : function (size) {
      this.cur += size;
      return this;
    },

    str : function (size) {
      var arr = this.arr.subarray(this.cur, this.cur + size);

      this.cur += size;
      return BinaryReader.packstr(arr);
    },

    getarr : function (size) {
      var ret = this.arr.subarray(this.cur, this.cur + size);

      this.cur += size;
      return ret;
    },

    seek : function (offset, type) {
      if (type === BinaryReader.SEEK_RELATIVELY) {
        this.cur += offset;
      } else {
        //default
        this.cur  = offset;
      }
      return this;
    },

    push : function () {
      this._stack.push(this.cur);
      return this;
    },

    pop : function () {
      this.cur = this._stack.pop();
      return this;
    }
  };

  Exif.loadFromArrayBuffer = function (arr) {
    var soi, app1 = {}, ifd0, subifd, gpsifd, base, endian;

    var reader = new BinaryReader(arr, BinaryReader.BIG_ENDIAN);

    //check magic byte
    soi = reader.byte();
    if (soi !== MARKER_SOI) {
      return {};
      //throw "Not JPG file format";
    }

    //check if file format is Exif
    app1.marker = reader.byte();
    if (app1.marker !== MARKER_APP1) {
      return {};
      // throw "Not Exif file format";
    }

    app1.size = reader.byte();
    app1.exifHeader = reader.str(4);
    base = reader.skip(2).cur;
    app1.endian = reader.byte();

    if (app1.endian === 0x4949) {
      reader.setEndian(BinaryReader.LITTLE_ENDIAN);
      endian = BinaryReader.LITTLE_ENDIAN;
    } else {
      endian = BinaryReader.BIG_ENDIAN;
    }

    app1.ifd0Offset = reader.skip(2).word();

    //load IFD0
    reader.seek(base + app1.ifd0Offset);
    ifd0 = Exif.nameIfd(loadIfd(), Exif.IFD0_TABLE);

    reader.seek(base + ifd0.exifIFDPointer);
    subifd = Exif.nameIfd(loadIfd(), Exif.SUBIFD_TABLE);

    if ("gpsInfoIFDPointer" in ifd0) {
      reader.seek(base + ifd0.gpsInfoIFDPointer);
      gpsifd = Exif.nameIfd(loadIfd(), Exif.GPSIFD_TABLE);
    }

    return {
      ifd0 : ifd0,
      subifd : subifd,
      gpsifd : gpsifd
    };

    function loadIfd() {
      var ifd = {}, entries = [], i, j, size, bytesLen, data;

      ifd.entryLength = reader.byte();
      ifd.entries = entries;

      for (i = 0; i < ifd.entryLength; i++) {
        entries[i] = {};
        entries[i].tag = reader.byte();
        entries[i].fmt = reader.byte();
        entries[i].len = reader.word();
        size = FMT_SIZE[entries[i].fmt - 1];
        bytesLen = size * entries[i].len;

        if (bytesLen <= 4) {
          data = reader.getarr(4);
        } else {
          data = reader.word();
          reader.push();
          reader.seek(base + data);
          data = reader.getarr(bytesLen);
          reader.pop();
        }

        switch (entries[i].fmt) {
          case 1: //unsigned byte
          case 3: //unsigned short
          case 4: //unsigned long
            entries[i].data = [];
            for (j = 0; j < entries[i].len; j++) {
              entries[i].data[j] = BinaryReader.pack(data.subarray(j * size, (j + 1) * size));
            }
            entries[i].len === 1 && (entries[i].data = entries[i].data[0]);
            break;

          case 6: //signed byte
          case 8: //signed short
          case 9: //signed long
            entries[i].data = [];
            for (j = 0; j < entries[i].len; j++) {
              entries[i].data[j] = BinaryReader.pack_signed(data.subarray(j * size, (j + 1) * size));
            }
            entries[i].len === 1 && (entries[i].data = entries[i].data[0]);
            break;

          case 2: //ascii string
            entries[i].data = BinaryReader.packstr(data);
            break;

          case 5: //unsigned raditional
            entries[i].data = [];
            for (j = 0; j < entries[i].len; j++) {
              entries[i].data[j] =
                BinaryReader.pack(data.subarray(j * 8    , j * 8 + 4)) /
                BinaryReader.pack(data.subarray(j * 8 + 4, j * 8 + 8))
              ;
            }
            break;

          case 10: //signed raditional
            entries[i].data = [];
            for (j = 0; j < entries[i].len; j++) {
              entries[i].data[j] =
                BinaryReader.pack(data.subarray(j * 8    , j * 8 + 4)) /
                BinaryReader.pack(data.subarray(j * 8 + 4, j * 8 + 8))
              ;
            }
            break;

          default:
            entries[i].data = data;
        }
      }
      ifd.next = reader.word();

      return ifd;
    }
  };

  Exif.nameIfd = function (ifd, table) {
    var nifd = {}, entries = ifd.entries, name;

    for (var i = 0; i < ifd.entryLength; i++) {
      name = table[entries[i].tag];
      nifd[name || entries[i].tag] = ifd.entries[i].data;
    }

    return nifd;
  };

  Exif.IFD0_TABLE = {
    256 : "mageWidth",
    257 : "imageLength",
    258 : "bitsPerSample",
    259 : "compression",
    262 : "photometricInterpretation",
    274 : "orientation",
    277 : "samplesPerPixel",
    284 : "planarConfiguration",
    530 : "yCbCrSubSampling",
    531 : "yCbCrPositioning",
    282 : "xResolution",
    283 : "yResolution",
    296 : "resolutionUnit",
    273 : "stripOffsets",
    278 : "rowsPerStrip",
    279 : "stripByteCounts",
    513 : "jPEGInterchangeFormat",
    514 : "jPEGInterchangeFormatLength",
    301 : "transferFunction",
    318 : "whitePoint",
    319 : "primaryChromaticities",
    529 : "yCbCrCoefficients",
    532 : "referenceBlackWhite",
    306 : "dateTime",
    270 : "imageDescription",
    271 : "make",
    272 : "model",
    305 : "software",
    315 : "artist",
    3432 : "copyright",
    34665 : "exifIFDPointer",
    34853 : "gpsInfoIFDPointer"
  };

  Exif.SUBIFD_TABLE = {
    36864 : "exifVersion",
    40960 : "flashPixVersion",
    40961 : "colorSpace",
    37121 : "componentsConfiguration",
    37122 : "compressedBitsPerPixel",
    40962 : "pixelXDimension",
    40963 : "pixelYDimension",
    37500 : "makerNote",
    37510 : "userComment",
    40964 : "relatedSoundFile",
    36867 : "dateTimeOriginal",
    36868 : "dateTimeDigitized",
    37520 : "subSecTime",
    37521 : "subSecTimeOriginal",
    37522 : "subSecTimeDigitized",
    33434 : "exposureTime",
    33437 : "fNumber",
    34850 : "exposureProgram",
    34852 : "spectralSensitivity",
    34855 : "iSOSpeedRatings",
    34856 : "oECF",
    37377 : "shutterSpeedValue",
    37378 : "apertureValue",
    37379 : "brightnessValue",
    37380 : "exposureBiasValue",
    37381 : "maxApertureValue",
    37382 : "subjectDistance",
    37383 : "meteringMode",
    37384 : "lightSource",
    37385 : "flash",
    37386 : "focalLength",
    41483 : "flashEnergy",
    41484 : "spatialFrequencyResponse",
    41486 : "focalPlaneXResolution",
    41487 : "focalPlaneYResolution",
    41488 : "focalPlaneResolutionUnit",
    41492 : "subjectLocation",
    41493 : "exposureIndex",
    41495 : "sensingMethod",
    41728 : "fileSource",
    41729 : "sceneType",
    41730 : "cFAPattern",
    40965 : "interoperabilityIFDPointer"
  };

  Exif.GPSIFD_TABLE = {
    0  : "versionID",
    1  : "latitudeRef",
    2  : "latitude",
    3  : "longitudeRef",
    4  : "longitude",
    5  : "altitudeRef",
    6  : "altitude",
    7  : "timeStamp",
    8  : "satellites",
    9  : "status",
    10 : "measureMode",
    11 : "dOP",
    12 : "speedRef",
    13 : "speed",
    14 : "trackRef",
    15 : "track",
    16 : "imgDirectionRef",
    17 : "imgDirection",
    18 : "mapDatum",
    19 : "destLatitudeRef",
    20 : "destLatitude",
    21 : "destLongitudeRef",
    22 : "destLongitude",
    23 : "bearingRef",
    24 : "bearing",
    25 : "destDistanceRef",
    26 : "destDistance"
  };

})();
