import * as d3 from "d3";
import * as _ from "lodash";
import { map, g, tooltip, x, y, GetLayerBySampleContextId } from "./index";
import { strongLine, strongHeader } from "./utility";
import { highlightLayer, disableHighlightLayer } from "./map";

function initPlotChart() {
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
    .domain(["OTU richness", "Sequence abundance", "Effective alpha diversity"])
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
/**
 * Converts siteAggregates to an easier format for d3 use. Updates existing datapoints, enters new additional datapoints
 * @param {*} siteAggregates
 */
function updateGraph(siteAggregates) {
  // todo: see if I can make this into one class. Called in colorrange, select onchange function as well.
  let metricColour = createContinuousColorRange(siteAggregates);
  let categoricalColourMetric = assignBiomeColors(siteAggregates);
  let colourMetric = getActivePlotMetric();
  // console.log(colourMetric);
  if (colourMetric == null) {
    colourMetric == "elev";
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
        .attr("id", d => d.meta.site)
        //.attr('cy', y(d.key))
        .attr("cy", function(circle) {
          // * If no jitter wanted then set jitter 0, 0.
          return y(circle.Metric) + randomRange(10, -10);
        })
        .attr("r", 7)
        .attr("opacity", 0.3)
        .attr("fill", function(d) {
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
  console.log(metric + " visualization plot min, max:", min, max);
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
  const metric = getActivePlotMetric();

  // calculate how many tier 1s.
  let colorLookup = {};

  for (let key in window.sampleContextLookup) {
    let sampleContext = sampleContextLookup[key];
    let sample_biome_t1 = sampleContext.biome_t1;
    let sample_biome_t2 = sampleContext.biome_t2;
    // console.log(sample_biome_t2);
    // console.log(sample_biome_t1);

    if (_.isUndefined(colorLookup[sample_biome_t2])) {
      if (sample_biome_t1.toLowerCase() == "terrestrial") {
        // console.log("aquatic colour scheme");
        let new_color = getRandomColor("red");
        if (_.isNull(colorLookup[sample_biome_t2])) {
          colorLookup[sample_biome_t2] = new_color;
        } else {
          sampleContext.biome_t2_color = new_color;
        }
      }
      if (sample_biome_t1.toLowerCase() == "aquatic") {
        // console.log("aquatic colour scheme");
        let new_color = getRandomColor("blue");
        if (_.isNull(colorLookup[sample_biome_t2])) {
          colorLookup[sample_biome_t2] = new_color;
        } else {
          sampleContext.biome_t2_color = new_color;
        }
      }
    }
  }

  console.log(colorLookup);
  console.log(window.sampleContextLookup);

  // console.log(idk.length);

  // calculate how many tier 2.

  // hard code for terrestial and aquatic

  // grey for unknown

  console.log(metric);
}

const getRandomColor = hue => {
  switch (hue) {
    case "blue":
      return d3.rgb(
        0,
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256)
      );
    case "red":
      return d3.rgb(
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        0
      );
    default:
      break;
  }
  return color;
};

/**
 * Returns a random amount between upper and lower. For jittering the plots.
 */
const randomRange = (upper, lower) => {
  return Math.random() * (upper - lower) + lower;
};

export {
  updateGraph,
  initPlotChart,
  createContinuousColorRange as createColorRange,
  getActivePlotMetric
};
