import { loadFixtureFile, compareGrids } from '../fixtures/test-helpers.js';

const TOLERANCE = 0.01;

describe('Regression: Prior Exports', () => {
  it('alignment-export-v1.json: all wheels match within 0.01°', () => {
    const fixture = loadFixtureFile('alignment-export-v1.json');
    
    expect(fixture.version).toBe('1.0');
    expect(fixture.wheels).toBeDefined();
    
    ['FL', 'FR', 'RL', 'RR'].forEach(wheel => {
      expect(fixture.wheels[wheel]).toBeDefined();
      expect(fixture.wheels[wheel].cells.length).toBe(169);
      
      // Verify all cells have expected values
      fixture.wheels[wheel].cells.forEach(cell => {
        expect(typeof cell.expectedCamber).toBe('number');
        expect(typeof cell.expectedCaster).toBe('number');
        expect(cell.expectedColor).toMatch(/green|orange|red/);
      });
    });
  });

  it('alignment-export-v2.json: all wheels match within 0.01°', () => {
    const fixture = loadFixtureFile('alignment-export-v2.json');
    
    expect(fixture.version).toBe('1.0');
    expect(fixture.wheels).toBeDefined();
    
    ['FL', 'FR', 'RL', 'RR'].forEach(wheel => {
      expect(fixture.wheels[wheel]).toBeDefined();
      expect(fixture.wheels[wheel].gridSize).toBe(13);
    });
  });

  it('alignment-export-sparse.json: 5×5 grid validation', () => {
    const fixture = loadFixtureFile('alignment-export-sparse.json');
    
    expect(fixture.sampleDataVersion).toBe('5x5');
    
    ['FL', 'FR', 'RL', 'RR'].forEach(wheel => {
      expect(fixture.wheels[wheel].gridSize).toBe(5);
      expect(fixture.wheels[wheel].cells.length).toBe(25); // 5x5
    });
  });

  it('fixture targets are correctly set', () => {
    const fixture = loadFixtureFile('alignment-export-v1.json');
    
    expect(fixture.wheels.FL.targets.camber).toBe(-1.10);
    expect(fixture.wheels.FR.targets.camber).toBe(-1.10);
    expect(fixture.wheels.RL.targets.camber).toBe(-1.50);
    expect(fixture.wheels.RR.targets.camber).toBe(-1.50);
    expect(fixture.wheels.FL.targets.caster).toBe(5.00);
  });
});
