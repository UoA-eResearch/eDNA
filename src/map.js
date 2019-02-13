import * as L from "leaflet";

<<<<<<< HEAD
export function renderHeatLayer(siteAggs, heatLayerGroup, map) {
  let heatData = [];
  let maxWeight = 0;
  for (let siteId in siteAggs) {
    let siteMeta = window.sampleContextLookup[siteId];
    let siteWeight = siteAggs[siteId].abundance;
    if (maxWeight < siteWeight) {
      maxWeight = siteWeight;
    }
    heatData.push([siteMeta.y, siteMeta.x, siteWeight]);
  }
  let heatLayer = L.heatLayer(heatData);
  heatLayerGroup.clearLayers();
  heatLayerGroup.addLayer(heatLayer);
  heatLayer.setOptions({ max: maxWeight * 1.5, maxZoom: 6 });
  heatLayer.setLatLngs(heatData);
  map.addLayer(heatLayerGroup);
  return heatLayer;
}

export function highlightLayer(layer) {
  layer.setStyle({
    weight: 5,
    opacity: 0.9
  });
  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }
}

/**
 * centralised place to store value
 */
function getOutlineOpacity() {
  return 0.15;
}

/**
 * Resets layer outline weight and opacity to original values.
 * Values are hardcoded due to geojson.reset() not working as planned.
 * @param {*} layer
 */
export function disableHighlightLayer(layer) {
  var properties = layer.feature.properties;
  //console.log(properties);
  layer.setStyle({
    weight: 1,
    opacity: getOutlineOpacity(properties.hasSamples)
  });
=======
export let detailLevel = 60;

export function initializeMap() {
  //generating the map
  const tileLayer = L.tileLayer(
    "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
      subdomains: "abcd",
      maxZoom: 19,
      minZoom: 5.75
    }
  );

  const map = L.map("map", {
    zoomSnap: 0.25,
    zoomDelta: 0.25,
    layers: tileLayer,
    fullscreenControl: true
  }).setView([-41.235726, 172.5118422], 5.75);
  var bounds = map.getBounds();
  bounds._northEast.lat += 10;
  bounds._northEast.lng += 10;
  bounds._southWest.lat -= 10;
  bounds._southWest.lng -= 10;
  map.setMaxBounds(bounds);
  //Defines how the proj4 function is to convert.
  //in this case proj4 is being set up to convert longlat to cartesian.
  // TODO: coordinate conversion: Change EPSG:2193 to EPSG:4326? To match the bulk convert.
  // proj4.defs(
  //   "EPSG:2193",
  //   "+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
  // );

  //gets the params from the search bar
  var taxonParams = new URLSearchParams(window.location.search);
  var mode = taxonParams.get("mode");

  detailLevel = 60;
  //warrick map additions

  //shows the scale of the map
  var scaleIndicator = L.control.scale().addTo(map);

  //instantiating empty layer control layers to be filled later
  var gridRichnessLayerGroup = L.layerGroup();
  var gridAbundanceLayerGroup = L.layerGroup();
  var gridSitesLayerGroup = L.layerGroup();
  var heatLayerGroup = L.layerGroup();
  var baseMaps = {
    Base: tileLayer
  };
  var overlayLayerGroup = {
    "Grid: Abundance": gridAbundanceLayerGroup,
    "Grid: Richness": gridRichnessLayerGroup,
    "Heat: Abundance": heatLayerGroup,
    "Grid: Site Count": gridSitesLayerGroup
  };
  var layerMenuControl = L.control
    .layers(baseMaps, overlayLayerGroup, {
      position: "bottomleft",
      hideSingleBase: true,
      sortLayers: true,
      collapsed: false
    })
    .addTo(map);

  //Adding custom control for Andrew's Visualization Copy.
  const leafletGraphControl = L.control({ position: "bottomright" });
  leafletGraphControl.onAdd = function() {
    this._div = L.DomUtil.create("div", "info"); //creates div with class "info"
    this._div.innerHTML = `<div id="chart" style="display:none;">
  </div>
  <br />
  <button id = "graph-button" >Toggle Graph</button>
  <label> Colour by: 
    <select id="meta-select" >
      <option selected value="elev">elev</option>
      <option value="mid_ph">Mid pH</option>
      <option value="mean_C_percent">Mean carbon concentration</option>
      <option value="prec_mean">Mean Precipitation</option>
      <option value="ave_logNconcen">Average log Nitrogen concentration</option>
      <option value="water2">Water 2</option>
      <option value="freshwater">Freshwater</option>
    </select>
  </label>
  <label> Colour type: 
    <select id="colour-scheme-select">
      <option selected value="sequential">Sequential</option>
      <option value="diverging">Diverging</option>
    </select>
  </label>`;
    return this._div;
  };
  leafletGraphControl.addTo(map);
>>>>>>> 3619a1d0b27797497f79fa6f637b433af7e399a9
}
