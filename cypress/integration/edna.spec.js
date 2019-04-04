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
  it("highlights appropriate grid cell.", function() {
    cy.get("#graph-button").click();
    cy.get(".leaflet-control-layers-selector").next("input");
  });
});
