import * as _ from "lodash";
import * as L from "leaflet";
import * as d3 from "d3";
import * as $ from "jquery";
import "../js/leaflet.heat";
import "../js/leaflet-slider";
import select2 from "../js/select2.min.js";
import "../js/L.Control.Range";
import { updateGraph, initPlotChart, updatePlotCircleColours } from "./plot";
import { strongHeader, strongLine } from "./utility";
import { API_URLS } from "./constants";
import { renderHeatLayer, highlightLayer } from "./map";

window.circles = [];
window.contextTags = [];
window.siteAggregates = {};
window.otuLookup = {};
window.sampleContextLookup = {};

/**
 * generates the request URL and calls recalculating data functions when data is received.
 */
function fetchSampleOtus() {
  let contextFilters = $("#select-contextual").select2("data");
  let taxonFilters = $("#select-taxonomic").select2("data");
  let ampliconFilters = $("#select-amplicon").select2("data");

  // Formatting and adding otu arguments
  let ontologyIds = [];
  for (let i in taxonFilters) {
    let taxonIdChain = taxonFilters[i];
    let idChain = taxonIdChain.id.split(",").join("+");
    ontologyIds.push(idChain);
  }
  let url = API_URLS.sampleOtus;
  url += "otu=" + ontologyIds.join("&otu=");

  // Formatting and adding contextual filters to url
  if (contextFilters.length > 0) {
    let s = contextFilters
      .map(param => {
        let paramEncoded = param.text;
        paramEncoded = paramEncoded.replace("<", "$lt");
        paramEncoded = paramEncoded.replace(">", "$gt");
        paramEncoded = paramEncoded.replace("=", "$eq");
        return "&q=" + paramEncoded;
      })
      .join("");
    url += s;
  }

  // amplicon filtering
  if (ampliconFilters.length > 0) {
    let useAny = false;
    let ampliconUrlSegment = ampliconFilters
      .map(filter => {
        if (filter.text == "Any") {
          useAny = true;
        }
        return "&q=amplicon$eq" + filter.text;
      })
      .join("");
    if (!useAny) {
      url += ampliconUrlSegment;
    }
  }

  if (document.getElementById("endemic-checkbox").checked) {
    url += "&endemic=true";
  } else {
  }
  if (document.getElementById("select-operator").value == "or") {
    url += "&operator=union";
  } else {
    url += "&operator=intersection";
  }

  console.log("request url: " + url);

  // fetch the url
  fetch(url).then(response => {
    response.json().then(responseData => {
      calculateSampleOtuData(responseData);
    });
  });
}

/**
 * recalculates where data fits on the grid structure without fetching new data from the server.
 */
function recalculateGridLayer() {
  if (window.previousResults) {
    calculateSampleOtuData(window.previousResults);
  } else {
    $("#select-taxonomic").trigger("change");
  }
}

/**
 * takes combined sampleOtu data and sampleContextual data and calculates their positions and generates layers.
 */
function calculateSampleOtuData(responseData) {
  window.previousResults = responseData;
  let sampleOtus = responseData.sample_otu_data;
  let sampleContexts = responseData.sample_contextual_data;
  // display amount of abundances from a search below the filter
  $("#numberResults").text(sampleOtus.length);
  // restructure the sample contexts by pk
  for (let i in sampleContexts) {
    let sampleContext = sampleContexts[i];
    window.sampleContextLookup[sampleContext.id] = sampleContext;
  }
  let siteAggregatedData = aggregateBySite(sampleOtus);
  let heatLayer = renderHeatLayer(siteAggregatedData, heatLayerGroup, map);
  let cellAggregatedData = aggregateByCell(siteAggregatedData, sampleContexts);
  let featureCollection = makeFeatureCollection(cellAggregatedData);

  let abundanceLayer = featureCollectionToLayer(
    featureCollection,
    "weightedAbundance",
    gridAbundanceLayerGroup
  );
  addLayerIdToSampleContext(abundanceLayer);

  let richnessLayer = featureCollectionToLayer(
    featureCollection,
    "weightedRichness",
    gridRichnessLayerGroup
  );
  addLayerIdToSampleContext(richnessLayer);

  // NOTE: disabling  site layer for quick comparison: rectangles are distorted.
  let siteLayer = featureCollectionToLayer(
    featureCollection,
    "weightedSites",
    gridSitesLayerGroup
  );
  addLayerIdToSampleContext(siteLayer);

  siteAggregatedData = addSiteMetrics(siteAggregatedData);
  window.siteAggregates = siteAggregatedData;
  // creating site -> leaflet layer references for each layer.
  updateGraph(siteAggregatedData);
}

function addLayerIdToSampleContext(layerGroup) {
  layerGroup.eachLayer(function(layer) {
    let leafletId = L.stamp(layer);
    let sites = (((layer || {}).feature || {}).properties || {}).sites;
    if (sites !== undefined) {
      sites.forEach(siteId => {
        let sampleContext = window.sampleContextLookup[siteId];
        if (sampleContext.leafletIds == null) {
          sampleContext.leafletIds = [];
        }
        sampleContext.leafletIds.push(leafletId);
      });
    }
  });
}

/**
 * Iterates the sample otu json response and sums the values by site
 * @param {*} sampleOtus
 */
function aggregateBySite(sampleOtus) {
  let siteAggs = {};
  let missingOtus = [];
  for (let i in sampleOtus) {
    let tuple = sampleOtus[i];
    let otuId = tuple[0];
    let siteId = tuple[1];
    let abundance = tuple[2];
    // if site doesn't exist set up blank site and always increment to avoid messy conditionals.
    if (!(siteId in siteAggs)) {
      siteAggs[siteId] = {
        abundance: 0,
        richness: 0,
        otus: {}
      };
    }
    let siteAgg = siteAggs[siteId];
    siteAgg.abundance += abundance;
    // same default object creation principle applied to the otus sub-object.
    if (!(otuId in siteAgg.otus)) {
      siteAgg.otus[otuId] = {
        abundance: 0,
        count: 0
      };
      siteAgg.richness++;
      siteAgg.otus[otuId].abundance += abundance;
      siteAgg.otus[otuId].count++;
    }
  }
  return siteAggs;
}

/**
 * Iterates the site aggregates and sums the values by grid cell coordinates. Returns a dictionary which keys indicate positional offsets.
 * @param {*} siteAggs
 * @param {*} sampleContexts
 */
function aggregateByCell(siteAggs) {
  // setting up grid parameters
  makeGrid(detailLevel);
  // console.log("aggregate by cell");
  let start = [164.71222, -33.977509];
  let end = [178.858982, -49.66352];
  const hardBounds = L.latLngBounds(start, end);
  const northWest = hardBounds.getNorthWest();
  const northEast = hardBounds.getNorthEast();
  const southWest = hardBounds.getSouthWest();
  // NOTE: alternative way of calculating is incorrectly plotting. some strange offset.
  // const northWest = L.latLng(start[0], start[1]);
  // const northEast = L.latLng(start[0], end[1]);
  // const southWest = L.latLng(end[0], start[1]);
  const latOffset = (northWest.lat - southWest.lat) / detailLevel;
  const lngOffset = (northEast.lng - northWest.lng) / detailLevel;
  // using the params for generating the keys
  let cellAggs = {};
  for (let siteId in siteAggs) {
    let site = siteAggs[siteId];
    let sampleContext = window.sampleContextLookup[siteId];
    let x = sampleContext.longitude;
    let y = sampleContext.latitude;
    let cellKey = generateCellKey(x, y, start, lngOffset, latOffset);
    // if doesn't exist, create the cell.
    if (!(cellKey in cellAggs)) {
      cellAggs[cellKey] = {
        abundance: 0,
        richness: 0,
        sites: [],
        otus: {},
        coordinates: calculateCellCoordinates(
          cellKey,
          start,
          lngOffset,
          latOffset
        )
      };
    }
    // Adding values that are allowed to overlap/accumulate.
    let cell = cellAggs[cellKey];
    cell.abundance += site.abundance;
    cell.sites.push(siteId);
    for (let otuId in site.otus) {
      let siteOtu = site.otus[otuId];
      if (!(otuId in cell.otus)) {
        cell.otus[otuId] = {
          abundance: 0,
          count: 0
        };
        // alternatively just use the otus keys length and assign to richness.
        cell.richness++;
      }
      let cellOtu = cell.otus[otuId];
      cellOtu.abundance += siteOtu.abundance;
      cellOtu.count += siteOtu.count;
    }
    for (let key in cellAggs) {
      let cellAgg = cellAggs[key];
      cellAgg["siteCount"] = cellAgg.sites.length;
    }
  }
  return cellAggs;

  function calculateCellCoordinates(key, start, latOffset, lngOffset) {
    // can use the key + grid start to reverse engineer the coordinates
    let offsets = parseInt(key);
    let yFactor = Math.floor(offsets / detailLevel);
    let xFactor = offsets % detailLevel;
    let cellStartX = start[0] + lngOffset * xFactor;
    let cellStartY = start[1] - latOffset * yFactor;
    // order: topleft, topright, bottomright, bottomleft
    return [
      [cellStartX, cellStartY],
      [cellStartX + lngOffset, cellStartY],
      [cellStartX + lngOffset, cellStartY - latOffset],
      [cellStartX, cellStartY - latOffset]
    ];
  }

  function generateCellKey(x, y, start, latOffset, lngOffset) {
    let lngDiff = Math.abs(x) - Math.abs(start[0]);
    let colIndex = Math.floor(lngDiff / lngOffset);
    let latDiff = Math.abs(y) - Math.abs(start[1]);
    let rowIndex = Math.floor(latDiff / latOffset);
    let cellKey = rowIndex * detailLevel + colIndex;
    return cellKey;
  }
}

function makeFeatureCollection(cellAggs) {
  let maxes = calculateMaxes(cellAggs);
  let featureCollection = {
    type: "FeatureCollection",
    features: []
  };
  for (let key in cellAggs) {
    let cell = cellAggs[key];
    const weightedRichness = cell.richness / maxes.richness;
    const weightedAbundance = cell.abundance / maxes.abundance;
    const weightedSites = cell.siteCount / maxes.sites;
    featureCollection.features.push({
      type: "Feature",
      properties: {
        id: key,
        weightedAbundance,
        weightedRichness,
        weightedSites,
        richness: cell.richness,
        sites: cell.sites,
        otus: cell.otus,
        coordinates: cell.coordinates
      },
      geometry: {
        type: "Polygon",
        coordinates: [cell.coordinates]
      }
    });
  }
  return featureCollection;

  function calculateMaxes(cellAggs) {
    let abundance = 0;
    let richness = 0;
    let sites = 0;
    for (let key in cellAggs) {
      let cell = cellAggs[key];
      if (cell.abundance > abundance) {
        abundance = cell.abundance;
      }
      if (cell.richness > richness) {
        richness = cell.richness;
      }
      if (cell.siteCount > sites) {
        sites = cell.siteCount;
      }
    }
    return {
      abundance,
      richness,
      sites
    };
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
      window.otuLookup[otu.id] = otu.code;
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
      strongLine(window.otuLookup[otuId]) +
      strongHeader("Abundance in cell", properties.otus[otuId].abundance) +
      strongHeader("Frequency in cell", properties.otus[otuId].count) +
      "<br />";
  }
  return popupContent;
}

function featureCollectionToLayer(featureCollection, property, layerGroup) {
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
      maxWidth: 4000,
      maxHeight: 150
    });
    layer.on({
      mouseover: handleMouseOver,
      mouseout: handleMouseOut,
      click: handleCellClick,
      select: highlightLayer
    });
    // console.log(layer.feature);
  }
}

/**
 * Finds the otu ids for which there is no name text, requests the text, returns the popup content
 * @param {grid layer rectangle} layer
 * @param {popup to be populated} popup
 */
function findMissingOtuLookups(layer, popup) {
  let missingIds = [];
  for (const [otuId] of Object.entries(layer.feature.properties.otus)) {
    if (!(otuId in window.otuLookup)) {
      missingIds.push(otuId);
    }
  }
  if (missingIds.length > 0) {
    console.log(
      "missing " + missingIds.length + " otu names. Requesting from server."
    );
    let f_url = API_URLS.otu_code_by_id + missingIds.join("&id=");
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
 * Function called when layer is selected.
 * @param {*} e
 */
function handleCellClick(e) {
  var layer = e.target;
  let popup = layer.getPopup();
  popup.bindPopup(findMissingOtuLookups(layer, popup));
}

function handleMouseOver(e) {
  let layer = e.target;
  layer.feature.properties.sites.forEach(siteId => {
    // needs to use sitecode as you cannot select in css using a number "#123"
    let siteCode = window.sampleContextLookup[siteId].sample_identifier;
    let circle = d3.selectAll("#" + siteCode);
    circle
      .transition()
      .duration(250)
      .attr("r", 14);
  });
}

/**
 * highlights plot circles that are within a grid cell layer.
 * @param   {layer event}  e  some layer event
 * @return  {void}
 */
function handleMouseOut(e) {
  let layer = e.target;
  layer.feature.properties.sites.forEach(siteId => {
    // needs to use sitecode as you cannot select in css using a number "#123"
    let siteCode = window.sampleContextLookup[siteId].site;
    let circle = d3.selectAll("#" + siteCode);
    circle
      .transition()
      .duration(250)
      .attr("r", 7);
  });
}

/**
 * Makes grid array for cells. Each cell starts off with only containing coordinates.
 * @param {*} detailLevel
 */
function makeGrid(detailLevel) {
  //Hard coded bounds and offsets.
  const gridStart = [164.71222, -33.977509];
  const gridEnd = [178.858982, -49.66352];

  const hardBounds = L.latLngBounds(gridStart, gridEnd);
  let northWest = hardBounds.getNorthWest();
  let northEast = hardBounds.getNorthEast();
  let southWest = hardBounds.getSouthWest();
  const latOffset = (northWest.lat - southWest.lat) / detailLevel;
  const lngOffset = (northEast.lng - northWest.lng) / detailLevel;
  // console.log(latOffset, lngOffset);
  // The bounds method seems to make the rectangle less distorted
  // const latOffset = (gridStart[1] - gridEnd[1]) / detailLevel;
  // const lngOffset = (gridEnd[0] - gridStart[0]) / detailLevel;

  let gridCells = [];
  let cellStart = gridStart;
  for (let i = 0; i < detailLevel; i++) {
    for (let j = 0; j < detailLevel; j++) {
      //create rectangle polygon.
      const cell = makeCell();
      gridCells.push(cell);
      cellStart = incrementLongitude();
    }
    cellStart = resetLongitudeDecrementLatitude();
  }

  let grid = {
    start: gridStart,
    lngOffset: lngOffset,
    latOffset: latOffset,
    detailLevel: detailLevel,
    cells: gridCells
  };
  return grid;

  function incrementLongitude() {
    return [cellStart[0] + lngOffset, cellStart[1]];
  }

  function resetLongitudeDecrementLatitude() {
    return [cellStart[0] - lngOffset * detailLevel, cellStart[1] - latOffset];
  }

  function makeCell() {
    let topLeft = [cellStart[0], cellStart[1]];
    let topRight = [cellStart[0] + lngOffset, cellStart[1]];
    let bottomRight = [cellStart[0] + lngOffset, cellStart[1] - latOffset];
    let bottomLeft = [cellStart[0], cellStart[1] - latOffset];
    let cell = [topLeft, topRight, bottomRight, bottomLeft];
    cell = {
      coordinates: cell,
      abundance: 0,
      richness: 0,
      cellSpecies: {},
      cellSites: [],
      hasSamples: false
    };
    // console.log(cell.coordinates);
    return cell;
  }
}

/**
 * Adds additional metrics to site aggregated data.
 */
function addSiteMetrics(siteAggregates) {
  // entries released in es6.
  for (const [siteId, site] of Object.entries(siteAggregates)) {
    site.shannonDiversity = 0;
    for (const [otuId, otu] of Object.entries(site.otus)) {
      let otuAbundance = otu.abundance;
      site.shannonDiversity +=
        (otuAbundance / site.abundance) *
        Math.log(otuAbundance / site.abundance);
    }
    site.shannonDiversity *= -1;
    site.effectiveAlpha = Math.exp(site.shannonDiversity);
  }
  return siteAggregates;
}

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
export const map = L.map("map", {
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

var detailLevel = 60;
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

/**
 * Takes in a sample contextual index, iterates through all active and stamped map layers, then returns the last matching layer with leaflet id. Assumes sample contextual contains a leafletId value.
 * @param {integer} id
 */
export function GetLayerBySampleContextId(id) {
  let targetLeafletIds = window.sampleContextLookup[id].leafletIds;
  // for now just iterate through all layers. Final layer that matches is returned.
  let targetLayer;
  map.eachLayer(function(layer) {
    // if (layer._leaflet_id == targetLeafletId) {
    if (targetLeafletIds.includes(layer._leaflet_id)) {
      targetLayer = layer;
    }
  });
  return targetLayer;
}

/**
 * synchronises slider handle position and input field values.
 *
 * @param   {integer}  value  value to update grid to
 *
 * @return  {void}
 */
function handleGridResInputChange(value, slider) {
  //slider slider.slider refers to the handle.
  slider.slider.value = value;
  slider._expand();
  slider._sliderValue.innerHTML = value;
  detailLevel = value;
  // TODO: Need to move this into a centralized way. needs to check if results null first then call fetch. Right now fetch makes the call to handle response but it should be the other way around.
  recalculateGridLayer();
}

function initializeDisplayOptionsControls() {
  let gridResSlider = L.control.slider(
    function(value) {
      detailLevel = value;
      // TODO: directly call fetchSampleOTU data instead of triggering a change.
      recalculateGridLayer();
    },
    {
      id: "grid-resolution-slider",
      min: 1,
      //width not working.
      size: "300px",
      max: 1500,
      step: 1,
      value: detailLevel,
      logo: "Grid",
      increment: true,
      orientation: "horiztonal",
      position: "bottomleft",
      syncSlider: true
    }
  );
  gridResSlider.addTo(map);

  let gridResInput = L.control({
    position: "bottomleft"
  });
  gridResInput.onAdd = map => {
    let _div = L.DomUtil.create("div", "info");
    _div.innerHTML =
      '<label for="grid-input">Grid Resolution: </label><input id="grid-input" placeholder="Type value" type="number" />';
    _div.onchange = event => {
      let value = event.srcElement.value;
      handleGridResInputChange(value, gridResSlider);
    };
    return _div;
  };
  gridResInput.addTo(map);

  let displayControlRoot = L.control({
    position: "bottomleft"
  });
  displayControlRoot.onAdd = map => {
    let displayControlRoot = L.DomUtil.create("div", "display-controls-root");
    displayControlRoot.id = "display-controls-root";
    displayControlRoot.className = "info leaflet-control";

    let togglableElements = document.createElement("div");
    togglableElements.id = "display-controls-togglable";
    togglableElements.className = "display-controls-togglable";
    displayControlRoot.appendChild(togglableElements);

    // adding pre-existing elements that will be hidden by toggling.
    togglableElements.appendChild(gridResSlider.getContainer());
    togglableElements.appendChild(gridResInput.getContainer());
    togglableElements.appendChild(layerMenuControl.getContainer());

    // adding the toggle button
    let displayControlVisibleButton = L.DomUtil.create(
      "button",
      "display-controls-root-button"
    );
    displayControlVisibleButton.id = "display-controls-root-button";
    displayControlVisibleButton.innerHTML = "Display Settings";
    displayControlVisibleButton.className = "info leaflet-control";
    displayControlRoot.appendChild(displayControlVisibleButton);
    return displayControlRoot;
  };
  displayControlRoot.addTo(map);
}

function initializeDisplayControlButton() {
  document.getElementById("display-controls-root-button").onclick = function() {
    $("#display-controls-togglable").toggle("slow");
  };
}

//Adding custom control for Andrew's Visualization Copy.
// colour by metric dropdown
const leafletGraphControl = L.control({ position: "bottomright" });
leafletGraphControl.onAdd = function() {
  let plotContainer = L.DomUtil.create("div", "info"); //creates div with class "info"

  // chart node
  let chartNode = document.createElement("div");
  chartNode.id = "chart";
  chartNode.style = "display: none;";

  plotContainer.appendChild(chartNode);

  // button
  let toggleButton = document.createElement("button");
  toggleButton.id = "graph-button";
  toggleButton.innerHTML = "Toggle plot";
  plotContainer.appendChild(toggleButton);

  // label
  let colorByLabel = document.createElement("label");
  colorByLabel.innerHTML = " Colour by: ";
  plotContainer.appendChild(colorByLabel);

  // select 1
  let colorBySelect = document.createElement("select");
  colorBySelect.id = "meta-select";

  let metaOptions = [
    { value: "elevation", text: "Elevation" },
    { value: "longitude", text: "Longitude" },
    { value: "latitude", text: "Latitude" },
    { value: "biome_t2", text: "Biome Tier 2" },
    { value: "environmental_feature_t1", text: "Environmental Feature 1" }
  ];

  metaOptions.forEach(option => {
    let optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.innerHTML = option.text;
    colorBySelect.appendChild(optionElement);
  });

  colorByLabel.appendChild(colorBySelect);

  // select 2
  let colorTypeLabel = document.createElement("label");
  colorTypeLabel.innerHTML = " Colour scheme: ";
  plotContainer.appendChild(colorTypeLabel);

  let colourSchemeSelect = document.createElement("select");
  colourSchemeSelect.id = "colour-scheme-select";

  let colorSchemeOptions = [
    { value: "sequential", text: "Sequential" },
    { value: "diverging", text: "Diverging" }
  ];

  colorSchemeOptions.forEach(option => {
    let optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.innerHTML = option.text;
    colourSchemeSelect.appendChild(optionElement);
  });

  colorTypeLabel.appendChild(colourSchemeSelect);

  // plotContainer.appendChild();

  // plotContainer.innerHTML = `<div id="chart" style="display:none;">
  // </div>
  // <br />
  // <button id = "graph-button" >Toggle Graph</button>
  // <label> Colour by:
  //   <select id="meta-select" >
  //     <option selected value="elevation">Elevation</option>
  //     <option value="latitude">Latitude</option>
  //     <option value="longitude">Longitude</option>
  //     <option value="biome_t2">Biome Tier 2</option>
  //     <option value="environmental_feature_t1">Environmental Feature 1</option>
  //   </select>
  // </label>
  // <label> Colour type:
  //   <select id="colour-scheme-select">
  //     <option selected value="sequential">Sequential</option>
  //     <option value="diverging">Diverging</option>
  //   </select>
  // </label>`;
  return plotContainer;
};
leafletGraphControl.addTo(map);

function initializeOtuSelect() {
  let taxonSelect = $("#select-taxonomic").select2({
    placeholder: "Type to filter by classification and metadata",
    multiple: true,
    allowClear: true,
    width: "100%",
    minimumInputLength: 1,
    // cache: true,
    tags: true,
    ajax: {
      // url: API_URLS.local_filter_options,
      // url: API_URLS.filter_suggestions,
      url: API_URLS.otuSuggestions,
      delay: 250,
      data: function(params) {
        // iteratively rebuild the suggestions?
        console.log("requesting more search suggestions");
        let query = {
          q: params.term,
          page: params.page || 1,
          page_size: params.page_size || 50
        };
        return query;
      },
      processResults: function(response, params) {
        // don't really know why this params page thing is necessary but it is.
        console.log("updating selection options from request.");
        params.page = params.page || 1;
        params.page_size = params.page_size || 50;
        let data = response.data;
        let total_results = data.total_results;
        let index = 0;
        if (window.otuLookup == null || window.otuLookup === undefined) {
          window.otuLookup = {};
        }
        let taxonOptions = data.taxonomy_options.map(taxon => {
          // return structure = { pk, otu code, otu pk }
          let option = {
            id: taxon[1],
            text: taxon[0],
            group: "taxon"
          };
          index++;
          window.otuLookup[taxon[2]] = taxon[0];
          // window.otuLookup[taxon[2]] = taxon[1];
          return option;
        });

        // making window lookup, not necessary until later really.
        // dont need to look up a primary key if you already have it.
        // var taxonLookup = window.otuLookup;
        // console.log(taxonLookup);
        // console.log(taxonOptions[0]);
        let moreResults = params.page * params.page_size < total_results;
        let groupedOptions = {
          results: [
            {
              text: "Custom",
              children: window.taxonTags
            },
            {
              text: "Taxonomic",
              children: taxonOptions
            }
          ],
          pagination: {
            more: moreResults
          }
        };
        return groupedOptions;
        // console.log(params.page * params.page_size);
        // console.log(total_results);
      }
    },
    createTag: function(params) {
      let term = $.trim(params.term);
      if (term === "") {
        return null;
      }
      let newTag = {
        id: term,
        text: term,
        newTag: true // add additional parameters
      };
      // TODO: just re-add the local tags to the returns options everytime.
      // TODO: Alternatively, clear the local taxon and meta tags everytime.
      // window.taxonTags.push(newTag);
      // console.log(window.local_tags);
      return newTag;
    }
  });
  taxonSelect.change(function() {
    fetchSampleOtus();
  });
  return taxonSelect;
}

function initializeSelectContextual(json) {
  let data = json.data.context_options.map(field => {
    return {
      id: field,
      text: field
    };
  });
  $("#select-contextual").select2({
    placeholder: "Search by sample contextual metadata",
    multiple: true,
    allowClear: true,
    width: "100%",
    // cache: true,
    tags: true,
    data: data,
    tokenSeparators: [",", " "],
    createTag: function(params) {
      let term = $.trim(params.term);
      if (term === "") {
        return null;
      }
      let newTag = {
        id: term,
        text: term,
        newTag: true // add additional parameters
      };
      // TODO: just re-add the local tags to the returns options everytime.
      // TODO: Alternatively, clear the local taxon and meta tags everytime.
      window.contextTags.push(newTag);
      // console.log(window.local_tags);
      return newTag;
    }
    // insertTag: function(data, tag) {
    //    wanting to place custom tags at the end.
    //    data.push(tag);
    // }
  });
  $("#select-contextual").change(function() {
    fetchSampleOtus();
  });
}

const initAmpliconSearch = () => {
  $("#select-amplicon").select2({
    placeholder: "Select amplicon",
    multiple: true,
    allowClear: true,
    width: "100%",
    // cache: true,
    tags: true,
    data: [
      {
        text: "Any",
        id: "Any"
      },
      {
        text: "16S",
        id: "16S"
      },
      {
        text: "18S",
        id: "18S"
      },
      {
        text: "26S",
        id: "26S"
      },
      {
        text: "COI",
        id: "COI"
      },
      {
        text: "ITS",
        id: "ITS"
      }
    ]
  });
  $("#select-amplicon").change(function() {
    fetchSampleOtus();
  });
};

initAmpliconSearch();

function initializeEndemicRadio() {
  let radio = document.getElementById("endemic-checkbox");
  radio.onchange = function() {
    fetchSampleOtus();
  };
}

function initializeOperatorSelect() {
  let selectOperator = document.getElementById("select-operator");
  selectOperator.onchange = function() {
    fetchSampleOtus();
  };
}

function initializeSearchButton() {
  let submitButton = document.getElementById("search-button");
  submitButton.onclick = function() {
    fetchSampleOtus();
  };
}

/**
 * Toggles the datapoint visualization visibility.
 */
const initializeGraphButton = () => {
  document.getElementById("graph-button").onclick = function() {
    $("#chart").toggle("slow");
  };
};

const initializeGraphColourMetricSelect = () => {
  let metaSelect = document.getElementById("meta-select");
  metaSelect.onchange = function() {
    updatePlotCircleColours();
  };
};

const initializeGraphColourSchemeSelect = () => {
  let colourSchemeSelect = document.getElementById("colour-scheme-select");
  colourSchemeSelect.onchange = function() {
    updatePlotCircleColours();
  };
};

//Adding d3 visualization
export const { g, y, tooltip, x } = initPlotChart();

// Adding functions to elements -----------------------------------------
window.onload = () => {
  initializeOperatorSelect();
  initializeOtuSelect();
  initializeEndemicRadio();
  initializeSearchButton();

  initializeGraphButton();
  initializeGraphColourMetricSelect();
  initializeGraphColourSchemeSelect();

  initializeDisplayOptionsControls();
  initializeDisplayControlButton();
};

// NOTE: load contextual options up front. Hardcoding some params.
// possibly separate into a different API later on if we have time or a need.
let url = API_URLS.otuSuggestions + "q=&page=1&page_size=200";
fetch(url).then(response => {
  response.json().then(initializeSelectContextual);
});

// TODO: fix layer rendering only workng when contextual filter has conditions. Something to do with the backend not returning results when no contextual present.
// TODO: standardise abundance values from 0-1 or something like that.
