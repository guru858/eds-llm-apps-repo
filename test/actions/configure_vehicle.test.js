const handler = require('../../actions/configure_vehicle/index.js');

describe('configure_vehicle handler', () => {
  test('always returns content parts', async () => {
    const result = await handler({});
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].type).toBe('text');
  });

  test('structuredContent is a plain object, not a bare array', async () => {
    const result = await handler({});
    expect(typeof result.structuredContent).toBe('object');
    expect(Array.isArray(result.structuredContent)).toBe(false);
  });

  test('falls back to defaults when the model sends nothing', async () => {
    const { structuredContent: build } = await handler({});
    expect(build.selections.trim).toBe('s-awd');
    expect(build.selections.paint).toBe('arctic-white');
    expect(build.dropped).toHaveLength(0);
  });

  test('ignores arguments the model hallucinated', async () => {
    const { structuredContent: build } = await handler({ paint: 'unicorn-sparkle' });
    expect(build.selections.paint).toBe('arctic-white');
  });

  test('rolls back an incompatible combination and explains why', async () => {
    const { structuredContent: build } = await handler({ roof: 'panoramic', pack: 'cold-climate' });
    expect(build.selections.roof).toBe('fixed');
    expect(build.dropped[0].rule).toBe('pano-excludes-cold-climate');
    expect(build.dropped[0].reason).toMatch(/Cold Climate/);
  });

  test('marks unreachable options unavailable with a reason', async () => {
    const { structuredContent: build } = await handler({ trim: 's-awd' });
    const wheels = build.groups.find((group) => group.id === 'wheels');
    const r22 = wheels.options.find((option) => option.id === 'r22-black');
    expect(r22.available).toBe(false);
    expect(r22.reason).toMatch(/Dynamic SE/);
  });

  test('upgrading the trim unlocks the wheels', async () => {
    const { structuredContent: build } = await handler({ trim: 'dynamic-se', wheels: 'r22-black' });
    expect(build.selections.wheels).toBe('r22-black');
    expect(build.dropped).toHaveLength(0);
  });

  test('prices the build from base plus selected deltas', async () => {
    const { structuredContent: build } = await handler({ trim: 's-awd', pack: 'cold-climate' });
    expect(build.price.base).toBe(2640000);
    expect(build.price.options).toBe(95000);
    expect(build.price.total).toBe(2735000);
  });

  test('buildId is deterministic for the same selection', async () => {
    const first = await handler({ trim: 'dynamic-se', paint: 'crimson-red' });
    const second = await handler({ trim: 'dynamic-se', paint: 'crimson-red' });
    expect(first.structuredContent.buildId).toBe(second.structuredContent.buildId);
  });

  test('accepts labels and reads a request the model put in one field', async () => {
    const { structuredContent: build } = await handler({
      userIntent: 'Terra in white with the panoramic roof and the cold climate pack',
    });
    expect(build.selections.paint).toBe('arctic-white');
    expect(build.selections.pack).toBe('cold-climate');
    expect(build.selections.roof).toBe('fixed');
    expect(build.dropped[0].rule).toBe('pano-excludes-cold-climate');
  });

  test('deep link opens the configure page with the reconciled selection', async () => {
    const { structuredContent: build } = await handler({ roof: 'panoramic', pack: 'cold-climate' });
    const url = new URL(build.deepLink);
    expect(url.pathname).toBe('/configure');
    expect(url.searchParams.get('roof')).toBe('fixed');
    expect(url.searchParams.get('pack')).toBe('cold-climate');
    expect(url.searchParams.get('paint')).toBe('arctic-white');
  });

  test('instructs the host not to duplicate the widget in prose', async () => {
    const result = await handler({});
    expect(result._meta['openai/widgetDescription']).toMatch(/Do NOT list the options/);
  });
});
