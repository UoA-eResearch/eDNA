function handleResults(results, meta) {
  window.results = results;
  var metaDict = {};
  for (var i in meta.data) {
    var site = meta.data[i];
    var reprojected = proj4('EPSG:2193', 'WGS84', site);
    metaDict[site['site'].toUpperCase()] = reprojected;
  }
  window.meta = metaDict;
  var points = [];
  for (var i in results.data) {
    var e = results.data[i];
    var species = e[""];
    for (var k in e) {
      if (k != "") {
        var site = metaDict[k];
        points.push([site.y, site.x, e[k]])
      }
    }
  }
  console.log(points.length + " points");
  window.heat = L.heatLayer(points, {
    "maxZoom": 6,
  }).addTo(map);
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
