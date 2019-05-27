import * as _ from "lodash";
import * as L from "leaflet";
import * as d3 from "d3";
import * as $ from "jquery";
import "../js/leaflet.heat";
import "../js/leaflet-slider";
import "leaflet-sidebar-v2";
import select2 from "../js/select2.min.js";
import "../js/L.Control.Range";
import { updateGraph, initPlotChart, updatePlotCircleColours } from "./plot";
import { API_URLS } from "./constants";
import { renderHeatLayer, featureCollectionToLayer } from "./map";
import {
  initAllTaxonomicSelects,
  initOtuSelect,
  initCombinationSelect,
  initContextSelect,
  initContextFieldSelect
} from "./selects";
import {
  aggregateSampleOtusBySite,
  aggregateSamplesByCell
} from "./aggregation";

window.circles = [];
window.contextTags = [];
window.siteAggregates = {};
window.otuLookup = {};
window.sampleContextLookup = {};

/**
 * generates the request URL and calls recalculating data functions when data is received.
 */
export function createAggregateUrl() {
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

  // test
  if (document.getElementById("rarity-checkbox").checked) {
    url += "&endemic=true";
  } else {
  }
  if (document.getElementById("select-operator").value == "or") {
    url += "&operator=union";
  } else {
    url += "&operator=intersection";
  }
  console.log("request url: " + url);
  requestSampleOtus(url);
}

/**
 * Gets sampleOtu data and triggers for recalculations on response
 */
const requestSampleOtus = url => {
  // fetch the url
  showLoadingMessage();
  fetch(url).then(response => {
    response.json().then(responseData => {
      hideLoadingMessage();
      calculateSampleOtuData(responseData);
    });
  });
};

/**
 * recalculates where data fits on the grid structure without fetching new data from the server.
 */
function recalculateGridLayer() {
  if (window.previousResults) {
    calculateSampleOtuData(window.previousResults);
  } else {
    // $("#select-taxonomic").trigger("change");
    createAggregateUrl();
  }
}

/**
 * Updates the lookup containing all the data of otus accquired so far.
 * @param {array} otus
 */
function updateOtuLookupPathogenicStatus(otus) {
  console.log("updating pathogenic status");
  // console.log(otus);
  otus.forEach(otuId => {
    if (!(otuId in window.otuLookup)) {
      window.otuLookup[otuId] = {
        pathogenic: true
      };
    } else {
      window.otuLookup[otuId].pathogenic = true;
    }
  });
  // console.log(window.otuLookup);
}

/**
 * takes combined sampleOtu data and sampleContextual data and calculates their positions and generates layers.
 */
function calculateSampleOtuData(responseData) {
  window.previousResults = responseData;
  let sampleOtus = responseData.sample_otu_data;
  let sampleContexts = responseData.sample_contextual_data;
  updateOtuLookupPathogenicStatus(responseData.pathogenic_otus);
  // display amount of abundances from a search below the filter
  $("#numberResults").text(sampleOtus.length);
  // restructure the sample contexts by pk
  for (let i in sampleContexts) {
    let sampleContext = sampleContexts[i];
    window.sampleContextLookup[sampleContext.id] = sampleContext;
  }
  let siteAggregatedData = aggregateSampleOtusBySite(sampleOtus);
  renderHeatLayer(siteAggregatedData, heatLayerGroup, map);
  let cellAggregatedData = aggregateSamplesByCell(
    siteAggregatedData,
    sampleContexts
  );
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

  let siteLayer = featureCollectionToLayer(
    featureCollection,
    "weightedSites",
    gridSitesLayerGroup
  );
  addLayerIdToSampleContext(siteLayer);

  siteAggregatedData = calculateSiteMetrics(siteAggregatedData);
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

function showLoadingMessage() {
  let loadingBanner = document.getElementById("loading-popup");
  // loadingBanner.classList = "map-popup--visible";
  loadingBanner.classList.remove("map-popup--hidden");
  loadingBanner.classList.add("map-popup--visible");
}

function hideLoadingMessage() {
  let loadingBanner = document.getElementById("loading-popup");
  loadingBanner.classList.remove("map-popup--visible");
  loadingBanner.classList.add("map-popup--hidden");
}

/**
 * Adds additional metrics to site aggregated data.
 */
function calculateSiteMetrics(siteAggregates) {
  // entries released in es6.
  for (const [siteId, site] of Object.entries(siteAggregates)) {
    site.shannonDiversity = 0;
    site.pathogenicRichness = 0;
    site.pathogenicAbundance = 0;
    for (const [otuId, otu] of Object.entries(site.otus)) {
      let otuAbundance = otu.abundance;
      site.shannonDiversity +=
        (otuAbundance / site.abundance) *
        Math.log(otuAbundance / site.abundance);

      if (!(otuId in window.otuLookup)) {
        window.otuLookup[otuId] = {
          pathogenic: false
        };
      }

      if (window.otuLookup[otuId].pathogenic) {
        site.pathogenicRichness++;
        site.pathogenicAbundance += otuAbundance;
      }
    }
    // final calculations for effective alpha and shannon diversity
    site.shannonDiversity *= -1;
    site.effectiveAlpha = Math.exp(site.shannonDiversity);

    // final calculations for proportioning site potential pathogen proportion
    site.pathogenicRichness /= site.richness;
    site.pathogenicAbundance /= site.abundance;
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

const map = initMap();
function initMap() {
  let map = L.map("map", {
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
  return map;
}

//gets the params from the search bar
var taxonParams = new URLSearchParams(window.location.search);
var mode = taxonParams.get("mode");

let detailLevel = 60;
//warrick map additions

//shows the scale of the map
var scaleIndicator = L.control.scale().addTo(map);

var sidebar = L.control
  .sidebar({ container: "sidebar", autopan: true })
  .addTo(map)
  .open("home");

//instantiating empty layer control layers to be filled later
var gridRichnessLayerGroup = L.layerGroup();
var gridAbundanceLayerGroup = L.layerGroup();
var gridSitesLayerGroup = L.layerGroup();
var heatLayerGroup = L.layerGroup();
map.addLayer(heatLayerGroup);

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
function GetLayerBySampleContextId(id) {
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
    { value: "environmental_feature_t2", text: "Environmental Feature Tier 2" }
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

  return plotContainer;
};
leafletGraphControl.addTo(map);

/**
 * Sets up the amplicon filter
 */
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
    createAggregateUrl();
  });
};

function initRarityCheckbox() {
  let radio = document.getElementById("rarity-checkbox");
  radio.onchange = function() {
    createAggregateUrl();
  };
}

function initOperatorSelect() {
  let selectOperator = document.getElementById("select-operator");
  selectOperator.onchange = function() {
    createAggregateUrl();
  };
}

function initSearchButton() {
  let submitButton = document.getElementById("search-button");
  submitButton.onclick = function() {
    createAggregateUrl();
  };
}

/**
 * Toggles the datapoint visualization visibility.
 */
const initTogglePlotButton = () => {
  document.getElementById("graph-button").onclick = function() {
    $("#chart").toggle("slow");
  };
};

const initPlotColourMetricSelect = () => {
  let metaSelect = document.getElementById("meta-select");
  metaSelect.onchange = function() {
    updatePlotCircleColours();
  };
};

const initPlotColourSchemeSelect = () => {
  let colourSchemeSelect = document.getElementById("colour-scheme-select");
  colourSchemeSelect.onchange = function() {
    updatePlotCircleColours();
  };
};

const initClearOtusButton = () => {
  let clearBtn = document.getElementById("selectClearAll");
  console.log(clearBtn);
  clearBtn.onclick = () => {
    console.log("clear all clicked");
    let taxonSelects = document
      .getElementById("search2")
      .getElementsByClassName("taxonomic-select");

    for (let item of taxonSelects) {
      $("#" + item.id)
        .val(null)
        .trigger("change");
    }
  };
};

/**
 * Get the states of the taxonomic selects, concatenate into one term. Add the new entry to the combination select2, select that new entry.
 */
const initSubmitOtuButton = () => {
  let addBtn = document.getElementById("addOtuBtn");
  console.log(addBtn);
  addBtn.onclick = () => {
    console.log("add clicked");
    let segmentSelectors = document.getElementsByClassName("taxonomic-select");

    let taxonSegments = [];
    let taxonIds = [];
    for (let item of segmentSelectors) {
      console.log(item);
      let select = $("#" + item.id);
      if (!select.val()) {
        continue;
      }
      // console.log(select.val());
      // console.log(select.text());
      console.log(select.text());
      console.log(select.val());

      taxonSegments.push(select.text());
      taxonIds.push(parseInt(select.val()));
    }

    console.log(taxonSegments);
    console.log(taxonIds);

    // join fk combination array using commas
    let otuName = taxonSegments.join(";");
    let fkCombination = "otu=" + taxonIds.join("+");

    // Set the value, creating a new option if necessary
    if (
      $("#combinationSelect").find("option[value='" + fkCombination + "']")
        .length
    ) {
      $("#combinationSelect")
        .val(fkCombination)
        .trigger("change");
    } else {
      // Create a DOM Option and pre-select by default
      console.log("creating new option");
      var newOption = new Option(otuName, fkCombination, true, true);
      // Append it to the select
      $("#combinationSelect")
        .append(newOption)
        .trigger("change");
    }

    // check if joined fk in combination select options

    // if not, add it and select it

    // else, select it
  };
};

const initSubmitContextButton = () => {
  let submitContextBtn = document.getElementById("add-context-btn");

  submitContextBtn.onclick = () => {
    let contextInput = document.getElementById("context-values-select");
    if (contextInput.value) {
      let contextFieldSelect = document.getElementById("context-field-select");
      let contextOperatorSelect = document.getElementById(
        "context-operator-select"
      );

      let contextFilterText =
        contextFieldSelect.value +
        contextOperatorSelect.value +
        contextInput.value;

      let contextFilterId =
        "q=" +
        contextFieldSelect.value +
        "$" +
        contextOperatorSelect.value +
        contextInput.value;

      // Set the value, creating a new option if necessary
      if (
        $("#combinationSelect").find("option[value='" + contextFilterId + "']")
          .length
      ) {
        alert("Filter is already in the filter list");
      } else {
        console.log("creating new option");
        var newOption = new Option(
          contextFilterText,
          contextFilterId,
          true,
          true
        );
        // Append it to the select
        $("#combinationSelect")
          .append(newOption)
          .trigger("change");
      }
      // WIP: get the values and concatenate then add them to the main query constructor. Could either group them or do something like that
    } else {
      console.log("empty input field");
      alert("Nothing entered in the input field");
    }
  };
};

const initContextValuesSelect = () => {
  let contextValueSelect = $("#context-values-select").select2({
    placeholder: "testing 1234",
    allowClear: true,
    width: "100%"
  });
};

const initSubmitSearch2Button = () => {
  let submitSearchButton = document.getElementById("submit-search");
  submitSearchButton.onclick = () => {
    let combinedFilters = $("#combinationSelect").select2("data");
    let params = combinedFilters.map(filter => {
      return filter.id;
    });
    console.log(params);
    console.log(params.join("&"));
    let slug = params.join("&");
    let url = API_URLS.sampleOtus + slug;
    // console.log(url);
    requestSampleOtus(url);
  };
};

//Adding d3 visualization
export const { g, y, tooltip, x } = initPlotChart();

// Adding functions to elements -----------------------------------------
window.onload = () => {
  initOperatorSelect();
  initOtuSelect();
  initAmpliconSearch();
  initRarityCheckbox();
  initSearchButton();

  initTogglePlotButton();
  initPlotColourMetricSelect();
  initPlotColourSchemeSelect();

  initializeDisplayOptionsControls();
  initializeDisplayControlButton();

  initAllTaxonomicSelects();
  initCombinationSelect();
  initClearOtusButton();
  initSubmitOtuButton();

  initSubmitContextButton();
  initContextValuesSelect();

  initSubmitSearch2Button();
};

// NOTE: load contextual options up front. Hardcoding some params.
// possibly separate into a different API later on if we have time or a need.
let url = API_URLS.otuSuggestions + "q=&page=1&page_size=200";
fetch(url).then(response => {
  // response.json().then(initContextSelect);
  response.json().then(jsonData => {
    initContextSelect(jsonData);
    initContextFieldSelect(jsonData);
  });
});
// TODO: fix layer rendering only workng when contextual filter has conditions. Something to do with the backend not returning results when no contextual present.

export { detailLevel, map, GetLayerBySampleContextId };
