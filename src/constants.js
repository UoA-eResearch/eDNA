const DEV_BASE_URL = "http://localhost:8000/edna/api/v1.0/";
const PRD_BASE_URL = "https://edna.nectar.auckland.ac.nz/edna/api/v1.0/";
// change active depending on the situation.

// const activeUrl = PRD_BASE_URL;
const activeUrl = DEV_BASE_URL;

const API_URLS = {
  sampleOtus: activeUrl + "abundance?",
  metaData: activeUrl + "metadata?term=",
  otuSuggestions: activeUrl + "filter-options?",
  otu_data_by_id: activeUrl + "otu/?id=",

  // test
  kingdoms: activeUrl + "kingdom/",
  phylum: activeUrl + "phylum/",
  class: activeUrl + "class/",
  order: activeUrl + "order/",
  family: activeUrl + "family/",
  genus: activeUrl + "genus/",
  species: activeUrl + "species/"
};

export { DEV_BASE_URL, PRD_BASE_URL, activeUrl, API_URLS };
