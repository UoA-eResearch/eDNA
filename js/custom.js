const local_base_url = "http://localhost:8000/edna/api/";
const nectar_base_url = "https://edna.nectar.auckland.ac.nz/edna/api/";
// change active depending on the situation.
const active_base_url = local_base_url;
const API_URLS = {
  filtered_abundance: nectar_base_url + "abundance?otu=",
  filtered_meta: nectar_base_url + "metadata?term=",
  ordered_sampleotu: nectar_base_url + "sample_otu_ordered",
  test_sample_otu_pk: local_base_url + "abundance?otu=",
  test_nested_abundances: local_base_url + "abundance?id=",
  local_metadata_id: local_base_url + "metadata?id=",
  local_filter_options: local_base_url + "filter-options?"
};

function round(x, dp) {
  var factor = Math.pow(10, dp);
  var tmp = x * factor;
  tmp = Math.round(tmp);
  return tmp / factor;
}

/**
 * Simple helper to wrap contents in strong tags followed by a line break.
 * @param {content} s
 */
const strongLine = s => {
  return "<strong>" + s + "</strong>" + "<br />";
};

/**
 * Helper function to make a strong field label with a value.
 * @param {header} h
 * @param {value} s
 */
const strongHeader = (h, s) => {
  return "<strong>" + h + ": </strong> " + s + "<br />";
};

function checkFragment(f, species, site) {
  let ampIndex = f.indexOf("&");
  let ltIndex = f.indexOf("<");
  let gtIndex = f.indexOf(">");
  let eqIndex = f.indexOf("=");
  //Splits if ampersand or greater than found, recursively calls the split string.
  // When no &'s left return filters results
  if (ampIndex > 0) {
    var left = f.substring(0, ampIndex).trim();
    var right = f.substring(ampIndex + 1).trim();
    return (
      checkFragment(left, species, site) && checkFragment(right, species, site)
    );
  } else if (ltIndex > 0) {
    var left = f.substring(0, ltIndex).trim();
    var right = f.substring(ltIndex + 1).trim();
    if (site[left] < right) {
      return true;
    }
  } else if (gtIndex > 0) {
    var left = f.substring(0, gtIndex).trim();
    var right = f.substring(gtIndex + 1).trim();
    if (site[left] > right) {
      return true;
    }
  } else if (eqIndex > 0) {
    var left = f.substring(0, eqIndex).trim();
    var right = f.substring(eqIndex + 1).trim();
    if (site[left] == right) {
      return true;
    }
  } else {
    return species.startsWith(f);
  }
  return false;
}

var siteAggregates;
//Called by handeResults
function getSiteWeights(filters) {
  var sites = {};
  let n_points = 0;
  //warrick Clears grid layer values, gives them an index.
  var grid = makeGrid(detailLevel);
  gridCellLookup = makeGridLookup(grid);
  //console.log(grid);
  //Site metrics: Adding dictionary of site metrics for calculations.
  siteAggregates = {};
  //loop through parsed global result data.
  for (var i in window.results.data) {
    let taxon_row = window.results.data[i];
    let taxon_name = taxon_row[""];
    for (let taxon_column in taxon_row) {
      if (taxon_column != "") {
        // site contains the full meta row for a site.
        var site = window.meta[taxon_column];
        //declare bool defaulting to false
        var match = false;
        //if empty filter then match for all sites.
        if (filters.length == 0) match = true;
        //loops through the filters from the <select> dropdown html element.
        for (var j in filters) {
          //loops through filters. Separated by ampersand etc.
          var f = filters[j].id;
          //searches the filter using the delimiters '&&' '>' '<'
          //returns a bool. Takes in the parameters f=dropdown options, species=the species name
          // and the site from the metadata.
          match = checkFragment(f, taxon_name, site);
          // console.log(match);
          if (match) break;
        }
        //has a bacteria reading over 0 then:
        if (match && taxon_row[taxon_column] > 0) {
          //if site currently contains no values/(maybe a value that isn't 1?) then give it a value of 0
          if (!sites[taxon_column]) {
            sites[taxon_column] = 0;
          }
          // Add sample-otu value to sites dictionary
          sites[taxon_column] += taxon_row[taxon_column];
          //add values to siteAggregates {} dictionary for visualization.
          if (siteAggregates[taxon_column] == null) {
            createSiteMetric();
          }
          addValuesToSiteMetric();
          // Adds the values into the grid object used to create the leaflet features/squares.
          const cellIndex = gridCellLookup[taxon_column];
          const gridCell = grid.cells[cellIndex];
          addValuesToGridCell(gridCell);
          // increment the n_points which is displayed below search filter
          n_points++;
        }
      }
    }
  }
  $("#numberResults").text(n_points);
  // console.log(grid);
  // console.log(sites);
  // console.log(siteAggregates);
  drawGrid(grid);
  return sites;

  function addValuesToGridCell(cell) {
    cell.richness++;
    cell.abundance += taxon_row[taxon_column];
    if (cell.cellSpecies[taxon_name] == null) {
      createGridCellSpecies();
    } else {
      addValueToGridCellSpecies();
    }
    if (!cell.cellSites.includes(taxon_column)) {
      cell.cellSites.push(taxon_column);
    }

    function addValueToGridCellSpecies() {
      cell.cellSpecies[taxon_name].count++;
      cell.cellSpecies[taxon_name].value += taxon_row[taxon_column];
    }

    function createGridCellSpecies() {
      cell.cellSpecies[taxon_name] = {
        count: 1,
        value: taxon_row[taxon_column]
      };
    }
  }

  function addValuesToSiteMetric() {
    siteAggregates[taxon_column].abundance += taxon_row[taxon_column];
    siteAggregates[taxon_column].richness++;
    // Adding key, value for species assuming there's only one entry for a species in the data.
    siteAggregates[taxon_column].species[taxon_name] = taxon_row[taxon_column];
  }

  function createSiteMetric() {
    siteAggregates[taxon_column] = site;
    siteAggregates[taxon_column].abundance = 0;
    siteAggregates[taxon_column].richness = 0;
    siteAggregates[taxon_column].species = {};
  }
}

/**
 * Called by handleresults. Populates search bar dropdown.
 */
function getFilterData() {
  var data = {};
  for (var i in window.results.data) {
    //e = a line in the results data.
    var e = window.results.data[i];
    //e[""] = the species name.
    var species = e[""];
    var n_sites = 0;
    //loops through every site for the organism 'e'.
    // If a site contains a value > 0 then increment count.
    for (var k in e) {
      if (e[k] > 0) {
        n_sites++;
      }
    }
    //if bacteria has no counts for any sites then continue to next organism
    if (!n_sites) continue;
    var j = 0;
    while (j != -1) {
      //Checks if bacteria has semicolons. i.e subspecies.
      //Repeats this check until no ';' present.
      j = species.indexOf(";", j + 1);
      if (j == -1) {
        //if no semicolon then subS is the only species.
        var subS = species;
      } else {
        //else subspecies is
        var subS = species.substring(0, j);
      }
      //if data doesn't contain the subspecies then set the value to 0
      //then set the value of the subspecies dictionary entry to n_sites.
      // n_sites = the value of all the sites the bacteria occurred in.
      if (!data[subS]) data[subS] = 0;
      data[subS] += n_sites;
    }
  }

  var options = [];
  var metaStats = {};
  //loop through sites within the metadata (parsed) again.
  for (var site in window.meta) {
    //loops through every aspect measured from the site. (e.g. low_alt, high_alt, Gravel & rock)
    for (var measure in window.meta[site]) {
      //for each aspect's measurement store it temporarily in 'val'
      var val = window.meta[site][measure];
      if (!metaStats[measure]) {
        //if state doesn't already exist in the metastats dictionary add it.
        //If it exists then the following values are added to it.
        metaStats[measure] = { min: Infinity, max: -Infinity, sum: 0, n: 0 };
      }
      //if the aspects value is anything valid (within -infin - infin) then assign the value.
      if (val < metaStats[measure].min) {
        metaStats[measure].min = val;
      }
      if (val > metaStats[measure].max) {
        metaStats[measure].max = val;
      }
      metaStats[measure].n++;
      metaStats[measure].sum += val;
    }
  }
  //loop through the url params
  for (var i in hashComponents) {
    var k = hashComponents[i];
    //add the url params to the options 2d array. with the id: param and text: param.
    options.push({ id: k, text: k });
  }
  // console.log(data);
  for (var k in data) {
    options.push({ id: k, text: k, title: "Number of points: " + data[k] });
  }
  for (var k in metaStats) {
    var mean = round(metaStats[k].sum / metaStats[k].n, 2);
    options.push({
      id: k,
      text: k,
      title:
        "Range: " +
        round(metaStats[k].min, 2) +
        " - " +
        round(metaStats[k].max, 2) +
        ". Mean: " +
        mean
    });
  }
  return options;
}

/**
 * Use filter params to request abundance api and handle response.
 */
function fetchSampleOtus(taxonParams, contextParams) {
  // Formatting and adding otu arguments
  let ontologyIds = [];
  for (let i in taxonParams) {
    let taxonIdChain = taxonParams[i];
    let idChain = taxonIdChain.id.split(",").join("+");
    ontologyIds.push(idChain);
  }
  let url = API_URLS.test_sample_otu_pk;
  url += ontologyIds.join("&otu=");

  // Formatting and adding contextual filters to url
  if (contextParams.length > 0) {
    let s = contextParams
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
  console.log(url);

  // fetch the url
  fetch(url).then(response => {
    response.json().then(responseData => {
      handleResponseData(responseData);
    });
  });
}

function handleResponseData(responseData) {
  let sampleOtus = responseData.sample_otu_data;
  let sampleContexts = responseData.sample_contextual_data;
  // display amount of abundances from a search below the filter
  $("#numberResults").text(sampleOtus.length);
  // restructure the sample contexts by pk
  window.sampleContextLookup = {};
  for (let i in sampleContexts) {
    let sampleContext = sampleContexts[i];
    window.sampleContextLookup[sampleContext.id] = sampleContext;
  }
  let siteAggregatedData = aggregateBySite(sampleOtus);
  let heatLayer = renderHeatLayer(siteAggregatedData);
  let cellAggregatedData = aggregateByCell(siteAggregatedData, sampleContexts);
  let featureCollection = makeFeatureCollection(cellAggregatedData);
  let abundanceLayer = featureCollectionToLayer(
    featureCollection,
    "weightedAbundance",
    gridAbundanceLayerGroup
  );
  let richnessLayer = featureCollectionToLayer(
    featureCollection,
    "weightedRichness",
    gridRichnessLayerGroup
  );
  // NOTE: disabling  site layer for quick comparison: rectangles are distorted.
  // renderFeatureCollection(
  //   featureCollection,
  //   "weightedSites",
  //   gridSitesLayerGroup
  // );
  siteAggregatedData = addSiteMetrics(siteAggregatedData);

  // creating site -> leaflet layer references for each layer.
  addLayerIdToSampleContext(abundanceLayer);
  addLayerIdToSampleContext(richnessLayer);

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
    siteAgg = siteAggs[siteId];
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

function renderHeatLayer(siteAggs) {
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

/**
 * Iterates the site aggregates and sums the values by grid cell coordinates. Returns a dictionary which keys indicate positional offsets.
 * @param {*} siteAggs
 * @param {*} sampleContexts
 */
function aggregateByCell(siteAggs) {
  // setting up grid parameters
  makeGrid(detailLevel);
  console.log("aggregate by cell");
  let start = [164.71222, -33.977509];
  let end = [178.858982, -49.66352];
  const hardBounds = L.latLngBounds(start, end);
  const northWest = hardBounds.getNorthWest();
  const northEast = hardBounds.getNorthEast();
  const southWest = hardBounds.getSouthWest();
  const latOffset = (northWest.lat - southWest.lat) / detailLevel;
  const lngOffset = (northEast.lng - northWest.lng) / detailLevel;
  // using the params for generating the keys
  let cellAggs = {};
  for (let siteId in siteAggs) {
    let site = siteAggs[siteId];
    let sampleContext = window.sampleContextLookup[siteId];
    let x = sampleContext.x;
    let y = sampleContext.y;
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
    const popupContent = makePopupContent(cell);
    featureCollection.features.push({
      type: "Feature",
      properties: {
        id: key,
        weightedAbundance,
        weightedRichness,
        weightedSites,
        sites: cell.sites,
        popupContent
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

  function makePopupContent(cell) {
    let popupContent =
      strongHeader("Cell Richness", cell.richness) +
      strongHeader("Cell Abundance", cell.abundance) +
      strongHeader("Cell Site Count", cell.siteCount) +
      strongHeader(
        "Longitude",
        cell.coordinates[0][0] + " to " + cell.coordinates[2][0]
      ) +
      strongHeader(
        "Latitude",
        cell.coordinates[0][1] + " to " + cell.coordinates[2][1]
      ) +
      "<br />";
    //list all sites within the cell.
    popupContent += strongLine("Sites in cell: ") + "<ul>";
    for (let i in cell.sites) {
      siteId = cell.sites[i];
      popupContent +=
        "<li>" + window.sampleContextLookup[siteId].site + "</li>";
    }
    popupContent += "</ul><br />";
    for (let otuId in cell.otus) {
      if (window.otuLookup[otuId] === undefined) {
        console.log("couldn't find otu name using otu id.");
      }
      popupContent +=
        strongLine(window.otuLookup[otuId]) +
        strongHeader("Abundance in cell", cell.otus[otuId].abundance) +
        strongHeader("Frequency in cell", cell.otus[otuId].count) +
        "<br />";
    }
    return popupContent;
  }
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
    if (feature.properties && feature.properties.popupContent) {
      var popup = layer.bindPopup(feature.properties.popupContent, {
        maxWidth: 4000,
        maxHeight: 150
      });
    }
    layer.on({
      mouseover: handleMouseOver,
      mouseout: handleMouseOut,
      click: handleCellClick,
      select: highlightLayer
    });

    /**
     * Function called when layer is selected.
     * @param {*} e
     */
    function handleCellClick(e) {
      var layer = e.target;
      var layerProps = layer.feature.properties.speciesInCell;
    }

    function handleMouseOver(e) {
      let layer = e.target;
      layer.feature.properties.sites.forEach(siteId => {
        // needs to use sitecode as you cannot select in css using a number "#123"
        let siteCode = window.sampleContextLookup[siteId].site;
        let circle = d3.selectAll("#" + siteCode);
        circle
          .transition()
          .duration(250)
          .attr("r", 14);
      });
    }

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

    function highlightLayer(layer) {
      layer.setStyle({
        weight: 5,
        opacity: 0.9
      });
      if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
      }
    }
  }
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
  northWest = hardBounds.getNorthWest();
  northEast = hardBounds.getNorthEast();
  southWest = hardBounds.getSouthWest();
  southEast = hardBounds.getSouthEast();
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
 * Creates the grid lookup object/dictionary used for filling in the grid and calculating it's position.
 * @param {*} grid
 */
function makeGridLookup(grid) {
  let gridLookup = {};
  const gridStart = grid.start;
  const lngOffset = grid.lngOffset;
  const latOffset = grid.latOffset;
  const detailLevel = grid.detailLevel;

  for (let siteName in window.meta) {
    const site = window.meta[siteName];
    if (gridLookup[siteName] == null) {
      // siteLat/Lng so it can be in scope for the subfunction.
      var siteLng = site.x;
      var siteLat = site.y;
      let gridCellIndex = calculateGridIndexFromCoordinates();
      gridLookup[siteName] = gridCellIndex;
      // Sets hasSamples to true from default false as a site is a sample.
      // Also reduces processing uneccessary polygons
      grid.cells[gridCellIndex].hasSamples = true;
      if (!siteName in grid.cells[gridCellIndex].cellSites) {
        grid.cells[gridCellIndex].cellSites.push(siteName);
      }
    }
  }
  return gridLookup;

  /**
   * Assumes coordinate system is WGS84. Uses rounding to find the index.
   */
  function calculateGridIndexFromCoordinates() {
    let lngDiff = Math.abs(siteLng) - Math.abs(gridStart[0]);
    let colIndex = Math.floor(lngDiff / lngOffset);
    let latDiff = Math.abs(siteLat) - Math.abs(gridStart[1]);
    let rowIndex = Math.floor(latDiff / latOffset);
    let gridCellIndex = rowIndex * detailLevel + colIndex;
    return gridCellIndex;
  }
}

/**
 * @param {*} grid
 */
function drawGrid(grid) {
  //TODO: refactor this
  const cells = grid.cells;
  const gridMaxes = CalculateGridMaxes(cells);
  const maxRichness = gridMaxes.richness;
  const maxAbundance = gridMaxes.abundance;
  const maxSiteCount = gridMaxes.siteCount;
  let features = [];
  let cellId = 0;
  for (let index in cells) {
    const cell = cells[index];
    //if grid doesn't contain any sites then don't add to map.
    if (!cell.hasSamples) {
      continue;
    }
    const weightedRichness = cell.richness / maxRichness;
    const weightedAbundance = cell.abundance / maxAbundance;
    const weightedSites = cell.cellSites.length / maxSiteCount;
    //Add cell statistics within popup.
    //Cell coordinates
    let popupContent =
      strongHeader("Cell id", cellId) +
      strongHeader("Cell Richness", cell.richness) +
      strongHeader("Cell Abundance", cell.abundance) +
      strongHeader("Cell Site Count", cell.cellSites.length) +
      strongHeader(
        "Longitude",
        cell.coordinates[0][0] + " to " + cell.coordinates[2][0]
      ) +
      strongHeader(
        "Latitude",
        cell.coordinates[0][1] + " to " + cell.coordinates[2][1]
      ) +
      "<br />";
    cellId++;
    //list all sites within the cell.
    popupContent += strongLine("Sites in cell: ") + "<ul>";
    for (let site in cell.cellSites) {
      popupContent += "<li>" + cell.cellSites[site] + "</li>";
    }
    popupContent += "</ul><br />";
    let speciesInCell = cell.cellSpecies;
    console.log(speciesInCell);
    //lists all the species within a cell.
    popupContent += strongLine("Search results in cell: ") + " <br />";
    for (let species in speciesInCell) {
      popupContent +=
        strongLine(species) +
        strongHeader("Frequency in cell", speciesInCell[species].count) +
        strongHeader("Abundance in cell", speciesInCell[species].value) +
        "<br />";
    }
    const cellPolygon = {
      type: "Feature",
      properties: {
        index,
        weightedAbundance,
        weightedRichness,
        speciesInCell,
        weightedSites,
        cellSites: cell.cellSites,
        hasSamples: cell.hasSamples,
        popupContent: popupContent
      },
      geometry: {
        type: "Polygon",
        coordinates: [cell.coordinates]
      }
    };
    features.push(cellPolygon);
  }
  let featureCollection = {
    type: "FeatureCollection",
    features: features
  };
  //Clear count layer and add new one to layergroup.
  const gridRichnessLayer = L.geoJSON(featureCollection, {
    style: CellCountStyle,
    onEachFeature: onEachFeature
  });
  gridRichnessLayerGroup.clearLayers();
  gridRichnessLayerGroup.addLayer(gridRichnessLayer);

  //Clear count layer, add new one to layergroup.
  const gridAbundanceLayer = L.geoJSON(featureCollection, {
    style: CellValueStyle,
    onEachFeature: onEachFeature
  });
  gridAbundanceLayerGroup.clearLayers();
  gridAbundanceLayerGroup.addLayer(gridAbundanceLayer);

  //Clear site count layer, add new one to layergroup.
  const gridSitesLayer = L.geoJSON(featureCollection, {
    style: CellSitesStyle,
    onEachFeature: onEachFeature
  });
  gridSitesLayerGroup.clearLayers();
  gridSitesLayerGroup.addLayer(gridSitesLayer);

  function CellSitesStyle(feature) {
    return {
      fillColor: GetFillColor(feature.properties.weightedSites),
      weight: 1,
      opacity: getOutlineOpacity(),
      color: GetOutlineColour(),
      fillOpacity: GetFillOpacity(
        feature.properties.weightedSites,
        feature.properties.hasSamples
      )
    };
  }

  /**
   * returns feature style based on feature properties value/abundance.
   * @param {*} feature
   */
  function CellValueStyle(feature) {
    return {
      fillColor: GetFillColor(feature.properties.weightedAbundance),
      weight: 1,
      opacity: getOutlineOpacity(),
      color: GetOutlineColour(),
      fillOpacity: GetFillOpacity(
        feature.properties.weightedAbundance,
        feature.properties.hasSamples
      )
    };
  }

  /**
   * returns feature style based on feature properties count/richness.
   * @param {*} feature
   */
  function CellCountStyle(feature) {
    return {
      fillColor: GetFillColor(feature.properties.weightedRichness),
      weight: 1,
      opacity: getOutlineOpacity(),
      color: GetOutlineColour(),
      fillOpacity: GetFillOpacity(
        feature.properties.weightedRichness,
        feature.properties.hasSamples
      )
    };
  }
}

/**
 * Performs this function on every feature selected.
 * @param {*} feature
 * @param {*} layer
 */
function onEachFeature(feature, layer) {
  if (feature.properties && feature.properties.popupContent) {
    var popup = layer.bindPopup(feature.properties.popupContent, {
      maxWidth: 4000,
      maxHeight: 150
    });
  }
  layer.on({
    mouseover: handleMouseOver,
    mouseout: handleMouseOut,
    click: handleCellClick,
    select: highlightLayer
  });
}

/**
 * Currently used for debugging. Logs cell layer metrics.
 * @param {*} e
 */
function handleCellClick(e) {
  var layer = e.target;
  console.log("layer index is " + layer.feature.properties.index);
  var speciesInCell = layer.feature.properties.speciesInCell;
  var speciesAmount = Object.keys(speciesInCell).length;
  console.log("Number of unique classifications in cell: " + speciesAmount);
}

/**
 * Highlights visualization datapoints contained within the cellSites property of the hovered feature.
 * @param {*} e mouse hover
 */
function handleMouseOver(e) {
  var layer = e.target;
  var siteList = layer.feature.properties.cellSites;
  for (site in siteList) {
    var circle = d3.selectAll("#" + siteList[site]);
    circle
      .transition()
      .duration(250)
      .attr("r", 14);
  }
}

/**
 * Reverts the datapoint style to default when mouse leaves the cell containing the datapoint.
 * @param {*} e
 */
function handleMouseOut(e) {
  var layer = e.target;
  //console.log(layer.feature.properties.cellSites);
  var siteList = layer.feature.properties.cellSites;
  for (site in siteList) {
    var circle = d3.selectAll("#" + siteList[site]);
    circle
      .transition()
      .duration(250)
      .attr("r", 7);
  }
}

/**
 * Provides aggregate calculation for richness and adds it to the gridCell data.
 * Calculates and returns the maximums for cell richness, abundance and shannon entropy within the grid.
 * @param {*} gridCells
 */
function CalculateGridMaxes(gridCells) {
  let richness = 0;
  let abundance = 0;
  let siteCount = 0;
  for (let i in gridCells) {
    const cell = gridCells[i];
    const cellRichness = Object.keys(cell.cellSpecies).length;
    cell.richness = cellRichness;
    if (cell.richness > richness) {
      richness = cellRichness;
    }
    if (cell.abundance > abundance) {
      abundance = cell.abundance;
    }
    if (cell.cellSites.length > siteCount) {
      siteCount = cell.cellSites.length;
    }
  }
  //console.log("max count ", maxCount, "max value ", maxValue);
  var gridMaxes = {
    richness,
    abundance,
    siteCount
  };
  return gridMaxes;
}

/**
 * Returns value for outline opacity. Currently hardcoded to 0.15.
 * Currently used to centralize style changes across multiple layers.
 */
function getOutlineOpacity() {
  return 0.15;
}

/**
 * Returns value for outline color. Currently hardcoded to 0.15.
 * Currently used to centralize style changes across multiple layers.
 */
function GetOutlineColour() {
  return "#000000";
}

/**
 * Returns value for fill opacity based on if has Samples or not.
 * Currently used to centralize style changes across multiple layers.
 * @param {*, *} hasSamples
 */
function GetFillOpacity(d, hasSamples) {
  //Should always eval to true as polygons aren't created unless hasSamples = true
  if (hasSamples) {
    return d > 0.0 ? 0.8 : 0.2;
  } else {
    return 0;
  }
}

/**
 * Returns layer fill colour based on it's value within the range 0-1.
 * @param {*} d property value.
 */
function GetFillColor(d) {
  // ?: might be better to use leaflet chloropleth plugin for this
  return d > 0.9
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
                    : "#9ecae1";
}

/**
 * Function called when layer is clicked on
 * @param {*} layer
 */
function highlightFeatureClick(layer) {
  var layer = e.target;
  layer.setStyle({
    weight: 5,
    color: "#666",
    dashArray: "",
    fillOpacity: 0.7
  });
  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }
}

/**
 * Function to increase cell layer outline weight and opacity without
 * the need for mouseover/mouse click on the layer
 * @param {*} layer
 */
function highlightLayer(layer) {
  layer.setStyle({
    weight: 5,
    opacity: 0.9
  });
  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }
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
    opacity: getOutlineOpacity(properties.hasSamples)
  });
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

/**
 * Calculates queries max and minimum site metrics.
 * Returns colour range with spectrum from minimum value metric to max value metric.
 * @param {*} metric
 * @param {*} siteAggregates
 */
function createColorRange(siteAggregates) {
  // gets value from drop down and creates colour scale from the select option.
  const metric = document.getElementById("meta-select").value;
  const sites = [];
  for (var siteId in siteAggregates) {
    sites.push(window.sampleContextLookup[siteId]);
  }
  const min = d3.min(sites, function(d) {
    return d[metric];
  });
  const max = d3.max(sites, function(d) {
    return d[metric];
  });
  console.log("visualization plot min, max:", min, max);
  const colorScheme = document.getElementById("color-scheme-select").value;
  let colorRange = [];
  switch (colorScheme) {
    case "sequential":
      colorRange = ["blue", "orange"];
      break;
    case "diverging":
      colorRange = ["#2c7bb6", "#d7191c"];
      break;
    default:
      colorRange = ["grey", "black"];
  }
  const colourRange = d3
    .scaleLinear()
    .interpolate(d3.interpolateRgb)
    .domain([min, max])
    .range(colorRange);
  return colourRange;
}

/**
 * Returns a random amount between upper and lower. For jittering the plots.
 */
let randomRange = (upper, lower) => {
  return Math.random() * (upper - lower) + lower;
};

/**
 * Converts siteAggregates to an easier format for d3 use. Updates existing datapoints, enters new additional datapoints
 * @param {*} siteAggregates
 */
function updateGraph(siteAggregates) {
  // todo: see if I can make this into one class. Called in colorrange, select onchange function as well.
  var metricColour = createColorRange(siteAggregates);
  var colourMetric = document.getElementById("meta-select").value;

  function makeNestableObject(siteId, site, metricName, value) {
    return {
      siteId: siteId,
      Metric: metricName,
      value: value,
      meta: sampleContextLookup[siteId]
    };
  }

  var plotData = [];
  for (const [siteId, site] of Object.entries(siteAggregates)) {
    plotData.push(
      makeNestableObject(siteId, site, "OTU richness", site.richness)
    );
    plotData.push(
      makeNestableObject(siteId, site, "Shannon entropy", site.shannonDiversity)
    );
    plotData.push(
      makeNestableObject(siteId, site, "Sequence abundance", site.abundance)
    );
    plotData.push(
      makeNestableObject(
        siteId,
        site,
        "Effective alpha diversity",
        site.effectiveAlpha
      )
    );
  }

  console.log(plotData);

  var nestedPlotData = d3
    .nest()
    .key(function(d) {
      return d.Metric;
    })
    .entries(plotData);

  //within the svg, within the g tags, select the class datapoints
  var update = g.selectAll(".datapoints").data(nestedPlotData, function(d) {
    return d.values;
  });
  update
    .enter()
    .append("g")
    .attr("class", "datapoints")
    .merge(update)
    .each(function(d) {
      //loop through each data group
      const min = d3.min(d.values, function(d) {
        return d.value;
      });
      const max = d3.max(d.values, function(d) {
        return d.value;
      });
      const mean = d3.mean(d.values, function(d) {
        return d.value;
      });
      //console.log(min, max, mean);
      var circle = d3
        .select(this)
        .selectAll("circle")
        .data(d.values, function(d) {
          return d.siteId;
        });
      circle.exit().remove();
      //Enter statement
      circle
        .enter()
        .append("circle")
        .attr("class", "enter")
        .attr("id", d => d.meta.site)
        //.attr('cy', y(d.key))
        .attr("cy", function(circle) {
          // * If no jitter wanted then set jitter 0, 0.
          return y(circle.Metric) + randomRange(10, -10);
        })
        .attr("r", 7)
        .attr("opacity", 0.3)
        .attr("fill", function(d) {
          //TODO: Create a function to get the select dropdown values. For here and onchange.
          //console.log(d.meta[metric]);
          return metricColour(d.meta[colourMetric]);
        })
        .on("mouseover", function(d) {
          d3.select(this.parentNode.parentNode)
            .selectAll("#" + d.meta.site)
            .transition()
            .attr("r", 14)
            .duration(250);
          tooltip
            .transition()
            .style("opacity", 0.9)
            .duration(250);
          tooltip
            .html(
              strongLine(d.meta.site) +
                strongHeader(d.Metric, d.value) +
                strongHeader(
                  document.getElementById("meta-select").value,
                  // d.meta[document.getElementById("meta-select").value]
                  d.meta["elev"]
                )
            )
            .style("left", d3.event.pageX + "px")
            .style("top", d3.event.pageY - 10 + "px")
            .style("opacity", 0.9)
            .style("z-index", 1000);
          let layer = GetLayerBySampleContextId(d.siteId);
          if (layer != null && layer !== undefined) {
            highlightLayer(layer);
          }
        })
        .on("mouseout", function(d) {
          d3.select(this.parentNode.parentNode)
            .selectAll("#" + d.meta.site)
            .transition()
            .attr("r", 7)
            .duration(250);
          tooltip
            .transition()
            .style("opacity", 0)
            .style("z-index", 1000)
            .duration(250);
          let layer = GetLayerBySampleContextId(d.siteId);
          if (layer != null && layer !== undefined) {
            disableHighlightLayer(layer);
          }
        })
        .on("click", function(d) {
          let layer = GetLayerBySampleContextId(d.siteId);
          if (layer != null && layer !== undefined) {
            let bounds = layer.getBounds();
            map.flyToBounds(bounds, { padding: [300, 300] });
          }
        })
        .merge(circle)
        .transition()
        .duration(1500)
        .attr("cx", function(d) {
          var cx;
          if (max == min) {
            cx = 0;
          } else {
            cx = (d.value - min) / (max - min);
          }
          return x(cx);
        });

      //adding mean circles
      d3.select(this)
        .append("circle")
        .attr("class", "enter-mean")
        .attr("cy", y(d.key))
        .attr("r", 15)
        .style("stroke", "grey")
        .style("stroke-width", 2)
        .style("fill", "none")
        .style("opacity", 0)
        .transition()
        .duration(1500)
        .style("opacity", 0.75)
        .attr("cx", x((mean - min) / (max - min)));
    }); //.each() end.

  // should remove extras. Not sure if necessary.
  update.exit().remove();
}

//generating the map
var tileLayer = L.tileLayer(
  "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
  {
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    subdomains: "abcd",
    maxZoom: 19,
    minZoom: 5.75
  }
);
var map = L.map("map", {
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
proj4.defs(
  "EPSG:2193",
  "+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
);

//gets the params from the search bar
var taxonParams = new URLSearchParams(window.location.search);
var mode = taxonParams.get("mode");
window.circles = [];

var detailLevel = 60;
//warrick map additions
var grid = makeGrid(detailLevel);

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
var overlays = {
  "Grid: Abundance": gridAbundanceLayerGroup,
  "Grid: Richness": gridRichnessLayerGroup,
  "Heat: Abundance": heatLayerGroup,
  "Grid: Site Count": gridSitesLayerGroup
};
var layerMenu = L.control
  .layers(baseMaps, overlays, {
    position: "bottomleft",
    hideSingleBase: true,
    sortLayers: true,
    collapsed: false
  })
  .addTo(map);

//Adding input field for alternative grid slider control
var input = L.control({
  position: "bottomleft"
});
input.onAdd = map => {
  this._div = L.DomUtil.create("div", "info");
  // todo: Shrink down the input field to 4/5 numbers.
  this._div.innerHTML =
    '<label for="grid-input">Grid Resolution: </label><input id="grid-input" placeholder="Type value" type="number" onchange="changeSliderValue(this.value)"/>';
  return this._div;
};
input.addTo(map);

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

//function for input change
function changeSliderValue(value) {
  //slider slider.slider refers to the handle.
  slider.slider.value = value;
  slider._expand();
  slider._sliderValue.innerHTML = value;
  detailLevel = value;
  $("#filter").trigger("change");
}

//Adding leaflet slider to map for grip control.
var slider = L.control.slider(
  function(value) {
    detailLevel = value;
    $("#filter").trigger("change");
  },
  {
    id: slider,
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
slider.addTo(map);

//Adding custom control for Andrew's Visualization Copy.
const leafletGraphControl = L.control({ position: "bottomright" });
leafletGraphControl.onAdd = function() {
  this._div = L.DomUtil.create("div", "info"); //creates div with class "info"
  this.update();
  return this._div;
};

leafletGraphControl.update = function() {
  // TODO: use map function to list the site meta fields for the options.
  // TODO: To make this able to procedurally generate the options, needs to be called after siteAggregates has been set up.

  // Creates the same thing so that it wont throw reference errors. I think so calculations occur using the metric values before the elements exist.
  const selectionTemplate = text => {
    return `<div id="chart" style="display:none;">
    </div>
    <br />
    <button onclick="toggleGraph()">Toggle Graph</button>
    <label> Colour by: 
      <select id="meta-select" onChange="selectColorChange(this.value)" >
      ${text}
      </select>
    </label>
    <label> Colour type: 
      <select id="color-scheme-select" onChange="selectColorChange(this.value)" >
        <option selected value="sequential">Sequential</option>
        <option value="diverging">Diverging</option>
      </select>
    </label>`;
  };
  if (siteAggregates != null) {
    // using back ticks
    this._div.innerHeight = selectionTemplate("");
  } else {
    this._div.innerHTML = selectionTemplate(` <option selected value="elev">elev</option>
    <option value="mid_ph">Mid pH</option>
    <option value="mean_C_percent">Mean carbon concentration</option>
    <option value="prec_mean">Mean Precipitation</option>
    <option value="ave_logNconcen">Average log Nitrogen concentration</option>
    <option value="water2">Water 2</option>
    <option value="freshwater">Freshwater</option>`);
  }
};

/**
 * Selects all .enter elements and changes fill to the current option of the meta-select element.
 */
function selectColorChange(e) {
  var metric = document.getElementById("meta-select").value;
  var metricColour = createColorRange(siteAggregates);
  d3.selectAll(".enter")
    .transition()
    .duration(400)
    .attr("fill", function(d) {
      return metricColour(d.meta[metric]);
    });
}

/**
 * Toggles the datapoint visualization visibility.
 */
function toggleGraph() {
  $("#chart").toggle("slow");
}
leafletGraphControl.addTo(map);

//Adding d3 visualization
const { g, y, tooltip, x } = createGraph();

var hashComponents = decodeURIComponent(
  window.location.hash.replace("#", "")
).split(",");

function createGraph() {
  var margin = { top: 20, right: 30, bottom: 20, left: 160 },
    width = window.innerWidth * 0.75 - margin.left - margin.right,
    height = window.innerHeight * 0.35 - margin.top - margin.bottom;
  var chart = d3
    .select("#chart")
    .append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom);
  var main = chart
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .attr("width", width)
    .attr("height", height)
    .attr("id", "main");
  var x = d3
    .scaleLinear()
    .domain([0, 1]) // the range of the values to plot
    .range([0, width]); // the pixel range of the x-axis
  var xTicks = [0, 1];
  var xLabels = ["Minimum", "Maximum"];
  var xAxis = d3
    .axisBottom()
    .scale(x)
    .tickValues([0, 1])
    .tickFormat(function(d, i) {
      return xLabels[i];
    });
  var y = d3
    .scalePoint()
    //.domain(nested.map( function(d) { return d.key }) )
    .domain([
      "OTU richness",
      "Sequence abundance",
      "Shannon entropy",
      "Effective alpha diversity",
      "Orders"
    ])
    .range([0, height - 20])
    .padding(0.1);
  var yAxis = d3.axisLeft().scale(y);
  // Draw the x and y axes
  main
    .append("g")
    .attr("transform", "translate(0," + height + ")") // Position at bottom of chart
    .attr("class", "main axis")
    .attr("id", "xAxis")
    .call(xAxis);
  main
    .append("g")
    .attr("transform", "translate(0,0)") // Position at left of chart
    .attr("class", "main axis")
    .attr("id", "yAxis")
    .call(yAxis);
  // Draw the graph object holding the data points
  var g = main.append("svg:g").attr("id", "datapoints");
  var tooltip = d3
    .select("#map")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  return { g, y, tooltip, x };
}

function createLoadingMessage() {
  let popupDiv = document.createElement("div");
  popupDiv.id = "flex-container-state";
  let state = document.createElement("h1");
  state.id = "state-header";
  state.textContent = "Fetching data...";
  popupDiv.appendChild(state);
  let map = document.getElementById("map");
  map.appendChild(popupDiv);
}

function updateStatePopup(s) {
  document.getElementById("state-header").textContent = s;
}

function disableStatePopup() {
  let statePopup = document.getElementById("flex-container-state");
  statePopup.style.display = "none";
}

window.taxonTags = [];
function initializeSelect() {
  $("#filter").select2({
    placeholder: "Type to filter by classification and metadata",
    multiple: true,
    allowClear: true,
    width: "100%",
    minimumInputLength: 1,
    // cache: true,
    tags: true,
    ajax: {
      // url: API_URLS.local_filter_options,
      url: API_URLS.local_filter_options,
      delay: 250,
      data: function(params) {
        let query = {
          q: params.term,
          page: params.page || 1,
          page_size: params.page_size || 50
        };
        return query;
      },
      processResults: function(response, params) {
        // don't really know why this params page thing is necessary but it is.
        params.page = params.page || 1;
        params.page_size = params.page_size || 50;
        console.log(params);
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

        let contextOptions = data.context_options.map(context => {
          option = {
            // TODO: add value functionality
            id: index,
            text: context,
            group: "context"
          };
          index++;
          return option;
        });
        let moreResults = params.page * params.page_size < total_results;
        let taxonTags = window.taxonTags;
        groupedOptions = {
          results: [
            {
              text: "Custom",
              children: taxonTags
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
        console.log(groupedOptions);
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
      window.taxonTags.push(newTag);
      // console.log(window.local_tags);
      return newTag;
    }
  });
  $("#filter").change(function() {
    window.location.hash = encodeURIComponent($(this).val());
    let taxonFilters = $(this).select2("data");
    let contextFilters = $("#filterContextual").select2("data");
    fetchSampleOtus(taxonFilters, contextFilters);
  });
}

window.contextTags = [];
function initializeSelectContextual(json) {
  let data = json.data.context_options.map(field => {
    return {
      id: field,
      text: field
    };
  });
  $("#filterContextual").select2({
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
  $("#filterContextual").change(function() {
    window.location.hash = encodeURIComponent($(this).val());
    let contextualFilters = $(this).select2("data");
    let taxonFilters = $("#filter").select2("data");
    console.log(contextualFilters);
    console.log(taxonFilters);
    // something for hanlding meta filters.
    fetchSampleOtus(taxonFilters, contextualFilters);
  });
}

initializeSelect();
// load contextual options up front. Hardcoding some params.
// possibly separate into a different API later on if we have time or a need.
let url = API_URLS.local_filter_options + "q=&page=1&page_size=200";
fetch(url).then(response => {
  response.json().then(initializeSelectContextual);
});
