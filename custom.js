function checkFragment(f, species, site) {
  var ampIndex = f.indexOf("&");
  var ltIndex = f.indexOf("<");
  var gtIndex = f.indexOf(">");
  if (ampIndex > 0) {
    var left = f.substring(0, ampIndex).trim();
    var right = f.substring(ampIndex+1).trim();
    return checkFragment(left, species, site) && checkFragment(right, species, site);
  } else if (ltIndex > 0) {
    var left = f.substring(0, ltIndex).trim();
    var right = f.substring(ltIndex+1).trim();
    if (site[left] < right) {
      return true;
    }
  } else if (gtIndex > 0) {
    var left = f.substring(0, gtIndex).trim();
    var right = f.substring(gtIndex+1).trim();
    if (site[left] > right) {
      return true;
    }
  } else {
    return species.startsWith(f);
  }
  return false;
}

function getLatlngs(filters) {
  var points = [];
  for (var i in window.results.data) {
    var e = window.results.data[i];
    var species = e[""];
    for (var k in e) {
      if (k != "") {
        var site = window.meta[k];
        var siteMetaMatch = false;
        var match = false;
        if (!filters) match = true;
        for (var j in filters) {
          var f = filters[j].id;
          match = checkFragment(f, species, site);
          if (match) break;
        }
        if (match && e[k] > 0) {
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
  for (var k in window.meta['ABT']) {
    data[k] = true;
  }
  var hashComponents = window.location.hash.replace("#", "").split(",");
  for (var i in hashComponents) {
    data[hashComponents[i]] = true;
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
  if (window.location.hash.length) {
    $("#filter").val(window.location.hash.replace("#", "").split(",")).trigger('change');
  }
}

var map = L.map('map').setView([-41.235726,172.5118422], 6);
var CartoDB_DarkMatter = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
	subdomains: 'abcd',
	maxZoom: 19,
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
