function round(x, dp) {
    var factor = Math.pow(10, dp);
    var tmp = x * factor;
    tmp = Math.round(tmp);
    return tmp / factor;
}

function checkFragment(f, species, site) {
    var ampIndex = f.indexOf("&");
    var ltIndex = f.indexOf("<");
    var gtIndex = f.indexOf(">");
    //Splits if ampersand or greater than found, recursively calls the split string.
    // When no &'s left return filters results
    if (ampIndex > 0) {
        var left = f.substring(0, ampIndex).trim();
        var right = f.substring(ampIndex + 1).trim();
        return checkFragment(left, species, site) && checkFragment(right, species, site);
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

//Called by handeResults
function getSiteWeights(filters) {
    var sites = {};
    n_points = 0;

    //warrick Clears grid layer values, gives them an index.
    var grid = MakeGrid(map, detailLevel);
    ClearGrid(grid);
    var cellSiteDict = MakeGridIndex(grid);
    var siteMetrics ={};

    //Site metrics: Adding dictionary of site metrics for calculations.
    var siteMetrics = {};

    //loop through parsed global result data.
    for (var i in window.results.data) {
        //e = contains species name + the bacteria's counts for all sites.
        var e = window.results.data[i];
        //Extracts the species name from "" field of window.results
        var species = e[""];
        //v for every field in the data row
        for (var k in e) {
            //Skip the bacteria name field, only process site lines.
            if (k != "") {
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
                        siteMetrics[k] = {
                          siteId: k,
                          abundance: e[k],
                          richness: 1
                        };
                    }
                    else {
                        siteMetrics[k].abundance += e[k];
                        siteMetrics[k].richness++;
                    }
                    //Warrick: Add to the corresponding grid as well.
                    var cellIndex = cellSiteDict[k];
                    grid.cells[cellIndex].count++;
                    grid.cells[cellIndex].value += e[k];

                    var cell = grid.cells[cellIndex];
                    if (cell.cellSpecies[species] == null) {
                        cell.cellSpecies[species] = {
                            count: 1,
                            value: e[k],
                        };
                    }
                    else {
                        cell.cellSpecies[species].count++;
                        cell.cellSpecies[species].value+=e[k];
                    }
                    //increment the n_points which is the total amount of sites the bacteria is found at.
                    n_points++;
                }
            }
        }
    }
    $("#numberResults").text(n_points);
    //console.log(grid);
    //console.log(sites);

    //todo: test calculate site metrics.
    calculateSiteMetrics(siteMetrics);

    //console.log(grid);
    //console.log(siteMetrics);
    //warrick: integrating filtered results with grid view.
    DrawGrid(grid);
    return sites;
}

//Called by handleResults
//Populates the select dropdown.
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
                metaStats[measure] = {"min": Infinity, "max": -Infinity, "sum": 0, "n": 0};
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
        options.push({"id": k, "text": k});
    }
    for (var k in data) {
        options.push({"id": k, "text": k, "title": "Number of points: " + data[k]});
    }
    for (var k in metaStats) {
        var mean = round(metaStats[k].sum / metaStats[k].n, 2);
        options.push({
            "id": k,
            "text": k,
            "title": "Range: " + round(metaStats[k].min, 2) + " - " + round(metaStats[k].max, 2) + ". Mean: " + mean
        });
    }
    return options;
}

//first called
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
    $("#filter").select2({
        placeholder: 'Type to filter by species and environment characteristics',
        //allows multiple tag filters at once.
        multiple: true,
        //allows clearing of the box instantly
        allowClear: true,
        //Gets all the data and metadata possible searches and pushes them to the select drop down.
        data: getFilterData(),
        //allows addition of custom tags to the options.
        tags: true,
        createTag: function (params) {
            //console.log(params);
            var term = $.trim(params.term);

            if (term === '') {
                return null;
            }

            return {
                id: term,
                text: term,
                newTag: true // add additional parameters
            }
        }
    });
    $("#filter").change(function () {
        window.location.hash = encodeURIComponent($(this).val());
        var filters = $(this).select2('data');
        //console.log(filters);
        //gets the results from the filters.
        //note: need to change it so siteweights are everywhere at a fixed lonlat.
        var siteWeights = getSiteWeights(filters);
        //console.log(siteWeights);
        var maxWeight = 0;
        for (var site in siteWeights) {
            var w = siteWeights[site]
            if (w > maxWeight) maxWeight = w;
        }
        //grid data layer creation
        var latlngs = [];
        for (var site in siteWeights) {
            var siteMeta = window.meta[site];
            latlngs.push([siteMeta.y, siteMeta.x, siteWeights[site]]);
        }

        //Where the results are generated. Currently in heatmap form.
        if (!window.heat) window.heat = L.heatLayer(latlngs);   //.addTo(map);
        heatLayerGroup.clearLayers();
        heatLayerGroup.addLayer(window.heat);
        window.heat.setOptions({"max": maxWeight * 1.5, "maxZoom": 6});
        window.heat.setLatLngs(latlngs);
        map.addLayer(heatLayerGroup);
    });
    if (hashComponents[0].length) {
        $("#filter").val(hashComponents);
    }
    $("#filter").trigger('change');
}

//CUSTOM START WARRICK
function MakeGrid(map, detailLevel) {
    //Hard coded bounds and offsets.
    start = [164.71222, -33.977509];
    var gridStart = start;
    var end = [178.858982, -49.663520];

    var hardBounds = L.latLngBounds(start, end);
    northWest = hardBounds.getNorthWest();
    northEast = hardBounds.getNorthEast();
    southWest = hardBounds.getSouthWest();
    southEast = hardBounds.getSouthEast();
    var latOffset = (northWest.lat - southWest.lat)/detailLevel;
    var lngOffset = (northEast.lng - northWest.lng)/detailLevel;
    //hard coded bounds and offsets end.

    var gridCells = [];
    for (var i = 0; i < detailLevel; i++)
    {
        for (var j=0; j < detailLevel; j++)
        {
            //create rectangle polygon.
            var topLeft = [start[0], start[1]];
            var topRight = [start[0] + lngOffset, start[1]];
            var bottomRight = [start[0] + lngOffset, start[1] - latOffset];
            var bottomLeft = [start[0], start[1] - latOffset];

            var cell = [topLeft, topRight, bottomRight, bottomLeft];
            var key = (i * detailLevel) + j;

            cell = {
                coordinates: cell,
                count: 0,
                value: 0,
                cellSpecies: {},
            };
            gridCells.push(cell);
            start = [start[0] + lngOffset, start[1]];
        }
        start = [start[0] - (lngOffset * detailLevel), start[1] - latOffset];
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
            var siteLat=  site.y;

            var lngDiff = Math.abs(siteLng) - Math.abs(gridStart[0]);
            var colIndex = Math.floor(lngDiff/lngOffset);

            var latDiff= Math.abs(siteLat) - Math.abs(gridStart[1]);
            var rowIndex = Math.floor(latDiff/latOffset);

            var siteCellIndex = rowIndex * detailLevel + colIndex;
            //console.log(siteCellIndex);

            siteCellDict[siteName] = siteCellIndex;
        }
        else {
            continue;
        }
    }
    //console.log(siteCellDict);
    return siteCellDict;
}

function DrawGrid(grid) {
    var cells = grid.cells;

    var gridMaxes = GetGridValues(cells);

    var maxCount = gridMaxes.count;
    var maxValue = gridMaxes.value;

    //console.log("max count", maxCount);
    var features = [];
    var gridCells = grid.cells
    //Generating geojson
    for (var cell in gridCells) {
        var gridCell = gridCells[cell];
        var weightedCount = gridCells[cell].count/maxCount;
        var weightedValue = gridCells[cell].value/maxValue;

        //Add cell statistics within popup.
        var popupContent = "<strong>Microorganism Occurences:</strong> " + gridCell.count + "<br />" +
            "<strong>Microorganism Amount: </strong>" + gridCell.value + "<br />" +
            "<strong>Lng:</strong>  " + gridCell.coordinates[0][0] + " to " + gridCell.coordinates[2][0] + "<br />" +
            "<strong>Lat:</strong>  " + gridCell.coordinates[0][1] + " to " + gridCell.coordinates[2][1] + "<br /><br />";

        var speciesInCell = gridCell.cellSpecies;
        //console.log(speciesInCell);
        for (species in speciesInCell) {
            popupContent += "<strong>" + species + "</strong>" + "<br />" +
                "<strong>Richness:</strong> " + speciesInCell[species].count + "<br />" +
                "<strong>Abundance:</strong> " + speciesInCell[species].value + "<br /><br />";
        }
        
        var cellPolygon = {
            "type": "Feature",
            "properties": {
                "index": cell,
                "weightedValue": weightedValue,
                "weightedCount": weightedCount,
                "speciesInCell": speciesInCell,
                "popupContent": popupContent,
            },
            "geometry": {
                "type":"Polygon",
                "coordinates":[gridCells[cell].coordinates]
            }
        };
        features.push(cellPolygon);
    }
    //console.log(features);

    var featureCollection = {
        "type": "FeatureCollection",
        "features": features
    };

    var gridCountLayer = L.geoJSON(featureCollection, {
        style: CellCountStyle,
        onEachFeature: onEachFeature
    });

    //gridLayer.addTo(map);
    gridCountLayerGroup.clearLayers();
    gridCountLayerGroup.addLayer(gridCountLayer);

    var gridValueLayer = L.geoJSON(featureCollection, {
        style: CellValueStyle,
        onEachFeature: onEachFeature
    });

    gridValueLayerGroup.clearLayers();
    gridValueLayerGroup.addLayer(gridValueLayer);
}

function onEachFeature(feature, layer) {
    if (feature.properties && feature.properties.popupContent) {
        var popup = layer.bindPopup(feature.properties.popupContent, {"maxWidth": 4000, "maxHeight": 150});
    }

    layer.on({
        //Disabled cell highlight because it has no purpose at the moment.
        //mouseover: highlightFeature,
        click: calculateCellMetrics,
    });
}

function CellValueStyle(feature) {
    return {
        "fillColor": GetColor(feature.properties.weightedValue),
        "weight": 1,
        "opacity": GetOpacity(feature.properties.weightedValue),
        "color": '#ffffff',
        "fillOpacity": GetOpacity(feature.properties.weightedValue)
    }
}

function CellCountStyle (feature) {
    return {
        "fillColor": GetColor(feature.properties.weightedCount),
        "weight": 1,
        "opacity": GetOpacity(feature.properties.weightedCount),
        "color": '#ffffff',
        "fillOpacity": GetOpacity(feature.properties.weightedCount)
    };
}

function GetGridValues(cells) {
    //console.log(cells);
    var maxCount = 0;
    var maxValue = 0;
    var totalCount = 0;
    for (var cell in cells) {
        if (cells[cell].count > maxCount) {
            maxCount = cells[cell].count;
        }
        if (cells[cell].value > maxValue) {
            maxValue = cells[cell].value;
        }
        totalCount += cells[cell].count;
    }
    //console.log("max count ", maxCount, "max value ", maxValue, "total count ", totalCount);

    var gridMaxes = {
        count: maxCount,
        value: maxValue,
    }
    return gridMaxes;
}

function GetOpacity(d){
    return d > .0 ? .8 : .2;
}

function GetColor(d) {
    return d > .9 ? '#800026' :
        d > .75  ? '#BD0026' :
            d > .6  ? '#E31A1C' :
                d > .45  ? '#FC4E2A' :
                    d > .3   ? '#FD8D3C' :
                        d > .15   ? '#FEB24C' :
                            d > .0   ? '#FED976' :
                                '#fffbd2';
}

//TESTING GRID INFO
function highlightFeature(e) {
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

function calculateCellMetrics(e){
    var layer = e.target;

    console.log("index is " + layer.feature.properties.index);

    var speciesInCell = layer.feature.properties.speciesInCell;

    var speciesAmount = Object.keys(speciesInCell).length;
    console.log(speciesAmount);

    //get total value for shannon index calculation
    var totalValue = 0;
    for (var species in speciesInCell) {
        var speciesData= speciesInCell[species]
        totalValue+= speciesData.value;
    }
    console.log(totalValue);

    //calculate metrics for species within the cell
    for (var species in speciesInCell) {
        speciesData = speciesInCell[species];
        var speciesShannonIndex = -1 * ((speciesData.value/totalValue) * Math.log(speciesData.value/totalValue));
        var speciesRichness = speciesData.count;
        var speciesAbundance = speciesData.value;
        //console.log(species, speciesShannonIndex, speciesRichness, speciesAbundance);
    }
}

//holds the site metrics for visualization
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
        var shannonDiversity = -1 * (siteValue/totalValue) * Math.log(siteValue/totalValue);
        siteMetrics[site].shannonDiversity = shannonDiversity;
    }
    //console.log(siteMetrics);

    //Create visualization
    updateGraph(siteMetrics);

}

function updateGraph(siteMetrics) {

    console.log("Running update graph");

    var dataSet = [];
    for (var site in siteMetrics) {
        var siteMetric = siteMetrics[site];
        var siteRichness = {
            "siteId": siteMetric.siteId,
            "Metric": "OTU richness",
            "value": siteMetric.richness,
        }
        dataSet.push(siteRichness);
        
        var siteShannon = {
            "siteId": siteMetric.siteId,
            "Metric": "Shannon diversity",
            "value": siteMetric.shannonDiversity,
        }
        dataSet.push(siteShannon);
        
        var siteAbundance = {
            "siteId": siteMetric.siteId,
            "Metric": "Sequence abundance",
            "value": siteMetric.abundance,
        }
        dataSet.push(siteAbundance);
    }
    //console.log(dataSet);

    var nestedData = d3.nest()
        .key(function(d) {
            return d.Metric;
        })
        .entries(dataSet);
    console.log(nestedData);

    /*
    var update = g.selectAll(".datapoints")
        .data(nestedData[0].values);

    var remove = g.selectAll(".datapoints")
        .data(nestedData[0].values)
        .exit()
        .remove();

    var enter = update.enter()
        .append("g")
        .attr("class", "datapoints")
        .merge(update)
    */

    //selects the nested values arrays
    /*
    var updateSel = d3.selectAll(".datapoints")
        .data(nestedData, function(d) {
            return d.values;
        });
    */

    /* removes excess
    updateSel.exit()
        .remove();
    */

    //TRYINGIGNGINGIN
    console.log(nestedData);

    //within the svg, within the g tags, select the class datapoints
    var update = g.selectAll(".datapoints")
        .data(nestedData, function (d) {
            return d.values;
        });

    var enter = update.enter()
        .append("g")
        .attr("class", "datapoints")
        .merge(update)
        .each(function (d) {    //loop through each data group
            var min = d3.min(d.values, function (d) {
                return d.value;
            });
            var max = d3.max(d.values, function (d) {
                return d.value;
            });
            console.log(min, max);

            var circle = d3.select(this).selectAll("circle")
                .data(d.values, function (d) {
                    return d.siteId;
                });

            circle.exit().remove();

            //add new
            circle.enter()
                .append("circle")
                .attr("class", "enter")
                .attr("id", d => d.siteId)
                .attr("cy", y(d.key))
                .attr("r", 5)
                .attr("opacity", 0.2)
                .on("mouseover", function (d) {
                    var thing = d3.select(this.parentNode.parentNode).selectAll("#" + d.siteId)
                        .transition()
                        .attr("r", 20)
                        .duration(250)
                })
                .on("mouseout", function (d) {
                    d3.select(this.parentNode.parentNode).selectAll("#" + d.siteId)
                        .transition()
                        .attr("r", 5)
                        .duration(250)
                })
                .merge(circle)
                .transition()
                    .duration(1500)
                    .attr("cx", function (d) {
                        var cx = (d.value - min) / (max - min);
                        return x(cx);
                    })
        })
    var remove = update.exit().remove();
}

function drawGraph() {
    var margin = {top: 20, right: 30, bottom: 20, left: 160},
        width = 960 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    var chart = d3.select("#chart").append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom);

    // Define area where the graph will be drawn
    var main = chart.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("width", width)
        .attr("height", height)
        .attr("id", "main");

    var x = d3.scaleLinear()
        .domain([0, 1])  // the range of the values to plot
        .range([0, width]);  // the pixel range of the x-axis
    var xTicks = [0, 1];
    var xLabels = ["Minimum", "Maximum"];
    var xAxis = d3.axisBottom()
        .scale(x)
        .tickValues([0, 1])
        .tickFormat(function(d,i) { return xLabels[i] });

    var y = d3.scalePoint()
        //.domain(nested.map( function(d) { return d.key }) )
        .domain(["OTU richness","Sequence abundance","Shannon diversity","Effective alpha diversity","Orders"])
        .range([0, height - 20])
        .padding(0.1);
    var yAxis = d3.axisLeft()
        .scale(y);
    
    // Draw the x and y axes
    main.append("g")
        .attr("transform", "translate(0," + height + ")")  // Position at bottom of chart
        .attr("class", "main axis")
        .attr("id", "xAxis")
        .call(xAxis);
    
    main.append("g")
        .attr("transform", "translate(0,0)")  // Position at left of chart
        .attr("class", "main axis")
        .attr("id", "yAxis")
        .call(yAxis);

    // Draw the graph object holding the data points
    var g = main.append("svg:g")
        .attr("id","datapoints"); 
}

//generating the map
var tileLayer = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    minZoom: 6,
});
var map = L.map('map', {
    zoomSnap: 0.25,
    zoomDelta: 0.25,
    layers: tileLayer
}).setView([-41.235726, 172.5118422], 6);
var bounds = map.getBounds();
bounds._northEast.lat += 10;
bounds._northEast.lng += 10;
bounds._southWest.lat -= 10;
bounds._southWest.lng -= 10;
map.setMaxBounds(bounds);
//Defines how the proj4 function is to convert.
//in this case proj4 is being set up to convert longlat to cartesian.
proj4.defs("EPSG:2193", "+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

//gets the params from the search bar
var params = new URLSearchParams(window.location.search);
var mode = params.get("mode");
window.circles = [];

var detailLevel = 20;
//warrick map additions
var grid = MakeGrid(map, detailLevel);

//shows the scale of the map
var scaleIndicator = L.control.scale().addTo(map);

//instantiating empty layer control layers to be filled later
var gridCountLayerGroup = L.layerGroup();
var gridValueLayerGroup = L.layerGroup();
var heatLayerGroup = L.layerGroup();
var baseMaps = {
    "Base": tileLayer,
};
var overlays = {
    "Grid: Abundance": gridValueLayerGroup,
    "Grid: Richness": gridCountLayerGroup,
    "Heat: Abundance": heatLayerGroup,
};
var layerMenu = L.control.layers(
    baseMaps,
    overlays,
    {
        "position": "bottomleft",
        "hideSingleBase": true,
        "sortLayers": true,
        "collapsed": false,
    }).addTo(map);

//Adding leaflet slider to map for grip control.
var slider = L.control.slider(function(value) {
        detailLevel = value;
        $("#filter").trigger('change');
    },
    {id: slider,
        min: 1,
        max: 100,
        value: 10,
        logo: 'Grid',
        orientation: 'horiztonal',
        position: 'bottomleft',
    });
slider.addTo(map);

//Adding custom control for Andrew's Visualization Copy.
var info = L.control({position: 'bottomright'});

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info'); //creates div with class "info"
    this.update();
    return this._div;
};

info.update = function(siteValues) {
    this._div.innerHTML = '<div id="chart"></div>';
};

info.addTo(map);

//adding graph
var margin = {top: 20, right: 30, bottom: 20, left: 160},
        width = 960 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

var chart = d3.select("#chart").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom);

// Define area where the graph will be drawn
var main = chart.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .attr("width", width)
    .attr("height", height)
    .attr("id", "main");

var x = d3.scaleLinear()
    .domain([0, 1])  // the range of the values to plot
    .range([0, width]);  // the pixel range of the x-axis
var xTicks = [0, 1];
var xLabels = ["Minimum", "Maximum"];
var xAxis = d3.axisBottom()
    .scale(x)
    .tickValues([0, 1])
    .tickFormat(function(d,i) { return xLabels[i] });

var y = d3.scalePoint()
    //.domain(nested.map( function(d) { return d.key }) )
    .domain(["OTU richness","Sequence abundance","Shannon diversity","Effective alpha diversity","Orders"])
    .range([0, height - 20])
    .padding(0.1);
var yAxis = d3.axisLeft()
    .scale(y);

// Draw the x and y axes
main.append("g")
    .attr("transform", "translate(0," + height + ")")  // Position at bottom of chart
    .attr("class", "main axis")
    .attr("id", "xAxis")
    .call(xAxis);

main.append("g")
    .attr("transform", "translate(0,0)")  // Position at left of chart
    .attr("class", "main axis")
    .attr("id", "yAxis")
    .call(yAxis);

// Draw the graph object holding the data points
var g = main.append("svg:g")
    .attr("id","datapoints"); 

//Warrick test: Adding sidebar for Andrew's Visualization
//var sidebar = L.control.sidebar('sidebar').addTo(map);

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

var hashComponents = decodeURIComponent(window.location.hash.replace("#", "")).split(",");
//parse the water data
Papa.parse("Gavin_water_data_2010.tsv", {
    download: true,
    header: true,
    dynamicTyping: true,
    //once water data parsed, parse waterdata metadata and pass them both into handleResults.
    complete: function (results) {
        Papa.parse("Gavin_water_data_2010_metadata.tsv", {
            download: true,
            header: true,
            dynamicTyping: true,
            complete: function (meta) {
                handleResults(results, meta);
            }
        });
    }
});
