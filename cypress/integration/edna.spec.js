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
});

describe("Color metric select", function() {
  it("should change circle colour on selection change", function() {
    cy.get("#graph-button").click();
    cy.get("#_919:first").should("have.attr", "fill", "rgb(0, 0, 255)");
    cy.get("#meta-select").select("biome_t2");
    cy.get("#_919:first").should("have.not.attr", "fill", "rgb(0, 0, 255)");
  });
});
