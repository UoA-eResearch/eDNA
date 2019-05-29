// import s
import * as $ from "jquery";
import { API_URLS } from "./constants";
import { createAggregateUrl } from "./index";
import { request } from "http";

function initContextSelect(responseData) {
  let excludedFields = [
    "regional_council",
    "primer_sequence_r",
    "primer_sequence_f",
    "vineyard",
    "amplicon",
    "host_plant",
    "iwi_area"
  ];
  let data = responseData.data.context_options
    .filter(contextOption => {
      if (!excludedFields.includes(contextOption)) {
        return true;
      } else {
        return false;
      }
    })
    .map(field => {
      if (!excludedFields.includes(field)) {
        return {
          id: field,
          text: field
        };
      } else {
        console.log("excluding the field" + field);
      }
    });
  $("#select-contextual").select2({
    placeholder: "Search by sample contextual metadata",
    multiple: true,
    allowClear: true,
    width: "100%",
    closeOnSelect: true,
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
    createAggregateUrl();
  });
}

function initOtuSelect() {
  let taxonSelect = $("#select-taxonomic").select2({
    placeholder: "Type to filter by organism classification",
    multiple: true,
    allowClear: true,
    width: "100%",
    minimumInputLength: 1,
    // cache: true,
    tags: true,
    ajax: {
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
          // window.otuLookup[taxon[2]] = taxon[0];
          if (!window.otuLookup[taxon[2]]) {
            window.otuLookup[taxon[2]] = {
              code: taxon[0]
            };
          }
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
    createAggregateUrl();
  });
  return taxonSelect;
}

/**
 * Iterates through the elements that are used as bases for select2 construction
 */
const initAllTaxonomicSelects = () => {
  let segmentSelectors = document.getElementsByClassName("taxonomic-select");

  for (let item of segmentSelectors) {
    // TODO: create wrapper with cy-data attribute for testing as select2 creates element as sibling not child.
    $("#" + item.id).select2({
      placeholder: item.id,
      allowClear: true,
      width: "100%",
      closeOnSelect: true,
      ajax: {
        url: API_URLS.otuSegmentedSuggestions,
        delay: 250,
        data: function(params) {
          let args = [];
          for (let item of segmentSelectors) {
            // console.log(item.value);
            args.push(item.id.replace("Select", "=") + item.value);
          }
          console.log(args.join("&"));
          return args.join("&");
        },
        processResults: function(response, params) {
          let suggestions = response.suggestions;
          let sumText = "";
          for (let index in suggestions) {
            // checks if any of the results contain text values.
            sumText += suggestions[index].text;
          }
          if (!sumText) {
            suggestions = [];
          }
          return {
            results: suggestions
          };
        }
      }
    });
  }
};

/**
 * Creates the select for all search terms
 */
const initCombinationSelect = () => {
  let comboSelect = $("#combinationSelect").select2({
    placeholder: "Current query filters.",
    multiple: true,
    tags: true,
    allowClear: true,
    closeOnSelect: true,
    width: "%100"
  });
};

/**
 * Queries the database for distinct values of the currently selected contextual field then uses them to populate the options list
 */
const updateContextValuesSelect = () => {
  // updating the value suggestions for a given context field
  let contextFieldSelect = document.getElementById("context-field-select");
  let url = API_URLS.contextualFieldValues + contextFieldSelect.value;
  console.log("fetching context field distinct values for: " + url);
  fetch(url).then(response => {
    response.json().then(json => {
      let selectOptions = json.data.map(option => {
        return {
          id: option,
          text: option
        };
      });
      $("#context-values-select")
        .empty()
        .select2({
          data: selectOptions
        });
    });
  });
};

<<<<<<< HEAD
/**
 * Loads the contextual fields from the database, assigns the handler function for changes
 */
=======
const updateContextValuesSelect = () => {
  // updating the value suggestions for a given context field
  let contextFieldSelect = document.getElementById("context-field-select");
  let url = API_URLS.contextualFieldValues + contextFieldSelect.value;
  console.log("fetching context field distinct values for: " + url);
  fetch(url).then(response => {
    response.json().then(json => {
      let selectOptions = json.data.map(option => {
        return {
          id: option,
          text: option
        };
      });
      $("#context-values-select")
        .empty()
        .select2({
          data: selectOptions
        });
    });
  });
};

>>>>>>> 75cf15a6fe785f16140a4ed9c9baca60cc122140
const initContextFieldSelect = () => {
  // select element and clear
  let contextFieldSelect = document.getElementById("context-field-select");
  contextFieldSelect.length = 0;

  contextFieldSelect.onchange = updateContextValuesSelect;

  // populate options with request data
  let url = API_URLS.otuSuggestions + "q=&page=1&page_size=200";
  fetch(url).then(response => {
    response.json().then(json => {
      json.data.context_options.map(field => {
        let option = document.createElement("option");
        option.text = field;
        option.value = field;
        contextFieldSelect.add(option);
      });
      contextFieldSelect.selectedIndex = 0;
      // console.log(contextFieldSelect.value);
      updateContextValuesSelect();
    });
  });
};

export {
  initAllTaxonomicSelects,
  initOtuSelect,
  initCombinationSelect,
  initContextSelect,
  initContextFieldSelect
};
