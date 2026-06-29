/**
 * tests/fixtures/index.js
 * Exports test fixtures for washer-math tests
 */

export const washerAngles = {
  pos_neg3: { boltPosition: -3, expectedAngle: 135 },
  pos_0: { boltPosition: 0, expectedAngle: 90 },
  pos_pos3: { boltPosition: 3, expectedAngle: 45 },
  pos_pos6: { boltPosition: 6, expectedAngle: 0 },
};

export const markerCoordinates = {
  radius50: {
    radius: 50,
    center: { x: 100, y: 100 },
    pos_0: { boltPosition: 0, x: 100, y: 150 },
    pos_6: { boltPosition: 6, x: 150, y: 100 },
    pos_3: { boltPosition: 3, x: 135.4, y: 135.4 },
    pos_neg3: { boltPosition: -3, x: 64.6, y: 135.4 },
    pos_neg6: { boltPosition: -6, x: 50, y: 100 },
  },
};

export const positionDifferencePattern = {
  testCases: [
    { from: -6, to: -3, expectedDelta: 45 },
    { from: -3, to: 0, expectedDelta: 45 },
    { from: 0, to: 3, expectedDelta: 45 },
    { from: 3, to: 6, expectedDelta: 45 },
  ],
};
