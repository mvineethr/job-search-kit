import { describe, it, expect } from 'vitest';
import { extractJsonObject, extractJsonArray, proseBefore } from '@/lib/extract-json';

describe('extractJsonObject', () => {
  it('reads a fenced json block', () => {
    const out = extractJsonObject('Here you go:\n```json\n{"name":"Priya"}\n```');
    expect(out).toEqual({ name: 'Priya' });
  });

  it('reads a fence with no language tag', () => {
    expect(extractJsonObject('```\n{"name":"Priya"}\n```')).toEqual({ name: 'Priya' });
  });

  it('reads an unfenced object surrounded by prose', () => {
    const out = extractJsonObject('Sure thing. {"name":"Priya"} Hope that helps.');
    expect(out).toEqual({ name: 'Priya' });
  });

  it('handles braces inside string values', () => {
    const out = extractJsonObject('```json\n{"summary":"Uses {braces} in text"}\n```');
    expect(out).toEqual({ summary: 'Uses {braces} in text' });
  });

  it('returns null when there is no JSON', () => {
    expect(extractJsonObject('I could not do that.')).toBeNull();
  });

  it('returns null for a bare array, since callers expect an object', () => {
    expect(extractJsonObject('```json\n[1,2,3]\n```')).toBeNull();
  });

  it('returns null for malformed JSON rather than throwing', () => {
    expect(extractJsonObject('```json\n{"name": \n```')).toBeNull();
  });
});

describe('proseBefore', () => {
  it('returns the text before the fence', () => {
    expect(proseBefore('I reordered your skills.\n\n```json\n{}\n```')).toBe(
      'I reordered your skills.',
    );
  });

  it('returns everything when there is no fence', () => {
    expect(proseBefore('Just a note.')).toBe('Just a note.');
  });
});

describe('extractJsonArray', () => {
  it('reads a fenced json array', () => {
    expect(extractJsonArray('```json\n[{"id":"m1"}]\n```')).toEqual([{ id: 'm1' }]);
  });

  it('reads an unfenced array surrounded by prose', () => {
    expect(extractJsonArray('Here: [1,2,3] done')).toEqual([1, 2, 3]);
  });

  it('returns null for an object, since callers expect a list', () => {
    expect(extractJsonArray('```json\n{"a":1}\n```')).toBeNull();
  });

  it('returns null for malformed json', () => {
    expect(extractJsonArray('```json\n[{"a": \n```')).toBeNull();
  });

  // The bug this fixes: array-returning prompts were run through the object
  // extractor, which rejects arrays, so questions silently fell back to generic ones.
  it('handles a list of question objects with brackets inside strings', () => {
    const out = extractJsonArray('```json\n[{"q":"what goes in [METRIC NEEDED]?"}]\n```');
    expect(out).toEqual([{ q: 'what goes in [METRIC NEEDED]?' }]);
  });
});
