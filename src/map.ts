import * as L from "leaflet";
import { API_URLS } from "./constants";
import * as d3 from "d3";
import { strongHeader, strongLine } from "./utility";
import { plotConfig } from "./plot";

export {
  renderHeatLayer,
  highlightLayer,
  featureCollectionToLayer,
  getOutlineOpacity,
  disableHighlightLayer,

}

function renderHeatLayer(siteAggs, heatLayerGroup, sampleContextLookup) {
  let heatData = [];
  let maxWeight = 0;
  for (let siteId in siteAggs) {
    let siteMeta = sampleContextLookup[siteId];
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

  // stop re-applying heatmap on every dataset received, only appears on initial page load.
  // map.addLayer(heatLayerGroup);
  return heatLayer;
}

function highlightLayer(layer) {
  layer.setStyle({
    weight: 5,
    opacity: 0.9
  });
  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }
}

function featureCollectionToLayer(
  featureCollection,
  property,
  layerGroup
) {
  const outlineOpacity = 0.15;
  const outlineColor = "#000000";
  const fillOpacity = d => (d > 0.0 ? 0.8 : 0.2);
  const fillColor = d =>
    d > 0.9
      ? "#800026"
      : d > 0.8
      ? "#BD0026"
      : d > 0.7
      ? "#E31A1C"
      : d > 0.6
      ? "#FC4E2A"
      : d > 0.5
      ? "#FD8D3C"
      : d > 0.4
      ? "#FEB24C"
      : d > 0.3
      ? "#FED976"
      : d > 0.2
      ? "#FFEDA0"
      : d > 0.0
      ? "#FFFFCC"
      : "#9ECAE1";
  const geoJSONLayer = L.geoJSON(featureCollection, {
    style: layerStyle,
    onEachFeature: onEachFeature
  });
  layerGroup.clearLayers();
  layerGroup.addLayer(geoJSONLayer);

  return geoJSONLayer;

  function layerStyle(feature) {
    return {
      fillColor: fillColor(feature.properties[property]),
      weight: 1,
      opacity: outlineOpacity,
      color: outlineColor,
      fillOpacity: fillOpacity(feature.properties[property])
    };
  }

  function onEachFeature(feature, layer) {
    // setting popup size constraint.
    layer.bindPopup("Loading...", {
      // layer.bindPopup(feature.properties.popupContent, {
      maxWidth: 400,
      maxHeight: 200
    });
    layer.on({
      mouseover: handleGridLayerMouseOver,
      mouseout: handleGridLayerMouseOut,
      click: handleGridLayerClick,
      select: highlightLayer
    });
    // console.log(layer.feature);
  }
}

/**
 * Function called when layer is selected.
 * @param {*} e
 */
function handleGridLayerClick(e) {
  var layer = e.target;
  let popup = layer.getPopup();
  popup.bindPopup(findMissingOtuLookups(layer, popup));
}

function handleGridLayerMouseOver(e) {
  // TODO: Should be in plot file.
  let layer = e.target;
  layer.feature.properties.sites.forEach(siteId => {
    let circle = d3.selectAll("#_" + siteId);
    circle
      .transition()
      .duration(250)
      .attr("r", plotConfig.activeCircleRadius);
  });
}

/**
 * highlights plot circles that are within a grid cell layer.
 * @param   {layer event}  e  some layer event
 * @return  {void}
 */
function handleGridLayerMouseOut(e) {
  // TODO: Should be in plot file.
  let layer = e.target;
  layer.feature.properties.sites.forEach(siteId => {
    let circle = d3.selectAll("#_" + siteId);
    circle
      .transition()
      .duration(250)
      .attr("r", plotConfig.inactiveCircleRadius);
  });
}

  // declare global {
  //   interface Window {
  //     otuLookup: any;
  //     sampleContextLookup: any;
  //   }
  // }

/**
 * Finds the otu ids for which there is no name text from a layer, requests the text, returns the popup content
 * @param {grid layer rectangle} layer
 * @param {popup to be populated} popup
 */
function findMissingOtuLookups(layer, popup) {
  let missingIds = [];
  for (const [otuId] of Object.entries(layer.feature.properties.otus)) {
    if (!(otuId in window.otuLookup) || !window.otuLookup[otuId].code) {
      missingIds.push(otuId);
    }
  }
  if (missingIds.length > 0) {
    console.log(
      "missing " + missingIds.length + " otu names. Requesting from server."
    );
    let f_url = API_URLS.otuDataById + missingIds.join("&id=");
    fetch(f_url).then(response => {
      response.json().then(jsonResponse => {
        popup.setContent(
          makePopupContent(layer.feature.properties, jsonResponse)
        );
      });
    });
  } else {
    popup.setContent(makePopupContent(layer.feature.properties));
  }
}

/**
 * generates popup content for grid cells
 */
function makePopupContent(properties, jsonResponse = null) {
  // TODO: Add pagination to long popup contents. Unable to request over 500 ids at once.
  // filling in missing otu entries here.
  if (jsonResponse != null && jsonResponse !== undefined) {
    jsonResponse.otu_names.forEach(otu => {
      // window.otuLookup[otu.id] = otu.code;
      if (!window.otuLookup[otu.id]) {
        window.otuLookup[otu.id] = {
          code: otu.code
        };
      } else {
        window.otuLookup[otu.id]["code"] = otu.code;
      }
    });
  }

  let popupContent =
    strongHeader("Cell Richness", properties.richness) +
    // strongHeader("Cell Abundance", properties.weightedAbundance) +
    strongHeader("Cell Site Count", properties.sites.length) +
    strongHeader(
      "Longitude",
      properties.coordinates[0][0] + " to " + properties.coordinates[2][0]
    ) +
    strongHeader(
      "Latitude",
      properties.coordinates[0][1] + " to " + properties.coordinates[2][1]
    ) +
    "<br />";
  //list all sites within the cell.
  popupContent += strongLine("Sites in cell: ") + "<ul>";
  for (let i in properties.sites) {
    let siteId = properties.sites[i];
    popupContent +=
      "<li>" + window.sampleContextLookup[siteId].sample_identifier + "</li>";
  }
  popupContent += "</ul><br />";

  for (let otuId in properties.otus) {
    popupContent +=
      strongLine(window.otuLookup[otuId].code) +
      strongHeader("Abundance in cell", properties.otus[otuId].abundance) +
      strongHeader("Frequency in cell", properties.otus[otuId].count) +
      "<br />";
  }
  return popupContent;
}

/**
 * centralised place to store value
 */
function getOutlineOpacity(): number {
  return 0.15;
}

/**
 * Resets layer outline weight and opacity to original values.
 * Values are hardcoded due to geojson.reset() not working as planned.
 * @param {*} layer
 */
function disableHighlightLayer(layer) {
  var properties = layer.feature.properties;
  //console.log(properties);
  layer.setStyle({
    weight: 1,
    opacity: getOutlineOpacity()
  });
}
