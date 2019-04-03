import * as L from "leaflet";

export function renderHeatLayer(siteAggs, heatLayerGroup, map) {
  let heatData = [];
  let maxWeight = 0;
  for (let siteId in siteAggs) {
    let siteMeta = window.sampleContextLookup[siteId];
    let siteWeight = siteAggs[siteId].abundance;
    if (maxWeight < siteWeight) {
      maxWeight = siteWeight;
    }
    heatData.push([siteMeta.latitude, siteMeta.longitude, siteWeight]);
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
export function getOutlineOpacity() {
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
}
