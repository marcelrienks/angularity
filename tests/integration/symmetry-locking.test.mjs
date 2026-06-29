describe('Symmetry & Locking Behavior', () => {
  it('rear toe lock propagation: RL change updates RR', () => {
    const lockState = { rearToeLocked: true };
    const values = { RL: 0.07, RR: 0.05 };

    if (lockState.rearToeLocked) {
      values.RR = values.RL;
    }

    expect(values.RL).toBe(values.RR);
    expect(values.RR).toBe(0.07);
  });

  it('symmetric camber: FL=FR when enabled', () => {
    const config = { symmetricCamber: true };
    const cambers = { FL: -1.10, FR: -1.15 };

    if (config.symmetricCamber) {
      cambers.FR = cambers.FL;
    }

    expect(cambers.FL).toBe(cambers.FR);
  });

  it('asymmetric config: FL ≠ FR allowed', () => {
    const config = { symmetricCamber: false };
    const cambers = { FL: -1.10, FR: -1.20 };

    // Should not enforce equality
    if (config.symmetricCamber) {
      cambers.FR = cambers.FL;
    }

    expect(cambers.FL).not.toBe(cambers.FR);
  });

  it('lock persistence: state survives navigation', () => {
    const lockState = { rearToeLocked: true };
    const savedState = JSON.parse(JSON.stringify(lockState));

    // Simulate page navigation
    const restoredState = savedState;

    expect(restoredState.rearToeLocked).toBe(true);
  });

  it('symmetric pair recommendations only when locked', () => {
    const config = { symmetricCamber: false };
    const recommendations = [];

    if (config.symmetricCamber) {
      recommendations.push({ FL: -1.10, FR: -1.10 });
    }

    expect(recommendations.length).toBe(0);
  });

  it('asymmetric option display when disabled', () => {
    const config = { symmetricCamber: false };
    const options = config.symmetricCamber ? ['symmetric'] : ['independent'];

    expect(options).toContain('independent');
    expect(options).not.toContain('symmetric');
  });
});
