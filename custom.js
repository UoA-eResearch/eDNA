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

function getSiteWeights(filters) {
  var sites = {};
  n_points = 0;
  for (var i in window.results.data) {
    var e = window.results.data[i];
    var species = e[""];
    for (var k in e) {
      if (k != "") {
        var site = window.meta[k];
        var match = false;
        if (filters.length == 0) match = true;
        for (var j in filters) {
          var f = filters[j].id;
          match = checkFragment(f, species, site);
          if (match) break;
        }
        if (match && e[k] > 0) {
          if (!sites[k]) sites[k] = 0;
          sites[k] += e[k];
          n_points++;
        }
      }
    }
  }
  $("#numberResults").text(n_points);
  return sites;
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
    window.location.hash = encodeURIComponent($(this).val());
    var filters = $(this).select2('data');
    console.log(filters);
    if (mode == "pie") {
      for (var i in window.circles) {
        map.removeLayer(window.circles[i]);
      }
      window.circles = [];
      for (var site in window.meta) {
        var siteValues = [];
        var siteLabels = [];
        var siteMeta = window.meta[site];
        for (var i in window.results.data) {
          var e = window.results.data[i];
          var species = e[""];
          var match = false;
          if (filters.length == 0) match = true;
          for (var j in filters) {
            var f = filters[j].id;
            match = checkFragment(f, species, site);
            if (match) break;
          }
          if (match && e[site] > 0) {
            siteValues.push(e[site]);
            siteLabels.push(species);
          }
        }
        if (siteValues.length) {
          var chart = L.minichart([siteMeta.y, siteMeta.x], {
            type: "pie",
            data: siteValues,
            labels: siteLabels,
            width: map.getZoom() * 2
          }).addTo(map);
          window.circles.push(chart);
        }
      }
      return;
    }
    var siteWeights = getSiteWeights(filters);
    console.log(siteWeights);
    var maxWeight = 0;
    for (var site in siteWeights) {
      var w = siteWeights[site]
      if (w > maxWeight) maxWeight = w;
    }
    if (mode == "grid") {
      for (var i in window.circles) {
        map.removeLayer(window.circles[i]);
      }
      for (var site in siteWeights) {
        var siteMeta = window.meta[site];
        var w = siteWeights[site];
        var i = w / maxWeight * colors.length;
        var color = colors[Math.floor(i)];
        var circle = L.circle([siteMeta.y, siteMeta.x], {
          stroke: false,
          fill: true,
          fillColor: color,
          fillOpacity: 1,
          radius: 5000
        }).addTo(map);
        window.circles.push(circle);
      }
    } else {
      var latlngs = [];
      for (var site in siteWeights) {
        var siteMeta = window.meta[site];
        latlngs.push([siteMeta.y, siteMeta.x, siteWeights[site]]);
      }
      if (!window.heat) window.heat = L.heatLayer(latlngs).addTo(map);
      window.heat.setOptions({"max": maxWeight * 1.5, "maxZoom": 6});
      window.heat.setLatLngs(latlngs);
    }
  });
  if (hashComponents[0].length) {
    $("#filter").val(hashComponents);
  }
  $("#filter").trigger('change');
}

var map = L.map('map').setView([-41.235726,172.5118422], 6);
L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
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
var params = new URLSearchParams(window.location.search);
var mode = params.get("mode");
window.circles = [];
if (mode == "grid") {
  var colors = ['#fee8c8','#fdd49e','#fdbb84','#fc8d59','#ef6548','#d7301f','#b30000','#7f0000'];
  var shape = new L.PatternCircle({
      x: 5,
      y: 5,
      radius: 5,
      fill: true
  });
  var pattern = new L.Pattern({width:10, height:10});
  pattern.addShape(shape);
  pattern.addTo(map);
  var customLayer = L.geoJson(null, {
    style: {
      stroke: false,
      fillPattern: pattern,
    }
  });
  var nz = omnivore.kml('nz-coastlines-and-islands-polygons-topo-1500k.kml', null, customLayer).addTo(map);
}
if (mode == "pie") {
  map.on('zoomend', function() {
    for (var i in window.circles) {
      window.circles[i].setOptions({
        width: map.getZoom() * 2
      });
    }
  });
}
var hashComponents = decodeURIComponent(window.location.hash.replace("#", "")).split(",");
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
