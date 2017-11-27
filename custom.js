function getLatlngs(filters) {
  var points = [];
  for (var i in window.results.data) {
    var e = window.results.data[i];
    var species = e[""];
    var matchingFilter = false;
    if (filters && filters.length) {
      for (var j in filters) {
        var f = filters[j].id;
        if (species.startsWith(f)) {
          matchingFilter = true;
          break;
        }
      }
    } else {
      matchingFilter = true;
    }
    for (var k in e) {
      if (k != "") {
        var site = window.meta[k];
        if (matchingFilter && e[k] > 0) {
          points.push([site.y, site.x, e[k]])
        }
      }
    }
  }
  $("#numberResults").text(points.length);
  return points;
}

function getFilterData() {
  var data = {};
  for (var i in window.results.data) {
    var e = window.results.data[i];
    var species = e[""];
    var hasEntries = false;
    for (var k in e) {
      if (e[k] > 0) {
        hasEntries = true;
        break;
      }
    }
    if (!hasEntries) continue;
    var j = 0;
    while (j != -1) {
      j = species.indexOf(";", j+1);
      if (j == -1) {
        var subS = species;
      } else {
        var subS = species.substring(0, j);
      }
      data[subS] = true;
    }
  }
  var keys = Object.keys(data);
  return keys;
}

function handleResults(results, meta) {
  window.results = results;
  var metaDict = {};
  for (var i in meta.data) {
    var site = meta.data[i];
    var reprojected = proj4('EPSG:2193', 'WGS84', site);
    metaDict[site['site'].toUpperCase()] = reprojected;
  }
  window.meta = metaDict;
  $("#filter").select2({
    placeholder: 'Type to filter',
    multiple: true,
    data: getFilterData(),
    tags: true,
  });
  $("#filter").change(function() {
    window.location.hash = $(this).val();
    var filters = $(this).select2('data');
    console.log(filters);
    var latlngs = getLatlngs(filters);
    console.log(latlngs);
    var maxWeight = 0;
    for (var i in latlngs) {
      var w = latlngs[i][2];
      if (w > maxWeight) maxWeight = w;
    }
    window.heat.setOptions({"max": maxWeight * 1.5});
    window.heat.setLatLngs(latlngs);
  });
  window.heat = L.heatLayer(getLatlngs(), {
    "maxZoom": 6,
  }).addTo(map);
  $("#filter").val(window.location.hash.replace("#", "").split(",")).trigger('change');
}

var map = L.map('map').setView([-41.235726,172.5118422], 6);
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
  maxZoom: 18,
  attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
    'Imagery © <a href="http://mapbox.com">Mapbox</a>',
  id: 'mapbox.streets',
  minZoom: 6,
}).addTo(map);
var bounds = map.getBounds();
bounds._northEast.lat += 10;
bounds._northEast.lng += 10;
bounds._southWest.lat -= 10;
bounds._southWest.lng -= 10;
map.setMaxBounds(bounds);
proj4.defs("EPSG:2193", "+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
Papa.parse("Gavin_water_data_2010.csv", {
  download: true,
  header: true,
  dynamicTyping: true,
  complete: function(results) {
    Papa.parse("Gavin_water_data_2010_metadata.csv", {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: function(meta) {
        handleResults(results, meta);
      }
    });
  }
});
