import Shepherd from "shepherd.js";

export const CreateTour = () => {
  const tour = new Shepherd.Tour({
    defaultStepOptions: {
      classes: "shadow-md bg-purple-dark",
      scrollTo: true
    }
    // useModalOverlay: true
  });

  // "This hub is used for visualising eDNA data is various ways."
  // "To search, click on the S2 panel to the left, from here you can search by an organisms taxonomic classification..."
  // "You can also search by contextual information, that means you can search by properties of the eDNA data itself."
  quickAdd(tour, "Welcome to the eDNA Virtual Hub.", null);
  quickAdd(
    tour,
    "This hub is used for visualising eDNA data is various ways.",
    null
  );
  addRight(
    tour,
    "Click on this tab to open the search interface",
    "#search-tab"
  );
  addTop(
    tour,
    "This box shows all the filters you will search for. It is useful for keeping track of complex filtering...",
    "#combinationSelect"
  );
  addRight(
    tour,
    "You are able to select which kingdom the organisms must be to show in search results...",
    "#select2-kingdomSelect-container"
  );
  addBottom(
    tour,
    "Once you are done creating a taxonomic filter for an organism, confirm that you want to add it as a filter by clicking this button",
    "#add-otu-button"
  );
  addBottom(
    tour,
    "If you want to clear the current taxonomic filter to create a new one of cancel the existing one, you can click the clear button.",
    "#selectClearAll"
  );
  addBottom(
    tour,
    "You can also search by eDNA metadata. This is the data which related to the eDNA data itself. E.g. the environmental properties and data collection properties of eDNA datapoints.",
    "#contextual-selects"
  );
  addBottom(
    tour,
    "First, select the property you wish to filter by...",
    "#context-field-select"
  );
  addBottom(
    tour,
    "Then select how you want to filter the property by",
    "#context-field-select"
  );
  addBottom(
    tour,
    "Enter the value you want to filter by",
    "#select2-context-values-select-container"
  );
  addBottom(
    tour,
    "Then to confirm the context filter, select add to context query by clicking the button.",
    "#add-context-btn"
  );
  addBottom(
    tour,
    "Finally, you can submit a request to the database for the filters you have confirmed",
    "#submit-search"
  );
  addTop(
    tour,
    "After loading, the updated results should be rendered to the map",
    "#map"
  );
  addTop(
    tour,
    "You can minimize the menu by clicking on the already active tab",
    "#search-tab"
  );
  addTop(
    tour,
    "You can change which map representation to display on the map. For the purpose of the tutorial, please click on one of the grid views e.g. Grid: Richness",
    ".leaflet-control-layers-overlays"
  );
  addTop(
    tour,
    "For the purpose of the tutorial, click on a grid cell",
    ".leaflet-interactive"
  );
  addTop(
    tour,
    "Each square in the grid view contains information related to eDNA in that square region. Information includes the eDNA samples in that square as well as all the filtered organisms found in that area.",
    ".leaflet-popup-content"
  );
  addTop(
    tour,
    "You can change the detail of each square by altering the grid slider or input fields",
    "#display-controls-togglable"
  );
  addTop(
    tour,
    "For further insight, you can view the plot by toggling the window.",
    "#graph-button"
  );
  addTop(
    tour,
    "In this plot you can see a basic overview of the distribution of eDNA samples",
    "#chart"
  );
  addTop(
    tour,
    "You may change the colouring based on metadata related to the samples",
    "#meta-select"
  );
  addTop(
    tour,
    "You can also change the colour scheme if the current colour scheme is difficult to view",
    "#colour-scheme-select"
  );
  addTop(
    tour,
    "When a grid layer is activated, Hovering over circles in the plot will highlight the corresponding grid cell as well as show the same datapoint within the other plot axis.",
    ".enter"
  );
  addTop(
    tour,
    "You can also fly directly to the grid cell by clicking on the circle.",
    ".enter"
  );
  addTop(
    tour,
    "When grid layers are activated, you can also see where a grid cell is located in the plot by hovering over the grid cell you which to see.",
    ".leaflet-interactive"
  );
  addTop(tour, "That concludes the tutorial!", null);

  tour.start();
};

const addTop = (tour, text, element) => {
  quickAdd(tour, text, element, "top");
};

const addBottom = (tour, text, element) => {
  quickAdd(tour, text, element, "bottom");
};

const addRight = (tour, text, element) => {
  quickAdd(tour, text, element, "right");
};

const quickAdd = (tour, text, element, addPosition) => {
  tour.addStep("example-step", {
    text: text,
    attachTo: {
      element: element,
      on: "bottom"
    },
    classes: "example-step-extra-class",
    buttons: [
      {
        text: "Back",
        secondary: true,
        action: tour.back
      },
      {
        text: "Next",
        action: tour.next
      },
      {
        text: "End tour",
        secondary: true,
        action: tour.cancel
      }
    ]
  });
};
