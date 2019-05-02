import * as d3 from "d3";
import * as _ from "lodash";
import { map, g, tooltip, x, y, GetLayerBySampleContextId } from "./index";
import { strongLine, strongHeader } from "./utility";
import { highlightLayer, disableHighlightLayer } from "./map";

function initPlotChart() {
  var margin = { top: 20, right: 30, bottom: 20, left: 150 },
    width = window.innerWidth * 0.55 - margin.left - margin.right,
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
      "Effective alpha diversity",
      "Proportion pathogens"
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
  // TODO: think of a better solution than making these variables global in index.js
  return { g, y, tooltip, x };
}

/**
 * Converts siteAggregates to an easier format for d3 use. Updates existing datapoints, enters new additional datapoints
 * @param {*} siteAggregates
 */
function updateGraph(siteAggregates) {
  console.log("updating d3 plot");
  // todo: see if I can make this into one class. Called in colorrange, select onchange function as well.
  let colourRange = createContinuousColorRange(siteAggregates);
  assignBiomeColors(siteAggregates);
  assignRandomCategoricalColor("environmental_feature_t2");

  updatePlotCircleColours();

  let colourMetric = getActivePlotMetric();
  // console.log(colourMetric);
  if (colourMetric == null) {
    colourMetric = "elevation";
  }

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
    plotData.push(
      makeNestableObject(
        siteId,
        site,
        "Proportion pathogens",
        site.pathogenicRichness
      )
    );
  }

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
        .attr("id", d => {
          // console.log(d);
          return "_" + d.siteId;
        })
        //.attr('cy', y(d.key))
        .attr("cy", function(circle) {
          // * If no jitter wanted then set jitter 0, 0.
          return y(circle.Metric) + randomRange(10, -10);
        })
        .attr("r", 7)
        .attr("opacity", 0.3)
        .attr("fill", function(d) {
          // TODO: this is duplicate code to the other coloring stuff
          let fillColour;
          if (getActivePlotMetric() + "_colour" in d.meta) {
            fillColour = d.meta[getActivePlotMetric() + "_colour"];
          } else {
            fillColour = colourRange(d.meta[colourMetric]);
          }
          return fillColour;
        })
        .on("mouseover", function(d) {
          d3.select(this.parentNode.parentNode)
            .selectAll("#" + "_" + d.siteId)
            .transition()
            .attr("r", 14)
            .duration(250);
          tooltip
            .transition()
            .style("opacity", 0.9)
            .duration(250);

          tooltip
            .html(
              strongLine(d.meta.sample_identifier) +
                strongHeader(d.Metric, d.value) +
                strongHeader(
                  getActivePlotMetric(),
                  d.meta[getActivePlotMetric()]
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
            .selectAll("#" + "_" + d.siteId)
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

/**
 * returns the current value on the plot metric selection.
 */
const getActivePlotMetric = () => {
  // console.log(window.sampleContextLookup);
  return document.getElementById("meta-select").value.toLowerCase();
};

/**
 * returns the current value of the plot coloring select element.
 */
const getActivePlotColorOption = () => {
  // console.log(document.getElementById("colour-scheme-select").value);
  return document.getElementById("colour-scheme-select").value;
};

/**
 * Calculates queries max and minimum site metrics.
 * Returns colour range with spectrum from minimum value metric to max value metric.
 * @param {*} metric
 * @param {*} siteAggregates
 */
function createContinuousColorRange(siteAggregates) {
  // TODO: not generating color ranges for certain metrics (mean c percent and nitrogen)
  // gets value from drop down and creates colour scale from the select option.
  const metric = getActivePlotMetric();
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
  console.log(metric + " plot min, max:", min, max);
  const colorScheme = getActivePlotColorOption();
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

function assignBiomeColors() {
  let colorLookup = {};
  for (const [key, sampleContext] of Object.entries(
    window.sampleContextLookup
  )) {
    let sample_biome1 = sampleContext.biome_t1;
    let sample_biome2 = sampleContext.biome_t2;
    // console.log(sample_biome2);
    if (!(sample_biome2 in colorLookup)) {
      // create color lookup entry
      if (sample_biome1 == "Terrestrial") {
        colorLookup[sample_biome2] = colourFactory("red");
      }
      if (sample_biome1 == "Aquatic") {
        colorLookup[sample_biome2] = colourFactory("blue");
      }
    }
    // value already created for that category, assign
    sampleContext.biome_t2_colour = colorLookup[sample_biome2];
  }
}

function assignRandomCategoricalColor(attr) {
  // add property to sample contexts
  // just making sure no duplicates
  let colorLookup = {};
  for (const [key, sampleContext] of Object.entries(
    window.sampleContextLookup
  )) {
    let attributeValue = sampleContext[attr];
    if (!(attributeValue in colorLookup)) {
      // make new
      let newColour = colourFactory("none");

      for (const [key, existingColour] of Object.entries(colorLookup)) {
        if (euclideanDistance(newColour, existingColour) < 120) {
          console.log("colour distance not enough, making new colour");
          newColour = colourFactory("none");
        }
      }
      colorLookup[attributeValue] = newColour;
    }
    sampleContext[attr + "_colour"] = colorLookup[attributeValue];
  }

  // make legend for the colours
  let legend = d3
    .select("chart")
    .data(colorLookup)
    .enter()
    .append("g")
    .attr("x", 20)
    .attr("y", 20)
    .attr("width", 20)
    .attr("height", 20)
    .style("fill", function(d) {
      var color = colorLookup.value;
    });
}

/**
 * Compares the distance between two colours, used for see if two colours are distinguishable
 */
const euclideanDistance = (c1, c2) => {
  let rSq = (c1.r - c2.r) * (c1.r - c2.r);
  let bSq = (c1.b - c2.b) * (c1.b - c2.b);
  let gSq = (c1.g - c2.g) * (c1.g - c2.g);
  let dist = Math.sqrt(rSq + bSq, gSq);
  // console.log(dist);
  return dist;
};

/**
 * Generates a semi-random colour.
 */
const colourFactory = hue => {
  // generates a random colour in the red or blue hue range depending on the string passed in
  switch (hue) {
    case "blue":
      return d3.rgb(
        0,
        Math.floor(Math.random() * 64),
        Math.floor(Math.random() * 216 + 40)
      );
    case "red":
      return d3.rgb(
        Math.floor(Math.random() * 216 + 40),
        Math.floor(Math.random() * 64 + 10),
        0
      );
    case "none":
      // completely random
      let colour = d3.rgb(
        Math.floor(Math.random() * 255),
        Math.floor(Math.random() * 255),
        Math.floor(Math.random() * 255)
      );
      return colour;
    default:
      break;
  }
  return color;
};

/**
 * Colors the circles based on the current value of the active metric and color scheme
 */
function updatePlotCircleColours() {
  let metric = getActivePlotMetric();
  var metricColour = createContinuousColorRange(window.siteAggregates);
  d3.selectAll(".enter")
    .transition()
    .duration(400)
    .attr("fill", function(d) {
      // TODO: this is duplicate code to when circles are first assigned colours, could be refactored
      let siteMeta = window.sampleContextLookup[d.siteId];
      if (metric + "_colour" in siteMeta) {
        return d3.color(siteMeta[metric + "_colour"]);
      } else {
        return metricColour(d.meta[metric]);
      }
    });
}

/**
 * Returns a random amount between upper and lower. For jittering the plots.
 */
const randomRange = (upper, lower) => {
  return Math.random() * (upper - lower) + lower;
};

export {
  updateGraph,
  initPlotChart,
  getActivePlotMetric,
  updatePlotCircleColours
};
