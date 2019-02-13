const DEV_BASE_URL = "http://localhost:8000/edna/api/v1.0/";
const PRD_BASE_URL = "https://edna.nectar.auckland.ac.nz/edna/api/v1.0/";
// change active depending on the situation.
const activeUrl = PRD_BASE_URL;
const API_URLS = {
  // prod
  filtered_abundance: PRD_BASE_URL + "abundance?",
  filtered_meta: PRD_BASE_URL + "metadata?term=",
  ordered_sampleotu: PRD_BASE_URL + "sample_otu_ordered",

  // prod test (? lol)
  prod_filter_suggestions: PRD_BASE_URL + "filter-options?",

  // dev
  test_sample_otu_pk: DEV_BASE_URL + "abundance?",
  dev_contextual_id: DEV_BASE_URL + "metadata?id=",
  filter_suggestions: DEV_BASE_URL + "filter-options?",
  otu_code_by_id: DEV_BASE_URL + "otu/?id="
};

const API_URLS_2 = {
  // prod
  sampleOtus: activeUrl + "abundance?",
  metaData: activeUrl + "metadata?term=",
  otuSuggestions: activeUrl + "filter-options?",
  otu_code_by_id: activeUrl + "otu/?id="
};

export { DEV_BASE_URL, PRD_BASE_URL, API_URLS, activeUrl, API_URLS_2 };
