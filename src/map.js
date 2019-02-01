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
