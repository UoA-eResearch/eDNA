import { exportAllDeclaration } from "@babel/types";

describe("The toggle button", function() {
  it("successfully toggles chart", function() {
    cy.visit("/"); // change URL to match your dev URL
    cy.get("#graph-button").click();
    cy.get("#chart").should("have.attr", "style");
    cy.get("#graph-button").click();
    cy.get("#chart").should("have.attr", "style", "display: none;");
  });
});

describe("The plot circles", function() {
  it("should enlarge when hovered", function() {
    cy.get("#graph-button").click();
    cy.get(".leaflet-control-layers-overlays input:first").click();
    cy.wait(3000);
    cy.get("#_279:first")
      .should("have.attr", "r", "7")
      .trigger("mouseover", { force: true })
      .should("have.attr", "r", "14");
  });
});

describe("The heat layer", function() {
  it("should only auto-add on first data received", function() {
    cy.get(".leaflet-heatmap-layer");
    cy.get(".leaflet-control-layers-overlays input:first").click();
    cy.get(".leaflet-control-layers-overlays input:last").click();
    cy.get("#endemic-checkbox").check();
    cy.get(".leaflet-heatmap-layer").should("not.exist");
  });

  it("should enlarge relevant plot circles when hovered over", function() {
    cy.get(".leaflet-control-layers-overlays input:first").click();
    // cy.get("#graph-button").click();
    cy.get(".leaflet-interactive:first").trigger("mouseover", { force: true });
    cy.wait(300);
    cy.get('.enter [r="14"]');
    // TODO: not finding the enlarged circle
    // hover it
    // get the tool tip site id.
    // check that the original layer contains that site id
  });
});

describe("Colour metric select", function() {
  it("should change circle colour on selection change", function() {
    cy.get("#graph-button").click();
    cy.get("#_919:first").should("have.attr", "fill", "rgb(0, 0, 255)");
    cy.get("#meta-select").select("biome_t2");
    cy.get("#_919:first").should("have.not.attr", "fill", "rgb(0, 0, 255)");
  });
});

describe("Colour scheme select", function() {
  it("should change colour for certain metrics", function() {
    cy.get("#graph-button").click();
    cy.get("#meta-select").select("elevation");
    cy.get("#_919:first").should("have.attr", "fill", "rgb(0, 0, 255)");
    cy.get("#colour-scheme-select").select("diverging");
    cy.get("#_919:first").should("have.not.attr", "fill", "rgb(0, 0, 255)");
  });

  it("should not alter colour for specified metrics", function() {
    cy.get(".leaflet-control-layers-overlays input:first").click();
    cy.get("#meta-select").select("biome_t2");
    cy.wait(400);
    cy.get("#_919:first").then(circleElem => {
      const firstFill = Cypress.$(circleElem).attr("fill");
      cy.get("#colour-scheme-select").select("diverging");
      cy.wait(400);
      cy.get("#_919:first").should("have.attr", "fill", firstFill);
    });
  });
});

describe("Grid layer cell/rectangel", function() {
  it("should generate popup content when clicked on", function() {
    cy.get(".leaflet-control-layers-overlays input:first").click();
    cy.get(".leaflet-interactive:first").click({ force: true });
    cy.wait(200);
    cy.get(".leaflet-popup-content").contains("Cell Richness");
  });
});

context("API behaviour", function() {
  beforeEach(() => {
    cy.visit("/");
  });

  it("Default settings should return results on initial page load.", function() {
    // cy.visit("/"); // change URL to match your dev URL
    cy.get("#numberResults").contains(/^[0-9]*$/);
  });

  it("Should return results with no filters + endemism included.", function() {
    // TODO: clear filters before each of these tests
    cy.wait(1000);
    cy.get("#numberResults").contains(/^[0-9]*$/);
    cy.get("#numberResults").then(numResults => {
      let value = numResults.text();

      cy.get("#endemic-checkbox").click();
      cy.get("#numberResults")
        .invoke("text")
        .should(text2 => {
          expect(value).not.to.eq(text2);
        });
    });

    // probably assert or make sure it's set to intersection/AND?

    // resetting state
    cy.get("#endemic-checkbox").click();
  });

  it("More otu select parameters should return more.", function() {
    cy.get("#select-taxonomic").type("k__fungi{enter}k__bac{enter}", {
      force: true
    });
  });

  it("Intersectional filtering should return more results with less filter params.", function() {});

  it("Union filtering should return more results with more filter params.", function() {});
});
