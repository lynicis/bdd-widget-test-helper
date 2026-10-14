import { describe, expect, it } from 'vitest';
import { parseFeature, withDataTables } from '../../featureParser';

describe('featureParser', () => {
  it('finds Given/When/Then steps with positions', () => {
    const doc = ['Feature: f', '  Scenario: s', '    Given the app is running', '    When I tap text', "    Then I see {'x'} text"].join('\n');
    const { steps } = parseFeature(doc);
    expect(steps.map((s) => s.text)).toEqual(['the app is running', 'I tap text', "I see {'x'} text"]);
    expect(steps.map((s) => s.keyword)).toEqual(['given', 'when', 'then']);
    expect(steps[0].line).toBe(2);
  });

  it('tracks And/But inheritance', () => {
    const doc = ['Feature: f', '  Scenario: s', '    Given a', '    And b', '    But c', '    When d', '    And e'].join('\n');
    const { steps } = parseFeature(doc);
    expect(steps.map((s) => s.keyword)).toEqual(['given', 'given', 'given', 'when', 'when']);
  });

  it('resets And/But inheritance at a new scenario', () => {
    const doc = ['Feature: f', '  Scenario: s1', '    Given a', '    And b', '  Scenario: s2', '    And c'].join('\n');
    const { steps } = parseFeature(doc);
    expect(steps.map((s) => s.keyword)).toEqual(['given', 'given', 'and']);
  });

  it('reads steps from Background', () => {
    const doc = ['Feature: f', '  Background:', '    Given the app is running', '  Scenario: s', '    When I tap text'].join('\n');
    const { steps } = parseFeature(doc);
    expect(steps.map((s) => s.text)).toEqual(['the app is running', 'I tap text']);
  });

  it('ignores comments, docstrings and Examples tables', () => {
    const doc = [
      'Feature: f',
      '  Scenario Outline: s',
      '    Given there are <start> cucumbers',
      '    """',
      '    Given not a step',
      '    """',
      '    Examples:',
      '      | start |',
      '      | 12    |',
      '    # Given commented out',
    ].join('\n');
    const { steps } = parseFeature(doc);
    expect(steps.map((s) => s.text)).toEqual(['there are <start> cucumbers']);
  });

  it('detects data tables on steps', () => {
    const doc = ['Feature: f', '  Scenario: s', '    Given users exist', '      | name |', '      | bob  |'].join('\n');
    const steps = withDataTables(parseFeature(doc).steps, doc);
    expect(steps[0].hasDataTable).toBe(true);
  });

  it('parses Turkish via # language: tr', () => {
    const doc = [
      '# language: tr',
      'Özellik: f',
      '  Senaryo: s',
      '    Diyelim ki uygulama çalışıyor',
      '    Eğer ki butona basarım',
      '    O zaman ekranı görürüm',
      '    Ve bir şey olur',
      '    Fakat başka bir şey olmaz',
    ].join('\n');
    const { steps, language } = parseFeature(doc);
    expect(language).toBe('tr');
    expect(steps.map((s) => s.text)).toEqual([
      'uygulama çalışıyor',
      'butona basarım',
      'ekranı görürüm',
      'bir şey olur',
      'başka bir şey olmaz',
    ]);
    expect(steps.map((s) => s.keyword)).toEqual(['given', 'when', 'then', 'then', 'then']);
  });

  it('accepts * steps and inherits the previous keyword', () => {
    const doc = ['Feature: f', '  Scenario: s', '    Given a', '    * b'].join('\n');
    const { steps } = parseFeature(doc);
    expect(steps.map((s) => s.keyword)).toEqual(['given', 'given']);
    expect(steps[1].keywordText).toBe('*');
  });
});
