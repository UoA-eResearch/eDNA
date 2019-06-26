import { aggregateSampleOtusBySite } from "../src/aggregation";

test("Aggregating Sample Otu entries into a summed values", () => {
  let mockSampleOtus = [
    [1225, 352, 0.0074719800747198],
    [1225, 358, 0.000236952787157159],
    [1225, 352, 0.0135699373695198]
  ];
  aggregateSampleOtusBySite(mockSampleOtus);
});
