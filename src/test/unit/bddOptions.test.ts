import { describe, expect, it } from 'vitest';
import { parseSimpleYaml } from '../../simpleYaml';

describe('bddOptions yaml subset', () => {
  it('parses flat values and lists', () => {
    const yaml = [
      '# comment',
      "stepFolderName: './steps'",
      'relativeToTestFolder: false',
      'externalSteps:',
      '  - package:a/step/one.dart',
      "  - 'package:b/step/two.dart'",
    ].join('\n');
    const parsed = parseSimpleYaml(yaml);
    expect(parsed).toEqual({
      stepFolderName: './steps',
      relativeToTestFolder: 'false',
      externalSteps: ['package:a/step/one.dart', 'package:b/step/two.dart'],
    });
  });

  it('parses inline arrays', () => {
    const parsed = parseSimpleYaml('externalSteps: [package:a/a.dart, package:b/b.dart]');
    expect(parsed).toEqual({ externalSteps: ['package:a/a.dart', 'package:b/b.dart'] });
  });
});
