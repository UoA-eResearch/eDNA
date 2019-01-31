const dev_url = "http://localhost:8000/edna/api/v1.0/";
const prod_url = "https://edna.nectar.auckland.ac.nz/edna/api/";
// change active depending on the situation.
const active_base_url = dev_url;
const API_URLS = {
  // prod
  filtered_abundance: prod_url + "abundance?otu=",
  filtered_meta: prod_url + "metadata?term=",
  ordered_sampleotu: prod_url + "sample_otu_ordered",

  // dev
  test_sample_otu_pk: dev_url + "abundance?",
  dev_contextual_id: dev_url + "metadata?id=",
  filter_suggestions: dev_url + "filter-options?",
  otu_code_by_id: dev_url + "otu/?id="
};

export { dev_url, prod_url, API_URLS, active_base_url };
