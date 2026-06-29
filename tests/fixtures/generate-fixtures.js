import fs from 'fs';
import path from 'path';

/**
 * Generate fixture with sample data and expected calculations
 */
function generateFixture(gridSize = 13, version = '1.0') {
  const positions = [];
  for (let i = -Math.floor(gridSize / 2); i <= Math.floor(gridSize / 2); i++) {
    positions.push(i);
  }

  const wheels = {};
  const wheelIds = ['FL', 'FR', 'RL', 'RR'];

  wheelIds.forEach(wheelId => {
    const cells = [];
    
    positions.forEach((front, frontIdx) => {
      positions.forEach((rear, rearIdx) => {
        const isRequired = [-6, -3, 0, 3, 6].includes(front) && 
                          [-6, -3, 0, 3, 6].includes(rear);
        const isInterpolated = !isRequired;
        
        // Generate synthetic data
        const angle360ACW = 4 + Math.sin(front * 0.5) * 2 + Math.cos(rear * 0.3) * 1.5;
        const angle0 = 3.5 + Math.sin(rear * 0.4) * 1.8 + Math.cos(front * 0.2) * 1.2;
        const angle360CW = 2 + Math.sin((front + rear) * 0.3) * 2.5;
        
        const expectedCamber = (angle360ACW + angle0 + angle360CW) / 3;
        const expectedCaster = (angle360CW - angle360ACW) / 2;
        
        // Simple color coding based on distance to target
        const targetCamber = wheelId === 'RL' || wheelId === 'RR' ? -1.50 : -1.10;
        const distance = Math.abs(expectedCamber - targetCamber);
        let expectedColor = 'green';
        if (distance > 0.3) expectedColor = 'red';
        else if (distance > 0.1) expectedColor = 'orange';
        
        cells.push({
          frontBolt: front,
          rearBolt: rear,
          measured: !isInterpolated,
          isInterpolated,
          angle360ACW: Math.round(angle360ACW * 100) / 100,
          angle0: Math.round(angle0 * 100) / 100,
          angle360CW: Math.round(angle360CW * 100) / 100,
          expectedCamber: Math.round(expectedCamber * 100) / 100,
          expectedCaster: Math.round(expectedCaster * 100) / 100,
          expectedColor,
        });
      });
    });

    wheels[wheelId] = {
      wheel: wheelId,
      gridSize,
      targets: {
        camber: wheelId === 'RL' || wheelId === 'RR' ? -1.50 : -1.10,
        caster: wheelId === 'FL' || wheelId === 'FR' ? 5.00 : 0,
        toe: 0.07,
      },
      cells,
    };
  });

  const fixture = {
    version,
    generatedDate: new Date().toISOString(),
    sampleDataVersion: `${gridSize}x${gridSize}`,
    wheels,
    configState: {
      rearToeLocked: false,
      symmetricCamber: false,
      measurementDensity: gridSize,
    },
    calculationSummary: {
      bestCellFL: { frontBolt: 0, rearBolt: 0, score: 0.98 },
      worstCellFL: { frontBolt: -6, rearBolt: -6, score: 0.12 },
      averageColorDistanceFL: 0.45,
    },
  };

  return fixture;
}

/**
 * Save fixture to file
 */
function saveFixture(fixture, filename) {
  const exportsDir = path.join(process.cwd(), 'tests/fixtures/exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
  
  const filepath = path.join(exportsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(fixture, null, 2), 'utf-8');
  console.log(`✓ Generated ${filename}`);
}

// Generate fixtures
console.log('Generating test fixtures...');
saveFixture(generateFixture(13, '1.0'), 'alignment-export-v1.json');
saveFixture(generateFixture(13, '1.0'), 'alignment-export-v2.json');
saveFixture(generateFixture(5, '1.0'), 'alignment-export-sparse.json');
console.log('✓ All fixtures generated');
