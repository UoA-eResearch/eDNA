// import s
import * as $ from "jquery";
import { API_URLS } from "./constants";
import { Utility } from "./utility";

/**
 * Iterates through the elements that are used as bases for select2 construction
 */
const initAllTaxonomicSelects = () => {
  let taxonSelects = document.getElementsByClassName("taxonomic-select");

  for (let taxonSelect of taxonSelects) {
    // TODO: create wrapper with cy-data attribute for testing as select2 creates element as sibling not child.
    $("#" + taxonSelect.id).select2({
      placeholder: taxonSelect.id,
      allowClear: true,
      width: "100%",
      closeOnSelect: true,
      ajax: {
        // TODO: replace with new taxon specific url
        url:
          API_URLS.otuSegmentedSuggestions +
          taxonSelect.id.replace("Select", "") +
          "/",
        delay: 250,
        data: () => {
          let args = [];
          for (let item of taxonSelects) {
            // console.log(item.value);
            args.push(item.id.replace("Select", "=") + item.value);
          }
          console.log(args.join("&"));
          return args.join("&");
        },
        processResults: response => {
          // empty before repopulating options
          $("#" + taxonSelect.id).empty();

          let suggestions = response.suggestions;
          let totalText = "";
          let allFalse = Utility.allFalsey(suggestions);
          console.log(allFalse);
          for (let index in suggestions) {
            // checks if any of the results contain any truthy text values.
            totalText += suggestions[index].text;
          }
          if (!totalText) {
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

class ContextValueSelect {
  constructor() {
    this.id = "#context-values-select";
    this.element = document.getElementById("#context-values-select");
    this.select2 = $("#context-values-select").select2({
      placeholder: "testing 1234",
      allowClear: true,
      width: "100%",
      tags: true
    });
  }

  replaceContextValuesOptions(newOptions) {
    $("#context-values-select")
      .empty()
      .select2({
        data: newOptions,
        width: "100%",
        allowClear: true,
        tags: true
      });
  }

  createSelectOptions(optionData) {
    let newOptions = optionData.map(option => {
      return {
        id: option,
        text: option
      };
    });
    return newOptions;
  }

  /**
   * Queries the database for distinct values of the currently selected contextual field then uses them to populate the options list
   */
  updateContextValuesSelect() {
    let contextFieldSelect = document.getElementById("context-field-select");
    let url = API_URLS.contextualFieldValues + contextFieldSelect.value;
    console.log("fetching context field distinct values for: " + url);
    fetch(url).then(response => {
      response.json().then(json => {
        let newOptions = this.createSelectOptions(json.data);
        this.replaceContextValuesOptions(newOptions);
      });
    });
  }
}

class ContextFieldSelect {
  constructor() {
    this.domElement = document.getElementById("context-field-select");
    this.selectedValue = this.domElement.value;
    this.url = API_URLS.otuSuggestions + "q=&page=1&page_size=200";
    this.clearOptions();
    this.updateOptions();
    // this.domElement.onchange = updateContextValuesSelect;
  }

  excludeFields(data) {
    let excludedFields = [
      "regional_council",
      "primer_sequence_r",
      "primer_sequence_f",
      "vineyard",
      "amplicon",
      "host_plant",
      "iwi_area"
    ];
    let filtered = data.filter(contextOption => {
      return excludedFields.includes(contextOption) ? false : true;
    });
    return filtered;
  }

  clearOptions() {
    this.domElement.length = 0;
  }

  /**
   * Sets the handler function for onchange event of the mounted dom element for the contextual field.
   * @param   {[function]}  func  [Desired onchange function]
   */
  set onchange(func) {
    this.domElement.onchange = func;
  }

  /**
   * Returns the onchange function of the related DOM element
   *
   * @return  {[function]}  [DOM element's onchange function]
   */
  get onchange() {
    return this.domElement.onchange;
  }

  /**
   * Loads the contextual fields from the database,
   */
  updateOptions() {
    console.log("populating context field options");
    fetch(this.url).then(response => {
      response.json().then(json => {
        let filteredOptions = this.excludeFields(json.data.context_options);
        filteredOptions.map(field => {
          let option = document.createElement("option");
          option.text = field;
          option.value = field;
          this.domElement.add(option);
        });
        this.selectedValue = 0;
        this.onchange();
      });
    });
  }
}

export {
  initAllTaxonomicSelects,
  initCombinationSelect,
  ContextValueSelect,
  ContextFieldSelect
};
