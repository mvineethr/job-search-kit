import { describe, it, expect } from 'vitest';
import { extractJsonObject, proseBefore } from '@/lib/extract-json';

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
