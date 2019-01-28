!function(t){var e={};function n(o){if(e[o])return e[o].exports;var a=e[o]={i:o,l:!1,exports:{}};return t[o].call(a.exports,a,a.exports,n),a.l=!0,a.exports}n.m=t,n.c=e,n.d=function(t,e,o){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:o})},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var o=Object.create(null);if(n.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var a in t)n.d(o,a,function(e){return t[e]}.bind(null,a));return o},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n(n.s=0)}([function(t,e){window.circles=[],window.contextTags=[],window.siteAggregates={},window.sampleContextLookup={};const n="http://localhost:8000/edna/api/v1.0/",o="https://edna.nectar.auckland.ac.nz/edna/api/",a={filtered_abundance:o+"abundance?otu=",filtered_meta:o+"metadata?term=",ordered_sampleotu:o+"sample_otu_ordered",test_sample_otu_pk:n+"abundance?",dev_contextual_id:n+"metadata?id=",filter_suggestions:n+"filter-options?",otu_code_by_id:n+"otu/?id="};const i=t=>"<strong>"+t+"</strong><br />",r=(t,e)=>"<strong>"+t+": </strong> "+e+"<br />";function l(){let t=$("#select-contextual").select2("data"),e=$("#select-taxonomic").select2("data"),n=[];for(let t in e){let o=e[t].id.split(",").join("+");n.push(o)}let o=a.test_sample_otu_pk;if(o+="otu="+n.join("&otu="),t.length>0){o+=t.map(t=>{let e=t.text;return"&q="+(e=(e=(e=e.replace("<","$lt")).replace(">","$gt")).replace("=","$eq"))}).join("")}document.getElementById("endemic-checkbox").checked&&(o+="&endemic=true"),"or"==document.getElementById("select-operator").value?o+="&operator=union":o+="&operator=intersection",fetch(o).then(t=>{t.json().then(t=>{!function(t){let e=t.sample_otu_data,n=t.sample_contextual_data;$("#numberResults").text(e.length);for(let t in n){let e=n[t];window.sampleContextLookup[e.id]=e}let o=function(t){let e={};for(let n in t){let o=t[n],a=o[0],i=o[1],r=o[2];i in e||(e[i]={abundance:0,richness:0,otus:{}}),siteAgg=e[i],siteAgg.abundance+=r,a in siteAgg.otus||(siteAgg.otus[a]={abundance:0,count:0},siteAgg.richness++,siteAgg.otus[a].abundance+=r,siteAgg.otus[a].count++)}return e}(e),a=(function(t){let e=[],n=0;for(let o in t){let a=window.sampleContextLookup[o],i=t[o].abundance;n<i&&(n=i),e.push([a.y,a.x,i])}let o=L.heatLayer(e);_.clearLayers(),_.addLayer(o),o.setOptions({max:1.5*n,maxZoom:6}),o.setLatLngs(e),m.addLayer(_)}(o),function(t){let e=function(t){let e=0,n=0,o=0;for(let a in t){let i=t[a];i.abundance>e&&(e=i.abundance),i.richness>n&&(n=i.richness),i.siteCount>o&&(o=i.siteCount)}return{abundance:e,richness:n,sites:o}}(t),n={type:"FeatureCollection",features:[]};for(let o in t){let a=t[o];const i=a.richness/e.richness,r=a.abundance/e.abundance,l=a.siteCount/e.sites;n.features.push({type:"Feature",properties:{id:o,weightedAbundance:r,weightedRichness:i,weightedSites:l,sites:a.sites,otus:a.otus,coordinates:a.coordinates},geometry:{type:"Polygon",coordinates:[a.coordinates]}})}return n}(function(t){d(b),console.log("aggregate by cell");let e=[164.71222,-33.977509];const n=L.latLngBounds(e,[178.858982,-49.66352]),o=n.getNorthWest(),a=n.getNorthEast(),i=n.getSouthWest(),r=(o.lat-i.lat)/b,l=(a.lng-o.lng)/b;let s={};for(let n in t){let o=t[n],a=window.sampleContextLookup[n],i=a.x,d=a.y,p=u(i,d,e,l,r);p in s||(s[p]={abundance:0,richness:0,sites:[],otus:{},coordinates:c(p,e,l,r)});let g=s[p];g.abundance+=o.abundance,g.sites.push(n);for(let t in o.otus){let e=o.otus[t];t in g.otus||(g.otus[t]={abundance:0,count:0},g.richness++);let n=g.otus[t];n.abundance+=e.abundance,n.count+=e.count}for(let t in s){let e=s[t];e.siteCount=e.sites.length}}return s;function c(t,e,n,o){let a=parseInt(t),i=Math.floor(a/b),r=a%b,l=e[0]+o*r,s=e[1]-n*i;return[[l,s],[l+o,s],[l+o,s-n],[l,s-n]]}function u(t,e,n,o,a){let i=Math.abs(t)-Math.abs(n[0]),r=Math.floor(i/a),l=Math.abs(e)-Math.abs(n[1]),s=Math.floor(l/o),c=s*b+r;return c}}(o))),l=u(a,"weightedAbundance",w),c=u(a,"weightedRichness",v);o=function(t){for(const[e,n]of Object.entries(t)){n.shannonDiversity=0;for(const[t,e]of Object.entries(n.otus)){let t=e.abundance;n.shannonDiversity+=t/n.abundance*Math.log(t/n.abundance)}n.shannonDiversity*=-1,n.effectiveAlpha=Math.exp(n.shannonDiversity)}return t}(o),window.siteAggregates=o,s(l),s(c),function(t){var e=g(t),n=document.getElementById("meta-select").value;function o(t,e,n,o){return{siteId:t,Metric:n,value:o,meta:sampleContextLookup[t]}}var a=[];for(const[e,n]of Object.entries(t))a.push(o(e,n,"OTU richness",n.richness)),a.push(o(e,n,"Shannon entropy",n.shannonDiversity)),a.push(o(e,n,"Sequence abundance",n.abundance)),a.push(o(e,n,"Effective alpha diversity",n.effectiveAlpha));var l=d3.nest().key(function(t){return t.Metric}).entries(a),s=T.selectAll(".datapoints").data(l,function(t){return t.values});s.enter().append("g").attr("class","datapoints").merge(s).each(function(t){const o=d3.min(t.values,function(t){return t.value}),a=d3.max(t.values,function(t){return t.value}),l=d3.mean(t.values,function(t){return t.value});var s=d3.select(this).selectAll("circle").data(t.values,function(t){return t.siteId});s.exit().remove(),s.enter().append("circle").attr("class","enter").attr("id",t=>t.meta.site).attr("cy",function(t){return O(t.Metric)+f(10,-10)}).attr("r",7).attr("opacity",.3).attr("fill",function(t){return e(t.meta[n])}).on("mouseover",function(t){d3.select(this.parentNode.parentNode).selectAll("#"+t.meta.site).transition().attr("r",14).duration(250),j.transition().style("opacity",.9).duration(250),j.html(i(t.meta.site)+r(t.Metric,t.value)+r(document.getElementById("meta-select").value,t.meta.elev)).style("left",d3.event.pageX+"px").style("top",d3.event.pageY-10+"px").style("opacity",.9).style("z-index",1e3);let e=S(t.siteId);null!=e&&void 0!==e&&p(e)}).on("mouseout",function(t){d3.select(this.parentNode.parentNode).selectAll("#"+t.meta.site).transition().attr("r",7).duration(250),j.transition().style("opacity",0).style("z-index",1e3).duration(250);let e=S(t.siteId);null!=e&&void 0!==e&&function(t){var e=t.feature.properties;t.setStyle({weight:1,opacity:(e.hasSamples,.15)})}(e)}).on("click",function(t){let e=S(t.siteId);if(null!=e&&void 0!==e){let t=e.getBounds();m.flyToBounds(t,{padding:[300,300]})}}).merge(s).transition().duration(1500).attr("cx",function(t){var e;return e=a==o?0:(t.value-o)/(a-o),D(e)}),d3.select(this).append("circle").attr("class","enter-mean").attr("cy",O(t.key)).attr("r",15).style("stroke","grey").style("stroke-width",2).style("fill","none").style("opacity",0).transition().duration(1500).style("opacity",.75).attr("cx",D((l-o)/(a-o)))}),s.exit().remove()}(o)}(t)})})}function s(t){t.eachLayer(function(t){let e=L.stamp(t),n=(((t||{}).feature||{}).properties||{}).sites;void 0!==n&&n.forEach(t=>{let n=window.sampleContextLookup[t];null==n.leafletIds&&(n.leafletIds=[]),n.leafletIds.push(e)})})}function c(t,e=null){null!=e&&void 0!==e&&e.otu_names.forEach(t=>{window.otuLookup[t.id]=t.code});let n=r("Cell Richness",t.weightedRichness)+r("Cell Abundance",t.weightedAbundance)+r("Cell Site Count",t.sites.length)+r("Longitude",t.coordinates[0][0]+" to "+t.coordinates[2][0])+r("Latitude",t.coordinates[0][1]+" to "+t.coordinates[2][1])+"<br />";n+=i("Sites in cell: ")+"<ul>";for(let e in t.sites)siteId=t.sites[e],n+="<li>"+window.sampleContextLookup[siteId].site+"</li>";n+="</ul><br />";for(let e in t.otus)n+=i(window.otuLookup[e])+r("Abundance in cell",t.otus[e].abundance)+r("Frequency in cell",t.otus[e].count)+"<br />";return n}function u(t,e,n){const o=.15,i="#000000",r=t=>t>0?.8:.2,l=t=>t>.9?"#800026":t>.8?"#BD0026":t>.7?"#E31A1C":t>.6?"#FC4E2A":t>.5?"#FD8D3C":t>.4?"#FEB24C":t>.3?"#FED976":t>.2?"#FFEDA0":t>0?"#FFFFCC":"#9ECAE1",s=L.geoJSON(t,{style:function(t){return{fillColor:l(t.properties[e]),weight:1,opacity:o,color:i,fillOpacity:r(t.properties[e])}},onEachFeature:function(t,e){e.bindPopup("Loading...",{maxWidth:4e3,maxHeight:150}),e.on({mouseover:function(t){t.target.feature.properties.sites.forEach(t=>{let e=window.sampleContextLookup[t].site,n=d3.selectAll("#"+e);n.transition().duration(250).attr("r",14)})},mouseout:function(t){t.target.feature.properties.sites.forEach(t=>{let e=window.sampleContextLookup[t].site,n=d3.selectAll("#"+e);n.transition().duration(250).attr("r",7)})},click:function(t){var e=t.target;let n=e.getPopup();n.bindPopup(function(t,e){let n=[];for(const[e]of Object.entries(t.feature.properties.otus))e in window.otuLookup||n.push(e);n.length>0?(f_url=a.otu_code_by_id+n.join("&id="),console.log(f_url),fetch(f_url).then(n=>{n.json().then(n=>{console.log(n),e.setContent(c(t.feature.properties,n))})})):e.setContent(c(t.feature.properties))}(e,n))},select:function(t){t.setStyle({weight:5,opacity:.9}),L.Browser.ie||L.Browser.opera||L.Browser.edge||t.bringToFront()}})}});return n.clearLayers(),n.addLayer(s),s}function d(t){const e=[164.71222,-33.977509],n=L.latLngBounds(e,[178.858982,-49.66352]);northWest=n.getNorthWest(),northEast=n.getNorthEast(),southWest=n.getSouthWest(),southEast=n.getSouthEast();const o=(northWest.lat-southWest.lat)/t,a=(northEast.lng-northWest.lng)/t;let i=[],r=e;for(let e=0;e<t;e++){for(let e=0;e<t;e++){const t=l();i.push(t),r=[r[0]+a,r[1]]}r=[r[0]-a*t,r[1]-o]}return{start:e,lngOffset:a,latOffset:o,detailLevel:t,cells:i};function l(){let t=[[r[0],r[1]],[r[0]+a,r[1]],[r[0]+a,r[1]-o],[r[0],r[1]-o]];return t={coordinates:t,abundance:0,richness:0,cellSpecies:{},cellSites:[],hasSamples:!1}}}function p(t){t.setStyle({weight:5,opacity:.9}),L.Browser.ie||L.Browser.opera||L.Browser.edge||t.bringToFront()}function g(t){const e=document.getElementById("meta-select").value,n=[];for(var o in t)n.push(window.sampleContextLookup[o]);const a=d3.min(n,function(t){return t[e]}),i=d3.max(n,function(t){return t[e]});console.log("visualization plot min, max:",a,i);let r=[];switch(document.getElementById("colour-scheme-select").value){case"sequential":r=["blue","orange"];break;case"diverging":r=["#2c7bb6","#d7191c"];break;default:r=["grey","black"]}return d3.scaleLinear().interpolate(d3.interpolateRgb).domain([a,i]).range(r)}let f=(t,e)=>Math.random()*(t-e)+e;var h=L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",{attribution:'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',subdomains:"abcd",maxZoom:19,minZoom:5.75}),m=L.map("map",{zoomSnap:.25,zoomDelta:.25,layers:h,fullscreenControl:!0}).setView([-41.235726,172.5118422],5.75),y=m.getBounds();y._northEast.lat+=10,y._northEast.lng+=10,y._southWest.lat-=10,y._southWest.lng-=10,m.setMaxBounds(y),proj4.defs("EPSG:2193","+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");new URLSearchParams(window.location.search).get("mode");var b=60,v=(d(b),L.control.scale().addTo(m),L.layerGroup()),w=L.layerGroup(),x=L.layerGroup(),_=L.layerGroup(),C={Base:h},k={"Grid: Abundance":w,"Grid: Richness":v,"Heat: Abundance":_,"Grid: Site Count":x},E=L.control.layers(C,k,{position:"bottomleft",hideSingleBase:!0,sortLayers:!0,collapsed:!1}).addTo(m),A=L.control({position:"bottomleft"});function S(t){let e,n=window.sampleContextLookup[t].leafletIds;return m.eachLayer(function(t){n.includes(t._leaflet_id)&&(e=t)}),e}A.onAdd=(t=>(this._div=L.DomUtil.create("div","info"),this._div.innerHTML='<label for="grid-input">Grid Resolution: </label><input id="grid-input" placeholder="Type value" type="number" onchange="changeSliderValue(this.value)"/>',this._div)),A.addTo(m);var B=L.control.slider(function(t){b=t,$("#select-taxonomic").trigger("change")},{id:B,min:1,size:"300px",max:1500,step:1,value:b,logo:"Grid",increment:!0,orientation:"horiztonal",position:"bottomleft",syncSlider:!0});B.addTo(m);const M=L.control({position:"bottomright"});function I(t){var e=g(window.siteAggregates);d3.selectAll(".enter").transition().duration(400).attr("fill",function(n){return e(n.meta[t])})}M.onAdd=function(){return this._div=L.DomUtil.create("div","info"),this._div.innerHTML='<div id="chart" style="display:none;">\n  </div>\n  <br />\n  <button id = "graph-button" >Toggle Graph</button>\n  <label> Colour by: \n    <select id="meta-select" >\n      <option selected value="elev">elev</option>\n      <option value="mid_ph">Mid pH</option>\n      <option value="mean_C_percent">Mean carbon concentration</option>\n      <option value="prec_mean">Mean Precipitation</option>\n      <option value="ave_logNconcen">Average log Nitrogen concentration</option>\n      <option value="water2">Water 2</option>\n      <option value="freshwater">Freshwater</option>\n    </select>\n  </label>\n  <label> Colour type: \n    <select id="colour-scheme-select">\n      <option selected value="sequential">Sequential</option>\n      <option value="diverging">Diverging</option>\n    </select>\n  </label>',this._div},M.addTo(m);const{g:T,y:O,tooltip:j,x:D}=function(){var t={top:20,right:30,bottom:20,left:160},e=.75*window.innerWidth-t.left-t.right,n=.35*window.innerHeight-t.top-t.bottom,o=d3.select("#chart").append("svg").attr("width",e+t.right+t.left).attr("height",n+t.top+t.bottom).append("g").attr("transform","translate("+t.left+","+t.top+")").attr("width",e).attr("height",n).attr("id","main"),a=d3.scaleLinear().domain([0,1]).range([0,e]),i=["Minimum","Maximum"],r=d3.axisBottom().scale(a).tickValues([0,1]).tickFormat(function(t,e){return i[e]}),l=d3.scalePoint().domain(["OTU richness","Sequence abundance","Shannon entropy","Effective alpha diversity","Orders"]).range([0,n-20]).padding(.1),s=d3.axisLeft().scale(l);o.append("g").attr("transform","translate(0,"+n+")").attr("class","main axis").attr("id","xAxis").call(r),o.append("g").attr("transform","translate(0,0)").attr("class","main axis").attr("id","yAxis").call(s);var c=o.append("svg:g").attr("id","datapoints"),u=d3.select("#map").append("div").attr("class","tooltip").style("opacity",0);return{g:c,y:l,tooltip:u,x:a}}();decodeURIComponent(window.location.hash.replace("#","")).split(",");function F(t){let e=t.data.context_options.map(t=>({id:t,text:t}));$("#select-contextual").select2({placeholder:"Search by sample contextual metadata",multiple:!0,allowClear:!0,width:"100%",tags:!0,data:e,tokenSeparators:[","," "],createTag:function(t){let e=$.trim(t.term);if(""===e)return null;let n={id:e,text:e,newTag:!0};return window.contextTags.push(n),n}}),$("#select-contextual").change(function(){l()})}document.getElementById("select-operator").onchange=function(){l()},function(){let t=$("#select-taxonomic").select2({placeholder:"Type to filter by classification and metadata",multiple:!0,allowClear:!0,width:"100%",minimumInputLength:1,tags:!0,ajax:{url:a.filter_suggestions,delay:250,data:function(t){return{q:t.term,page:t.page||1,page_size:t.page_size||50}},processResults:function(t,e){e.page=e.page||1,e.page_size=e.page_size||50,console.log(e);let n=t.data,o=n.total_results,a=0;null!=window.otuLookup&&void 0!==window.otuLookup||(window.otuLookup={});let i=n.taxonomy_options.map(t=>{let e={id:t[1],text:t[0],group:"taxon"};return a++,window.otuLookup[t[2]]=t[0],e}),r=(n.context_options.map(t=>(option={id:a,text:t,group:"context"},a++,option)),e.page*e.page_size<o),l=window.taxonTags;return groupedOptions={results:[{text:"Custom",children:l},{text:"Taxonomic",children:i}],pagination:{more:r}},console.log(groupedOptions),groupedOptions}},createTag:function(t){let e=$.trim(t.term);return""===e?null:{id:e,text:e,newTag:!0}}});$("#select-taxonomic").change(function(){l()})}(),document.getElementById("endemic-checkbox").onchange=function(){l()},document.getElementById("search-button").onclick=function(){l()},document.getElementById("graph-button").onclick=function(){$("#chart").toggle("slow")},document.getElementById("meta-select").onchange=function(){I(this.value)},document.getElementById("colour-scheme-select").onchange=function(){I(this.value)},function(){let t=L.control({position:"bottomleft"});t.onAdd=(t=>{let e=L.DomUtil.create("div","display-controls-root");e.id="display-controls-root",e.className="info leaflet-control";let n=document.createElement("div");n.id="display-controls-togglable",n.className="display-controls-togglable",e.appendChild(n),n.appendChild(B.getContainer()),n.appendChild(A.getContainer()),n.appendChild(E.getContainer());let o=L.DomUtil.create("button","display-controls-root-button");return o.id="display-controls-root-button",o.innerHTML="Display Settings",o.className="info leaflet-control",e.appendChild(o),e}),t.addTo(m)}(),document.getElementById("display-controls-root-button").onclick=function(){$("#display-controls-togglable").toggle("slow")};let z=a.filter_suggestions+"q=&page=1&page_size=200";fetch(z).then(t=>{t.json().then(F)})}]);