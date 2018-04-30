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

var cellSiteDict = {};
var siteMetrics;
//Called by handeResults
function getSiteWeights(filters) {
  var sites = {};
  n_points = 0;

  //warrick Clears grid layer values, gives them an index.
  var grid = MakeGrid(map, detailLevel);
  ClearGrid(grid);
  cellSiteDict = MakeGridIndex(grid);

  //console.log(grid);
  //set bool for all the grids that don't have a site.

  //Site metrics: Adding dictionary of site metrics for calculations.
  siteMetrics = {};

  //loop through parsed global result data.
  for (var i in window.results.data) {
    //e = contains species name + the bacteria's counts for all sites.
    var e = window.results.data[i];
    //Extracts the species name from "" field of window.results
    var species = e[''];
    //v for every field in the data row
    for (var k in e) {
      //Skip the bacteria name field, only process site lines.
      if (k != '') {
        //Extracts the measurements (e.g. alpine=.32, gravel=.5)
        // from a particular site, stores in site var.
        var site = window.meta[k];
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
          match = checkFragment(f, species, site);
          if (match) break;
        }
        //if the bacteria + current site combo returns a match + the current bacteria with current site
        //has a bacteria reading over 0 then:
        if (match && e[k] > 0) {
          //if site currently contains no values/(maybe a value that isn't 1?) then give it a value of 0
          if (!sites[k]) sites[k] = 0;
          //add the value found at bacteria-e's site-k value.
          sites[k] += e[k];

          //add values to sitemetrics {} dictionary for visualization.
          if (siteMetrics[k] == null) {
            siteMetrics[k] = site;
            siteMetrics[k].abundance = e[k];
            siteMetrics[k].richness = 1;
            siteMetrics[k].species = [species];
          } else {
            siteMetrics[k].abundance += e[k];
            siteMetrics[k].richness++;
            if (siteMetrics[k].species.indexOf(species) == -1) {
              siteMetrics[k].species.push(species);
            }
          }

          //console.log(siteMetrics);
          //Warrick: Add to the corresponding grid as well.
          var cellIndex = cellSiteDict[k];
          grid.cells[cellIndex].count++;
          grid.cells[cellIndex].value += e[k];

          var cell = grid.cells[cellIndex];
          if (cell.cellSpecies[species] == null) {
            cell.cellSpecies[species] = {
              count: 1,
              value: e[k]
            };
          } else {
            cell.cellSpecies[species].count++;
            cell.cellSpecies[species].value += e[k];
          }

          //increment the n_points which is the total amount of sites the bacteria is found at.
          n_points++;
        }
      }
    }
  }
  $('#numberResults').text(n_points);
  
  //console.log(grid);
  //console.log(sites);

  calculateSiteMetrics(siteMetrics);
  //console.log(siteMetrics);

  //warrick: integrating filtered results with grid view.
  DrawGrid(grid);
  return sites;
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
  //console.log(meta);
  //loops through meta data passed in.
  var metaDict = {};
  for (var i in meta.data) {
    var site = meta.data[i];
    //Converts the long lat coordinates to cartesian.
    var reprojected = proj4('EPSG:2193', 'WGS84', site);
    //Creates new entry of capitalized metadata id: cartesian coordinates.
    metaDict[site['site'].toUpperCase()] = reprojected;
  }
  //makes meta dictionary global
  window.meta = metaDict;
  //instantiates the filter search bar
  $('#filter').select2({
    placeholder: 'Type to filter by classification and metadata',
    //allows multiple tag filters at once.
    multiple: true,
    //allows clearing of the box instantly
    allowClear: true,
    //Gets all the data and metadata possible searches and pushes them to the select drop down.
    data: getFilterData(),
    //allows addition of custom tags to the options.
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
    //console.log(filters);
    //gets the results from the filters.
    //note: need to change it so siteweights are everywhere at a fixed lonlat.
    var siteWeights = getSiteWeights(filters);
    //console.log(siteWeights);
    var maxWeight = 0;
    for (var site in siteWeights) {
      var w = siteWeights[site];
      if (w > maxWeight) maxWeight = w;
    }
    //grid data layer creation
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
 * @param {*} map 
 * @param {*} detailLevel 
 */
function MakeGrid(map, detailLevel) {
  //Hard coded bounds and offsets.
  start = [164.71222, -33.977509];
  var gridStart = start;
  var end = [178.858982, -49.66352];

  var hardBounds = L.latLngBounds(start, end);
  northWest = hardBounds.getNorthWest();
  northEast = hardBounds.getNorthEast();
  southWest = hardBounds.getSouthWest();
  southEast = hardBounds.getSouthEast();
  var latOffset = (northWest.lat - southWest.lat) / detailLevel;
  var lngOffset = (northEast.lng - northWest.lng) / detailLevel;
  //hard coded bounds and offsets end.

  var gridCells = [];
  for (var i = 0; i < detailLevel; i++) {
    for (var j = 0; j < detailLevel; j++) {
      //create rectangle polygon.
      var topLeft = [start[0], start[1]];
      var topRight = [start[0] + lngOffset, start[1]];
      var bottomRight = [start[0] + lngOffset, start[1] - latOffset];
      var bottomLeft = [start[0], start[1] - latOffset];

      var cell = [topLeft, topRight, bottomRight, bottomLeft];
      var key = i * detailLevel + j;

      cell = {
        coordinates: cell,
        count: 0,
        value: 0,
        cellSpecies: {},
        cellSites: [],
        hasSamples: false
      };
      gridCells.push(cell);
      start = [start[0] + lngOffset, start[1]];
    }
    start = [start[0] - lngOffset * detailLevel, start[1] - latOffset];
  }

  var grid = {
    start: gridStart,
    lngOffset: lngOffset,
    latOffset: latOffset,
    detailLevel: detailLevel,
    cells: gridCells
  };
  return grid;
}

/**
 * Clears the values in the grid.
 * @param {*} grid 
 */
function ClearGrid(grid) {
  for (var cell in grid.cells) {
    if (cell.count != 0) {
      cell.count = 0;
    }
    if (cell.value != 0) {
      cell.value = 0;
    }
    cell.speciesDict = {};
  }
  cell.cellSpecies = {};
}

/**
 * Creates the grid lookup object/dictionary used for filling in the grid and calculating it's position.
 * @param {*} grid 
 */
function MakeGridIndex(grid) {
  var siteCellDict = {};
  var gridStart = grid.start;
  var lngOffset = grid.lngOffset;
  var latOffset = grid.latOffset;
  var detailLevel = grid.detailLevel;

  for (var siteName in window.meta) {
    var site = window.meta[siteName];
    if (siteCellDict[siteName] == null) {
      var siteLng = site.x;
      var siteLat = site.y;

      var lngDiff = Math.abs(siteLng) - Math.abs(gridStart[0]);
      var colIndex = Math.floor(lngDiff / lngOffset);

      var latDiff = Math.abs(siteLat) - Math.abs(gridStart[1]);
      var rowIndex = Math.floor(latDiff / latOffset);

      var siteCellIndex = rowIndex * detailLevel + colIndex;
      //console.log(siteCellIndex);

      siteCellDict[siteName] = siteCellIndex;
      //only-sampled-grids: add haSamples bool

      //Set the grids that contain samples to true. Not search-dependent.
      grid.cells[siteCellIndex].hasSamples = true;

      //if site count unfiltered.
      if ($.inArray(siteName, grid.cells[siteCellIndex].cellSites) == -1) {
        grid.cells[siteCellIndex].cellSites.push(siteName);
      }
    } else {
      continue;
    }
  }
  //console.log(siteCellDict);
  return siteCellDict;
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
function DrawGrid(grid) {
  var cells = grid.cells;
  var gridMaxes = CalculateGridMaxes(cells);

  var maxRichness = gridMaxes.richness;
  var maxAbundance = gridMaxes.abundance;
  var maxSiteCount = gridMaxes.siteCount;


  var features = [];
  var gridCells = grid.cells;
  var cellId = 0;
  //Generating geojson
  for (var i in gridCells) {
    var cell = gridCells[i];

    var cellAbundance = cell.abundance;

    //if grid doesn't contain any sites then don't add to map.
    if (!cell.hasSamples) {
      continue;
    }

    var weightedCount = cell.richness / maxRichness;
    var weightedValue = cell.value / maxAbundance;
    var weightedSites = cell.cellSites.length / maxSiteCount;

    //Add cell statistics within popup.
    //Cell coordinates
    var popupContent =
      '<strong>Cell id:</strong> ' +
      cellId +
      '<br />' +
      '<strong>Cell Richness:</strong> ' +
      cell.richness +
      '<br />' +
      '<strong>Cell Abundance: </strong>' +
      cell.value +
      '<br />' +
      '<strong>Cell Site Count: </strong>' +
      cell.cellSites.length +
      '<br />' +
      '<strong>Lng:</strong>  ' +
      cell.coordinates[0][0] +
      ' to ' +
      cell.coordinates[2][0] +
      '<br />' +
      '<strong>Lat:</strong>  ' +
      cell.coordinates[0][1] +
      ' to ' +
      cell.coordinates[2][1] +
      '<br /><br />';

    cellId++;
    var speciesInCell = cell.cellSpecies;
    //console.log(speciesInCell);

    //list all sites within the cell.
    popupContent += '<strong>Sites in cell: </strong><br />' + '<ul>';
    for (var site in cell.cellSites) {
      popupContent += '<li>' + cell.cellSites[site] + '</li>';
    }
    popupContent += '</ul><br />';

    //lists all the species within a cell.
    popupContent += '<strong>Search results in cell: </strong><br /><br />';
    for (species in speciesInCell) {
      popupContent +=
        '<strong>' +
        species +
        '</strong>' +
        '<br />' +
        '<strong>Cell frequency:</strong> ' +
        speciesInCell[species].count +
        '<br />' +
        '<strong>Cell abundance:</strong> ' +
        speciesInCell[species].value +
        '<br /><br />';
    }

    //TODO: cellPolygon and popupcontent id's are out of sync. Maybe make cell polygon nested somehow.
    //TODO: Alternative make when making the gridCells that the feature index is based off. Reduce the array down to just
    //TODO: the cells that have samples then it should match.
    var cellPolygon = {
      type: 'Feature',
      properties: {
        index: i,
        weightedValue: weightedValue,
        weightedCount: weightedCount,
        speciesInCell: speciesInCell,
        weightedSites: weightedSites,
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
  //console.log(features);

  var featureCollection = {
    type: 'FeatureCollection',
    features: features
  };

  //Clear count layer and add new one to layergroup.
  var gridCountLayer = L.geoJSON(featureCollection, {
    style: CellCountStyle,
    onEachFeature: onEachFeature
  });
  gridCountLayerGroup.clearLayers();
  gridCountLayerGroup.addLayer(gridCountLayer);

  //Clear count layer, add new one to layergroup.
  var gridValueLayer = L.geoJSON(featureCollection, {
    style: CellValueStyle,
    onEachFeature: onEachFeature
  });
  gridValueLayerGroup.clearLayers();
  gridValueLayerGroup.addLayer(gridValueLayer);

  //Clear site count layer, add new one to layergroup.
  var gridSitesLayer = L.geoJSON(featureCollection, {
    style: CellSitesStyle,
    onEachFeature: onEachFeature
  });
  gridSitesLayerGroup.clearLayers();
  gridSitesLayerGroup.addLayer(gridSitesLayer);

  //test
  //console.log(gridSitesLayer);
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

  //get total value for shannon index calculation
  var totalValue = 0;
  for (var species in speciesInCell) {
    var speciesData = speciesInCell[species];
    totalValue += speciesData.value;
  }
  console.log('total abundance of cell: ' + totalValue);

  //calculate metrics for species within the cell
  for (var species in speciesInCell) {
    speciesData = speciesInCell[species];
    var speciesShannonIndex =
      -1 *
      (speciesData.value /
        totalValue *
        Math.log(speciesData.value / totalValue));
    var speciesRichness = speciesData.count;
    var speciesAbundance = speciesData.value;
    //console.log(species, speciesShannonIndex, speciesRichness, speciesAbundance);
  }
}

/**
 * Highlights visualization datapoints contained within the cellSites property of the hovered feature.
 * @param {*} e mouse hover 
 */
function handleMouseOver(e) {
  var layer = e.target;
  //console.log(layer.feature.properties.cellSites);
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
 * returns feature style based on feature properties cellSites length
 * which is the amount of unique sites within the cell.
 * @param {*} feature 
 */
function CellSitesStyle(feature) {
  return {
    fillColor: GetFillColor(feature.properties.weightedSites),
    weight: 1,
    opacity: GetOutlineOpacity(
      feature.properties.weightedSites,
      feature.properties.hasSamples
    ),
    color: GetOutlineColour(feature.properties.hasSamples),
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
    fillColor: GetFillColor(feature.properties.weightedValue),
    weight: 1,
    opacity: GetOutlineOpacity(
      feature.properties.weightedValue,
      feature.properties.hasSamples
    ),
    color: GetOutlineColour(feature.properties.hasSamples),
    fillOpacity: GetFillOpacity(
      feature.properties.weightedValue,
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
    fillColor: GetFillColor(feature.properties.weightedCount),
    weight: 1,
    opacity: GetOutlineOpacity(
      feature.properties.weightedCount,
      feature.properties.hasSamples
    ),
    color: GetOutlineColour(feature.properties.hasSamples),
    fillOpacity: GetFillOpacity(
      feature.properties.weightedCount,
      feature.properties.hasSamples
    )
  };
}

/**
 * Provides aggregate calculation for richness and adds it to the gridCell data.
 * Calculates and returns the maximums for cell richness, abundance and shannon entropy within the grid.
 * @param {*} gridCells 
 */
function CalculateGridMaxes(gridCells) {
  //console.log(cells);
  var richness = 0;
  var abundance = 0;
  var siteCount = 0;
  var totalCount = 0;
  for (var i in gridCells) {
    var cell = gridCells[i];

    //Summing sites within cell. Add the data to the cell.
    var cellRichness = Object.keys(cell.cellSpecies).length;
    cell.richness = cellRichness;
    if (cell.richness > richness) {
      richness = cellRichness;
    }
    if (cell.value > abundance) {
      abundance = cell.value;
    }
    if (cell.cellSites.length > siteCount) {
      siteCount = cell.cellSites.length;
    }
    totalCount += cell.count;
  }
  //console.log("max count ", maxCount, "max value ", maxValue, "total count ", totalCount);

  var gridMaxes = {
    richness: richness,
    abundance: abundance,
    siteCount: siteCount
  };
  return gridMaxes;
}

/**
 * Returns value for outline opacity. Currently hardcoded to 0.15.
 * Currently used to centralize style changes across multiple layers.
 * @param {*} hasSamples 
 */
function GetOutlineOpacity(hasSamples) {
    return 0.15;
}

/**
 * Returns value for outline color. Currently hardcoded to 0.15.
 * Currently used to centralize style changes across multiple layers.
 * @param {*} hasSamples 
 */
function GetOutlineColour(hasSamples) {
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
  var layer = e.target;

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
    opacity: GetOutlineOpacity(properties.hasSamples),
  });
}

/**
 * Calculates site metric max abundance, richness and shannon entropy then calls updateGraph. 
 * Different from calculateGridMaxes which targets cell aggregated data.
 * @param {siteMetrics} siteMetrics 
 */
function calculateSiteMetrics(siteMetrics) {
  //Get sum count and value for calculations.
  var totalCount = 0;
  var totalValue = 0;
  for (var site in siteMetrics) {
    totalValue += siteMetrics[site].abundance;
    totalCount += siteMetrics[site].richness;
  }
  //calculate ShannonIndex for each site.
  for (var site in siteMetrics) {
    var siteValue = siteMetrics[site].abundance;
    var shannonDiversity =
      -1 * (siteValue / totalValue) * Math.log(siteValue / totalValue);
    siteMetrics[site].shannonDiversity = shannonDiversity;
  }
  //console.log(siteMetrics);

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

  console.log(siteMetrics);

  // ? Not entirely sure why I pushed the sitemetrics onto a separate array.
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
 * Returns a random amount between upper and lower.
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
      value: siteMetric.abundance,
      meta: siteMetric
    };
    dataSet.push(siteAbundance);

    var siteAlpha = {
      siteId: siteMetric.site,
      Metric: 'Effective alpha diversity',
      value: siteMetric.species.length,
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
  console.log(nestedData);

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
            var featureIndex = cellSiteDict[site];
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
            var featureIndex = cellSiteDict[site];

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
          var featureIndex = cellSiteDict[site];

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
        .attr('r', 12)
        .style('stroke', 'grey')
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
var grid = MakeGrid(map, detailLevel);

//shows the scale of the map
var scaleIndicator = L.control.scale().addTo(map);

//instantiating empty layer control layers to be filled later
var gridCountLayerGroup = L.layerGroup();
var gridValueLayerGroup = L.layerGroup();
var gridSitesLayerGroup = L.layerGroup();
var heatLayerGroup = L.layerGroup();
var baseMaps = {
  Base: tileLayer
};
var overlays = {
  'Grid: Abundance': gridValueLayerGroup,
  'Grid: Richness': gridCountLayerGroup,
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
    this._div.innerHTML = '<label for="grid-input">Grid </label><input id="grid-input" size="3" placeholder="Type value" type="number" onchange="changeSliderValue(this.value)"/>';
    return this._div;
  };
  input.addTo(map);
  //function for input change 
  function changeSliderValue(value) {
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
  //using ECMA script 6 template literal using backticks.
  // todo: use map function to list the site meta fields for the options.

  // todo: Make this function called after the window.meta has been processed and (possibly) filtered
  // otherwise it will have no idea what siteMetric keys to add as select options.

  // if siteMetrics not null then generate option elements from site meta keys.
  if (siteMetrics != null) {
    console.log("site metrics found. Filling select element based on meta keys");
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

    // todo: Not auto-filling the colouring options at the moment.
    // todo: This block auto fills the options according to valid number meta fields.
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
    this._div.innerHTML =
    `<div id="chart" style="display: none;">
    </div>
    <br />
    <button onclick="toggleGraph()">Toggle Graph</button>
    <label> Colour by: 
      <select id="meta-select" onChange="selectColorChange(this.value)" >
        <option selected value="elev">elev</option>
        <option selected value="mid_pH">Mid pH</option>
        <option selected value="mean_C_percent">Mean carbon concentration</option>
        <option value="prec_mean">Mean Precipitation</option>
        <option value="ave_logNconcen">Average log Nitrogen concentration</option>
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
//console.log(visControl);

function selectColorChange(e) {

  var metric = document.getElementById("meta-select").value;

  var metricColour = createColorRange(siteMetrics)

  console.log(siteMetrics);

  var circles = d3.selectAll(".enter")
    .transition()
    .duration(400)
      .attr("fill", function(d) {
        return metricColour(d.meta[metric])
      })
  console.log(circles);
  
}

/**
 * Toggles the datapoint visualization visibility.
 */
function toggleGraph() {
  //TODO: Add ability to reduce size by a factor.
  var graph = $('#chart').toggle('slow');

   //for minimizing the width based on window size.
   /*
    chart
    .transition()
        .duration(1000)
        .attr("width", function() {
            return (main.attr("width") / 3);
    });
    */
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

// Nick's grid & pie mode.
/*
if (mode == "grid") {
    var colors = ['#fee8c8', '#fdd49e', '#fdbb84', '#fc8d59', '#ef6548', '#d7301f', '#b30000', '#7f0000'];
    var shape = new L.PatternCircle({
        x: 5,
        y: 5,
        radius: 5,
        fill: true
    });
    var pattern = new L.Pattern({width: 15, height: 15});
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
    map.on('zoomend', function () {
        for (var i in window.circles) {
            window.circles[i].setOptions({
                width: map.getZoom() * 2
            });
        }
    });
}
*/

var hashComponents = decodeURIComponent(
  window.location.hash.replace('#', '')
).split(',');
//parse the water data
Papa.parse('Gavin_water_data_2010.tsv', {
  download: true,
  header: true,
  dynamicTyping: true,
  //once water data parsed, parse waterdata metadata and pass them both into handleResults.
  complete: function(results) {
    Papa.parse('Gavin_water_data_2010_metadata.tsv', {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: function(meta) {
        handleResults(results, meta);
        visControl.update(siteMetrics);
        console.log(siteMetrics);
      }
    });
  }
});