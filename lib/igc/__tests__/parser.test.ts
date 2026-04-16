import { parseIGC } from "../parser";
import fs from "fs";
import path from "path";

describe("IGC Parser", () => {
  it("should parse IGC file correctly", () => {
    const samplePath = path.join(__dirname, "sample.igc");
    const content = fs.readFileSync(samplePath, "utf-8");

    const result = parseIGC(content);

    expect(result).toHaveProperty("flightDate");
    expect(result).toHaveProperty("takeoffTime");
    expect(result).toHaveProperty("landingTime");
    expect(result).toHaveProperty("durationSec");
    expect(result).toHaveProperty("maxAltitudeM");
    expect(result).toHaveProperty("distanceStraightKm");
    expect(result).toHaveProperty("distanceTrackKm");
    expect(result).toHaveProperty("distanceXcontestKm");

    expect(result.flightDate.getDate()).toBe(26);
    expect(result.flightDate.getMonth()).toBe(3); // April (0-indexed)
    expect(result.flightDate.getFullYear()).toBe(2026);
  });

  it("should throw error on invalid IGC file", () => {
    const invalidContent = "Invalid IGC content";

    expect(() => parseIGC(invalidContent)).toThrow();
  });
});
