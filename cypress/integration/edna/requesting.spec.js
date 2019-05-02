context("Request behaviour", function() {
  beforeEach(() => {
    cy.visit("/");
    cy.get("#numberResults").contains(/^[0-9]+$/);
  });

  describe("taxonomic kingdom select", () => {
    it("Should suggest fungi when typing in fungi", () => {
      cy.get(".select2-container:first").click();
      cy.get(".select2-search__field:first").type("k__fungi");
      // cy
      // cy.get('.select2-results__option[data-select2-id="63"]').contains(
      cy.get('.select2-results__option[data-select2-id="63"]').contains(
        "k__Fungi"
      );
    });
  });

  it("Default settings should return results on initial page load.", function() {
    // cy.visit("/"); // change URL to match your dev URL
    cy.get("#numberResults").contains(/^[0-9]*$/);
  });

  it("Should return results with no filters + endemism included.", function() {
    // TODO: clear filters before each of these tests
    cy.get("#numberResults").contains(/^[0-9]+$/);
    cy.get("#numberResults").then(numResults => {
      let unendemicCount = numResults.text();

      cy.get("#endemic-checkbox").click();

      cy.get("#loading-popup").should("have.class", "map-popup--hidden");

      cy.get("#numberResults")
        .invoke("text")
        .should(endemicCount => {
          expect(endemicCount).to.be.lessThan(unendemicCount);
        });
    });

    // probably assert or make sure it's set to intersection/AND?

    // resetting state
    cy.get("#endemic-checkbox").click();
  });

  it("More otu parameters should contain more results", function() {
    cy.get(".select2-container:first").click();
    cy.get(".select2-search__field:first").type("k__fungi");
    cy.wait(1000);
    cy.get(".select2-search__field:first").type("{enter}", { force: true });

    cy.get("#numberResults").then(numResults => {
      let oneParamCount = numResults.text();
      cy.get(".select2-search__field:first").type("k__bacteria");
      cy.wait(1000);
      cy.get(".select2-search__field:first").type("{enter}");

      cy.get("#numberResults")
        .invoke("text")
        .should(twoParamCount => {
          expect(twoParamCount).to.be.greaterThan(oneParamCount);
        });
    });
  });

  it("Should contain less results when both otu and context filters with AND operator.", function() {
    cy.get("#taxon-wrapper .select2-container:first").click();
    cy.get(".select2-search__field:first").type("k__bacteria");
    cy.wait(1000);
    cy.get(".select2-search__field:first").type("{enter}", { force: true });

    cy.get("#numberResults").then(numResults => {
      let oneParamCount = parseInt(numResults.text());
      cy.get("#contextual-wrapper .select2-search__field:first").type(
        "elevation=100 {enter}"
      );
      cy.get("#loading-popup").should("have.class", "map-popup--hidden");
      //   cy.get(".select2-search__field:first").type("{enter}");
      cy.get("#numberResults").contains(/^[0-9]+$/);
      cy.get("#numberResults")
        .invoke("text")
        .should(numResultsText => {
          let twoParamCount = parseInt(numResultsText);
          expect(twoParamCount).to.be.lessThan(oneParamCount);
        });
    });
  });

  it("Union filtering should return more results with more filter params.", function() {
    cy.get("#taxon-wrapper .select2-container:first").click();
    cy.get(".select2-search__field:first").type("k__fungi");
    cy.wait(1000);
    cy.get(".select2-search__field:first").type("{enter}");

    cy.get("#loading-popup").should("have.class", "map-popup--hidden");

    cy.get("#numberResults").then(numResults => {
      cy.get("#select-operator").select("or");
      let oneParamCount = parseInt(numResults.text());
      cy.get("#contextual-wrapper .select2-search__field:first").type(
        "elevation=0 {enter}",
        { force: true }
      );
      cy.get("#loading-popup").should("have.class", "map-popup--hidden");
      //   cy.get(".select2-search__field:first").type("{enter}");
      cy.get("#numberResults")
        .invoke("text")
        .should(numResultsText => {
          let twoParamCount = parseInt(numResultsText);
          expect(twoParamCount).to.be.greaterThan(oneParamCount);
        });
    });
  });

  it("Adding amplicon filter should reduce number of results from unfiltered set", () => {
    cy.get("#numberResults").then(numResults => {
      let unfilteredCount = parseInt(numResults.text());

      cy.get("#amplicon-wrapper .select2-container:first").click();
      cy.get("#amplicon-wrapper .select2-search__field:first").type("its");
      cy.wait(1000);
      cy.get("#amplicon-wrapper .select2-search__field:first").type("{enter}");

      cy.get("#loading-popup").should("have.class", "map-popup--hidden");
      //   cy.get(".select2-search__field:first").type("{enter}");
      cy.get("#numberResults")
        .invoke("text")
        .should(numResultsText => {
          let ampliconFilteredCount = parseInt(numResultsText);
          expect(ampliconFilteredCount).to.be.lessThan(unfilteredCount);
        });
    });
  });
});
