function round(x, dp) {
  var factor = Math.pow(10, dp);
  var tmp = x * factor;
  tmp = Math.round(tmp);
  return tmp / factor;
}

function checkFragment(f, species, site) {
  var ampIndex = f.indexOf('&');
  var ltIndex = f.indexOf('<');
  var gtIndex = f.indexOf('>');
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
  } else {
    return species.startsWith(f);
  }
  return false;
}

var siteMetrics;
//Called by handeResults
function getSiteWeights(filters) {
  var sites = {};
  n_points = 0;

  //warrick Clears grid layer values, gives them an index.
  var grid = makeGrid(detailLevel);
  gridCellLookup = makeGridLookup(grid);

  //console.log(grid);
  //set bool for all the grids that don't have a site.

  //Site metrics: Adding dictionary of site metrics for calculations.
  siteMetrics = {};
  console.time()
  //loop through parsed global result data.
  for (var i in window.results.data) {
    var taxon_row = window.results.data[i];
    //Extracts the species name from "" field of window.results
    var taxon_name = taxon_row[''];
    for (var taxon_column in taxon_row) {
      //Skip the bacteria name field, only process site lines.
      if (taxon_column != '') {
        // site contains the full meta row for a site.
        var site = window.meta[taxon_column];
        //declare bool defaulting to false
        var match = false;
        //if no filters it will always be match
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
          //add values to sitemetrics {} dictionary for visualization.
          if (siteMetrics[taxon_column] == null) {
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
  $('#numberResults').text(n_points);
  console.timeEnd()
  // console.log(grid);
  // console.log(sites);
  // console.log(siteMetrics);
  calculateSiteMetrics(siteMetrics);
  drawGrid(grid);
  return sites;

  function addValuesToGridCell(cell) {
    cell.richness++;
    cell.abundance += taxon_row[taxon_column];
    if (cell.cellSpecies[taxon_name] == null) {
      createGridCellSpecies();
    }
    else {
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
    siteMetrics[taxon_column].abundance += taxon_row[taxon_column];
    siteMetrics[taxon_column].richness++;
    // Adding key, value for species assuming there's only one entry for a species in the data.
    siteMetrics[taxon_column].species[taxon_name] = taxon_row[taxon_column];
  }

  function createSiteMetric() {
    siteMetrics[taxon_column] = site;
    siteMetrics[taxon_column].abundance = 0;
    siteMetrics[taxon_column].richness = 0;
    siteMetrics[taxon_column].species = {};
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
    var species = e[''];
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
      j = species.indexOf(';', j + 1);
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
    options.push({ id: k, text: k, title: 'Number of points: ' + data[k] });
  }
  for (var k in metaStats) {
    var mean = round(metaStats[k].sum / metaStats[k].n, 2);
    options.push({
      id: k,
      text: k,
      title:
        'Range: ' +
        round(metaStats[k].min, 2) +
        ' - ' +
        round(metaStats[k].max, 2) +
        '. Mean: ' +
        mean
    });
  }
  return options;
}

/**
 * Function called by papaparse on completion. Fills in the siteMeta and gridCell objects based on filtered results.
 * @param {*} results 
 * @param {*} meta 
 */
function handleResults(results, meta) {
  //creates global var results
  window.results = results;
  //loops through meta data passed in.
  var metaDict = {};
  for (var i in meta.data) {
    var site = meta.data[i]
    metaDict[site['site']] = site;
  }
  //makes meta dictionary global
  window.meta = metaDict;
  //instantiates the filter search bar
  $('#filter').select2({
    placeholder: 'Type to filter by classification and metadata',
    multiple: true,
    allowClear: true,
    data: getFilterData(),
    tags: true,
    createTag: function(params) {
      //console.log(params);
      var term = $.trim(params.term);

      if (term === '') {
        return null;
      }

      return {
        id: term,
        text: term,
        newTag: true // add additional parameters
      };
    }
  });
  $('#filter').change(function() {
    window.location.hash = encodeURIComponent($(this).val());
    var filters = $(this).select2('data');
    //note: need to change it so siteweights are everywhere at a fixed lonlat.
    var siteWeights = getSiteWeights(filters);
    var maxWeight = 0;
    for (var site in siteWeights) {
      var w = siteWeights[site];
      if (w > maxWeight) maxWeight = w;
    }
    //grid data layer creation
    // TODO: combined heat layer site coordinates and site-weights with others
    var latlngs = [];
    for (var site in siteWeights) {
      var siteMeta = window.meta[site];
      latlngs.push([siteMeta.y, siteMeta.x, siteWeights[site]]);
    }

    //Where the results are generated. Currently in heatmap form.
    if (!window.heat) window.heat = L.heatLayer(latlngs); //.addTo(map);
    heatLayerGroup.clearLayers();
    heatLayerGroup.addLayer(window.heat);
    window.heat.setOptions({ max: maxWeight * 1.5, maxZoom: 6 });
    window.heat.setLatLngs(latlngs);
    map.addLayer(heatLayerGroup);
  });
  if (hashComponents[0].length) {
    $('#filter').val(hashComponents);
  }
  $('#filter').trigger('change');
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
 * Main function for calculating and rendering the grid layers.
 * Calculates grid metrics to style the grid.
 * Gives each layer a id in feature.properties.
 * Creates feature collection
 * Creates cell polygons
 * Styles all layergroups
 * Clears layergroups and adds new ones to map layer control.
 * Generates popup content for the individual cell layers.
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

  // returns string in strong html tags
  const strongLine = (s) => {
    return (
      '<strong>' +
        s +
        '</strong>' +
        '<br />'
    );
  }

  // returns header in bold, string in regular text
  const strongHeader = (h, s) => {
    return (
      '<strong>' +
      h +
      ': </strong> ' +
      s +
      '<br />');
  }

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
      strongHeader('Cell id', cellId) +
      strongHeader('Cell Richness', cell.abundance) +
      strongHeader('Cell Abundance', cell.richness) +
      strongHeader('Cell Site Count', cell.cellSites.length) +
      strongHeader(
        'Longitude', cell.coordinates[0][0] +
        ' to ' +
        cell.coordinates[2][0]
      ) +
      strongHeader(
        'Latitude', 
        cell.coordinates[0][1] +
        ' to ' +
        cell.coordinates[2][1]
      ) +
      '<br />';
    cellId++;
    const speciesInCell = cell.cellSpecies;
    //console.log(speciesInCell);

    //list all sites within the cell.
    popupContent += strongLine('Sites in cell: ') + '<ul>';
    for (let site in cell.cellSites) {
      popupContent += '<li>' + cell.cellSites[site] + '</li>';
    }
    popupContent += '</ul><br />';

    //lists all the species within a cell.
    popupContent +=  strongLine('Search results in cell: ') +' <br />';
    for (let species in speciesInCell) {
      popupContent +=
        strongLine(species) +
        strongHeader('Frequency in cell', speciesInCell[species].count) +
        strongHeader('Abundance in cell', speciesInCell[species].value) +
        '<br />';
    }
    const cellPolygon = {
      type: 'Feature',
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
        type: 'Polygon',
        coordinates: [cell.coordinates]
      }
    };
    features.push(cellPolygon);
  }
  let featureCollection = {
    type: 'FeatureCollection',
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
  console.log('layer index is ' + layer.feature.properties.index);
  var speciesInCell = layer.feature.properties.speciesInCell;
  var speciesAmount = Object.keys(speciesInCell).length;
  console.log('Number of unique classifications in cell: ' + speciesAmount);
}

/**
 * Highlights visualization datapoints contained within the cellSites property of the hovered feature.
 * @param {*} e mouse hover 
 */
function handleMouseOver(e) {
  var layer = e.target;
  var siteList = layer.feature.properties.cellSites;
  for (site in siteList) {
    var circle = d3.selectAll('#' + siteList[site]);
    circle
      .transition()
      .duration(250)
      .attr('r', 14);
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
    var circle = d3.selectAll('#' + siteList[site]);
    circle
      .transition()
      .duration(250)
      .attr('r', 7);
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
  return '#000000';
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
    ? '#800026'
    : d > 0.8
      ? '#BD0026'
      : d > 0.7
        ? '#E31A1C'
        : d > 0.6
          ? '#FC4E2A'
          : d > 0.5
            ? '#FD8D3C'
            : d > 0.4
              ? '#FEB24C'
              : d > 0.3
                ? '#FED976'
                : d > 0.2 ? '#FFEDA0' : d > 0.0 ? '#FFFFCC' : '#9ecae1';
}

/**
 * Function called when layer is clicked on
 * @param {*} layer 
 */
function highlightFeatureClick(layer) {
  let layer = e.target;
  layer.setStyle({
    weight: 5,
    color: '#666',
    dashArray: '',
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
    opacity: getOutlineOpacity(properties.hasSamples),
  });
}

/**
 * Calculates site metric max abundance, richness and shannon entropy for chart
 * visualization then calls updateGraph. 
 * Different from calculateGridMaxes which targets cell-aggregated data.
 * @param {siteMetrics} siteMetrics 
 */
function calculateSiteMetrics(siteMetrics) {
  for (var site_index in siteMetrics){
    var site = siteMetrics[site_index];
    site.shannonDiversity = 0;
    for (var taxon_name in site.species) {
      speciesAbundance = site.species[taxon_name];
      // shannon value for an individual species relative to a site/sample. Adds them to the sum
      site.shannonDiversity += (speciesAbundance/site.abundance) * Math.log(speciesAbundance/site.abundance);
    }
    site.shannonDiversity *= -1;
    site.effectiveAlpha =  Math.exp(site.shannonDiversity);
    // console.log("site:" + site_index + " " +  " shannon score " + site.shannonDiversity);
  }
  updateGraph(siteMetrics);
}

/**
 * Calculates queries max and minimum site metrics. 
 * Returns colour range with spectrum from minimum value metric to max value metric.
 * @param {*} metric 
 * @param {*} siteMetrics 
 */
function createColorRange(siteMetrics) {
  // todo: Sometimes doesn't work with long named meta fields.
  
  var metric = document.getElementById('meta-select').value;
  // ? Not entirely sure why I pushed the sitemetrics onto a separate array.
  // console.log(siteMetrics);
  // console.log(metric);
  sites = [];
  for (var site in siteMetrics) {
    sites.push(siteMetrics[site]);
  }

  var min = d3.min(sites, function(d) {
    return d[metric];
  });
  var max = d3.max(sites, function(d) {
    return d[metric];
  });
  console.log("visualization plot min, max:", min, max);

  var colorScheme = document.getElementById('color-scheme-select').value;
  var colorRange = [];
  switch (colorScheme) {
    case("sequential"):
    colorRange = ['blue', 'orange'];
      break;
    case("diverging"):
      colorRange = ['#2c7bb6', '#d7191c'];
      break;
    default:
      colorRange = ['grey', 'black'];
  }

  var colourRange = d3
    .scaleLinear()
    // ? Not sure if interpolate is best visibility choice.
    .interpolate(d3.interpolateRgb)
    .domain([min, max])
    .range(colorRange);

  return colourRange;
}

/**
 * Returns a random amount between upper and lower. For jittering the plots.
 * @param {*} upper 
 * @param {*} lower 
 */
let randomRange = (upper, lower) => {
  return (Math.random() * (upper - (lower)) + (lower));
};

/**
 * Converts siteMetrics to an easier format for d3 use. Updates existing datapoints, enters new additional datapoints
 * @param {*} siteMetrics 
 */
function updateGraph(siteMetrics) {

  // todo: fix the naming here...
  // todo: see if I can make this into one class. Called in colorrange, select onchange function as well.
  var metricColour = createColorRange(siteMetrics);
  var colourMetric = document.getElementById("meta-select").value;
  var dataSet = [];
  for (var site in siteMetrics) {
    var siteMetric = siteMetrics[site];
    var siteRichness = {
      siteId: siteMetric.site,
      Metric: 'OTU richness',
      value: siteMetric.richness,
      meta: siteMetric
    };
    dataSet.push(siteRichness);

    var siteShannon = {
      siteId: siteMetric.site,
      Metric: 'Shannon entropy',
      value: siteMetric.shannonDiversity,
      meta: siteMetric
    };
    dataSet.push(siteShannon);

    var siteAbundance = {
      siteId: siteMetric.site,
      Metric: 'Sequence abundance',
      // TEMP:FIXME: bpa count abundance mismatch
      value: siteMetric.abundance,
      meta: siteMetric
    };
    dataSet.push(siteAbundance);

    var siteAlpha = {
      siteId: siteMetric.site,
      Metric: 'Effective alpha diversity',
      value: siteMetric.effectiveAlpha, 
      meta: siteMetric
    };
    dataSet.push(siteAlpha);
  
  }//end of for loop

  var nestedData = d3
    .nest()
    .key(function(d) {
      return d.Metric;
    })
    .entries(dataSet);
  // console.log(nestedData);

  //within the svg, within the g tags, select the class datapoints
  var update = g.selectAll('.datapoints').data(nestedData, function(d) {
    return d.values;
  });

  var enter = update
    .enter()
    .append('g')
    .attr('class', 'datapoints')
    .merge(update)
    .each(function(d) {
      //loop through each data group
      var min = d3.min(d.values, function(d) {
        return d.value;
      });
      var max = d3.max(d.values, function(d) {
        return d.value;
      });
      var mean = d3.mean(d.values, function(d) {
        return d.value;
      });
      //console.log(min, max, mean);

      var circle = d3
        .select(this)
        .selectAll('circle')
        .data(d.values, function(d) {
          return d.siteId;
        });

      circle.exit().remove();

      //Enter statement
      circle
        .enter()
        .append('circle')
        .attr('class', 'enter')
        .attr('id', d => d.siteId)
        //.attr('cy', y(d.key))
        .attr('cy', function(circle) {
          // * If no jitter wanted then set jitter 0, 0.
          return y(circle.Metric) + randomRange(10, -10);
        })
        .attr('r', 7)
        .attr('opacity', 0.3)
        .attr('fill', function(d) {
          //TODO: Create a function to get the select dropdown values. For here and onchange.
          //console.log(d.meta[metric]);
          return metricColour(d.meta[colourMetric]);
        })
        .on('mouseover', function(d) {
          d3
            .select(this.parentNode.parentNode)
            .selectAll('#' + d.siteId)
            .transition()
              .attr('r', 14)
              .duration(250);
          tooltip
            .transition()
              .style('opacity', 0.9)
              .duration(250);
          tooltip
            .html(
              '<strong>' +
                d.siteId +
                '</strong><br />' +
                '<strong>' +
                d.Metric +
                ': </strong>' +
                d.value +
                '<br />' +
                '<strong>' + document.getElementById("meta-select").value +': </strong>' +
                d.meta[document.getElementById("meta-select").value]
            )
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY - 10 + 'px')
            .style('opacity', 0.9)
            .style('z-index', 1000);

            var circle = d3.select(this);
            var site = circle.attr('id');
            //Uses grid cell look-up to zoom to
            var featureIndex = gridCellLookup[site];
            //console.log(featureIndex);

            //e>layers>feature>properties> index == featureIndex. Then highlight.
            map.eachLayer(function (layer) {
              //console.log(layer);
              if (layer.feature != null) {
                if (layer.feature.properties.index == featureIndex) {
                  highlightLayer(layer);
                }
              }
            });  
        })
        .on('mouseout', function(d) {
          d3
            .select(this.parentNode.parentNode)
            .selectAll('#' + d.siteId)
            .transition()
            .attr('r', 7)
            .duration(250);
          tooltip
            .transition()
            .style('opacity', 0)
            .style('z-index', 1000)
            .duration(250);

            var circle = d3.select(this);
            var site = circle.attr('id');
            //Uses grid cell look-up to zoom to
            //TODO: feature index doesn't match up with popup content index. Reduce grid to only include sampled cells.
            var featureIndex = gridCellLookup[site];

            //e>layers>feature>properties> index == featureIndex. Then highlight.
            map.eachLayer(function (layer) {
              if (layer.feature != null) {
                if (layer.feature.properties.index == featureIndex) {
                  disableHighlightLayer(layer);
                }
              }
            }); 
        })
        .on('click', function(d) {
          var circle = d3.select(this);
          var site = circle.attr('id');
          //Uses grid cell look-up to zoom to

          //TODO: feature index doesn't match up with popup content index. Reduce grid to only include sampled cells.
          var featureIndex = gridCellLookup[site];

          //e>layers>feature>properties> index == featureIndex. Then highlight.
          map.eachLayer(function(layer) {
            if (layer.feature != null) {
              if (layer.feature.properties.index == featureIndex) {
                var bounds = layer.getBounds();
                //var centre = bounds.getCenter();
                map.flyToBounds(bounds, { padding: [100, 100] });
                //highlightLayer(layer);
              }
            }
          });
        })
        .merge(circle)
        .transition()
          .duration(1500)
          .attr('cx', function(d) {
            var cx;
            if (max == min) {
              cx = 0;
            } else {
              cx = (d.value - min) / (max - min);
            }
            return x(cx);
        });

      //adding mean circles
      d3
        .select(this)
        .append('circle')
        .attr('class', 'enter-mean')
        .attr('cy', y(d.key))
        .attr('r', 15)
        .style('stroke', 'grey')
        .style('stroke-width', 2)
        .style('fill', 'none')
        .style('opacity', 0)
        .transition()
          .duration(1500)
          .style('opacity', 0.75)
          .attr('cx', x((mean - min) / (max - min)));
    }); //.each() end.

  var remove = update.exit().remove();
}

//generating the map
var tileLayer = L.tileLayer(
  'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
  {
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    minZoom: 5.75,
  }
);
var map = L.map('map', {
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
  'EPSG:2193',
  '+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
);

//gets the params from the search bar
var params = new URLSearchParams(window.location.search);
var mode = params.get('mode');
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
  'Grid: Abundance': gridAbundanceLayerGroup,
  'Grid: Richness': gridRichnessLayerGroup,
  'Heat: Abundance': heatLayerGroup,
  'Grid: Site Count': gridSitesLayerGroup
};
var layerMenu = L.control
  .layers(baseMaps, overlays, {
    position: 'bottomleft',
    hideSingleBase: true,
    sortLayers: true,
    collapsed: false
  })
  .addTo(map);

  //Adding input field for alternative grid slider control
  var input = L.control({
    position: 'bottomleft'
  });
  input.onAdd = (map) => {
    this._div = L.DomUtil.create('div', 'info');
    // todo: Shrink down the input field to 4/5 numbers.
    this._div.innerHTML = '<label for="grid-input">Grid Resolution: </label><input id="grid-input" placeholder="Type value" type="number" onchange="changeSliderValue(this.value)"/>';
    return this._div;
  };
  input.addTo(map);
  //function for input change 
  function changeSliderValue(value) {
    //slider slider.slider refers to the handle. 
    slider.slider.value = value;
    slider._expand();
    slider._sliderValue.innerHTML = value;
    detailLevel = value;
    $('#filter').trigger('change');
  }

//Adding leaflet slider to map for grip control.
var slider = L.control.slider(
  function(value) {
    detailLevel = value;
    $('#filter').trigger('change');
  },
  {
    id: slider,
    min: 1,
    //width not working.
    size: '300px',
    max: 1500,
    step: 1,
    value: detailLevel,
    logo: 'Grid',
    increment: true,
    orientation: 'horiztonal',
    position: 'bottomleft',
    syncSlider: true,
  }
);
slider.addTo(map);


//Adding custom control for Andrew's Visualization Copy.
var visControl = L.control({ position: 'bottomright' });
visControl.onAdd = function(map) {
  this._div = L.DomUtil.create('div', 'info'); //creates div with class "info"
  this.update();
  return this._div;
};

visControl.update = function() {
  // todo: use map function to list the site meta fields for the options.
  // todo: Make this function called after the window.meta has been processed and (possibly) filtered
  // otherwise it will have no idea what siteMetric keys to add as select options.
  // if siteMetrics not null then generate option elements from site meta keys.
  if (siteMetrics != null) {
    console.log("site metrics found. Filling select element based on meta keys");
    //using ECMA script 6 template literal using backticks.
    this._div.innerHeight = 
    `<div id="chart" style="display: none;">
    </div>
    <br />
    <button onclick="toggleGraph()">Toggle Graph</button>
    <label> Colour by: 
      <select id="meta-select" onChange="selectColorChange(this.value)" >
      </select>
    </label>
    <label> Colour type: 
      <select id="color-scheme-select" onChange="selectColorChange(this.value)" >
        <option selected value="sequential">Sequential</option>
        <option value="diverging">Diverging</option>
      </select>
    </label>`
    ;

    //filling "colour by" options based on meta data keys:

    // get any sample to look at. Just grabbing first:

    // * Not auto-filling the colouring options at the moment.
    // * This block auto fills the options according to valid number meta fields.
    /*
    var site = siteMetrics[Object.keys(siteMetrics)[0]];
    for (var metric in site) {
      if (isNaN(site[metric])) {
        console.log(site[metric], " not valid number");
      }
      else {
        console.log(site[metric], " valid number");
        //if valid metric then add to options.
        document.getElementById("meta-select").innerHTML += `
          <option selected value=${metric}>${metric}</option>
        `;
      }
    }
    */
  }
  else {
    // console.log(siteMetrics);
    this._div.innerHTML =
    `<div id="chart" style="display: none;">
    </div>
    <br />
    <button onclick="toggleGraph()">Toggle Graph</button>
    <label> Colour by: 
      <select id="meta-select" onChange="selectColorChange(this.value)" >
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
      <select id="color-scheme-select" onChange="selectColorChange(this.value)" >
        <option selected value="sequential">Sequential</option>
        <option value="diverging">Diverging</option>
      </select>
    </label>`
    ;
  }
}

/** 
 * Selects all .enter elements and changes fill to the current option of the meta-select element.
  */
function selectColorChange(e) {
  var metric = document.getElementById("meta-select").value;
  var metricColour = createColorRange(siteMetrics)
  d3.selectAll(".enter")
    .transition()
    .duration(400)
      .attr("fill", function(d) {
        return metricColour(d.meta[metric])
      })
}

/**
 * Toggles the datapoint visualization visibility.
 */
function toggleGraph() {
  //TODO: Add ability to reduce size by a factor.
  var graph = $('#chart').toggle('slow');
}

visControl.addTo(map);

//Adding d3 visualization
var margin = { top: 20, right: 30, bottom: 20, left: 160 },
  width = window.innerWidth * 0.75 - margin.left - margin.right,
  height = window.innerHeight * 0.35 - margin.top - margin.bottom;

var chart = d3
  .select('#chart')
  .append('svg')
  .attr('width', width + margin.right + margin.left)
  .attr('height', height + margin.top + margin.bottom);
  //.attr("viewBox", "0 0 " + width + " " + height)
  //.attr("preserveAspectRatio", "xMidYMid meet");

// Define area where the graph will be drawn
var main = chart
  .append('g')
  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
  .attr('width', width)
  .attr('height', height)
  .attr('id', 'main');

var x = d3
  .scaleLinear()
  .domain([0, 1]) // the range of the values to plot
  .range([0, width]); // the pixel range of the x-axis
var xTicks = [0, 1];
var xLabels = ['Minimum', 'Maximum'];
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
    'OTU richness',
    'Sequence abundance',
    'Shannon entropy',
    'Effective alpha diversity',
    'Orders'
  ])
  .range([0, height - 20])
  .padding(0.1);
var yAxis = d3.axisLeft().scale(y);

// Draw the x and y axes
main
  .append('g')
  .attr('transform', 'translate(0,' + height + ')') // Position at bottom of chart
  .attr('class', 'main axis')
  .attr('id', 'xAxis')
  .call(xAxis);

main
  .append('g')
  .attr('transform', 'translate(0,0)') // Position at left of chart
  .attr('class', 'main axis')
  .attr('id', 'yAxis')
  .call(yAxis);

// Draw the graph object holding the data points
var g = main.append('svg:g').attr('id', 'datapoints');

var tooltip = d3
  .select('#map')
  .append('div')
  .attr('class', 'tooltip')
  .style('opacity', 0);

// NOTE: Should I:
// 1. cronjob update the data/metadata every day or something and work from those? 
// 2. Or should I request from the DB for every new page load?
// 3. Or make a query with the specific result set every time the filter is updated?

// results structure:  [{"": name, site: value, ...}, {"": name, site: value, ...}]
// query all the OTUS.
  //iterate all the OTUS and subquery all the sites
    //use both those keys to grab the abundance value of that.

// TEMP: Going to replace the window.results.data and window.meta.data with the results from this query and work from there until I can change everything else.
var useDatabase = true;
var lightRequest = true;
if (useDatabase) {
  if (lightRequest) {
    loadUnsortedData();
  }
  else {
    loadSortedData();
  }
}
else {
  loadFromFile();
}

var hashComponents = decodeURIComponent(
  window.location.hash.replace('#', '')
).split(',');

function loadSortedData() {
  // Returns the data as nested dictionaries. Json is much larger than the light request but processes server side rather than client side.
  try {
    console.time();
    abundanceRequest = new Request('https://edna.nectar.auckland.ac.nz/edna/api/abundance?term=');
    fetch(abundanceRequest).then(response => {
      response.json().then(abundanceResults => {
        console.timeEnd();
        abundanceData = abundanceResults;
        metadataRequest = new Request('https://edna.nectar.auckland.ac.nz/edna/api/metadata?term=');
        fetch(metadataRequest).then(metaResponse => {
          metaResponse.json().then(metaResults => {
            siteData = metaResults;
            // console.log(siteData);
            console.log(abundanceData);
            handleResults(abundanceData, siteData);
            visControl.update(siteMetrics);
          });
        });
      });
    });
  }
  catch (err) {
    console.log(err);
    loadFromFile();
  }
}

function loadUnsortedData() {
  // requirements for light request to work:
  // 1. Ordering of the abundances needs to be otu_id ASC, sample_id ASC
  // 2. Number of entries in Sample_OTU table entries must be equal to number of (OTU table entries * Sample_Context table entries)     
  console.time();
  fetch('https://edna.nectar.auckland.ac.nz/edna/api/sample_otu_ordered').then(response => {
    response.json().then(result => {
      data = result.data;
      console.log(data);
      abundance_dict = {
        'data': []
      };
      abundance_dict.data = data.otus.map((otu, otuIndex) => {
        otuEntry = {
          '': otu,
        };
        data.sites.map((site) => {
          otuEntry[site] = 0;
        });
        return otuEntry;
      });
      // tuple structure: otuid, sampleid, count.
      for (let tuple in data.abundances) {
        let otu_index = data.abundances[tuple][0];
        let sample = data.sites[data.abundances[tuple][1]];
        let value = (data.abundances[tuple][2]);
        try {
          abundance_dict.data[otu_index-1][sample] =  value;
        }
        catch {
          console.log('otu index: %s, sample key: %s, value: %d', otu_index, sample, value);
        }
      }
      console.timeEnd();
      console.log(abundance_dict);
      metadataRequest = new Request('https://edna.nectar.auckland.ac.nz/edna/api/metadata?term=');
      fetch(metadataRequest).then(metaResponse => {
        metaResponse.json().then(metaResults => {
          siteData = metaResults;
          // console.log(siteData);
          // console.log(abundance_dict);
          handleResults(abundance_dict, siteData);
          visControl.update(siteMetrics);
        });
      });
    });
  });
}

function loadFromFile(){
  // Loads from local .tsv files. Called if the request throws an error
  Papa.parse('active-abundance-data.tsv', {
    download: true,
    header: true,
    dynamicTyping: true,
    // once water data parsed, parse waterdata metadata and pass them both into handleResults.
    complete: function(results) {
      Papa.parse('active-meta-data.tsv', {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function(meta) {
          console.log(results);
          // console.log(meta);
          handleResults(results, meta);
          visControl.update(siteMetrics);
        }
      });
    }
  });
}