import { findTrailingSpaceMatches } from '../src/extension';

describe('findTrailingSpaceMatches', () => {
  it('returns an empty array for an empty string', () => {
    expect(findTrailingSpaceMatches('')).toEqual([]);
  });

  it('returns an empty array when there are no trailing spaces', () => {
    expect(findTrailingSpaceMatches('hello world')).toEqual([]);
  });

  it('does not detect spaces in the middle of a string', () => {
    expect(findTrailingSpaceMatches('hello world\nfoo bar')).toEqual([]);
  });

  it('detects a single trailing space', () => {
    const result = findTrailingSpaceMatches('hello ');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ index: 5, length: 1 });
  });

  it('detects multiple trailing spaces as a single match', () => {
    const result = findTrailingSpaceMatches('hello   ');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ index: 5, length: 3 });
  });

  it('detects trailing tabs', () => {
    const result = findTrailingSpaceMatches('hello\t');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ index: 5, length: 1 });
  });

  it('detects mixed trailing spaces and tabs as a single match', () => {
    const result = findTrailingSpaceMatches('hello \t ');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ index: 5, length: 3 });
  });

  it('detects whitespace-only lines', () => {
    const result = findTrailingSpaceMatches('   ');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ index: 0, length: 3 });
  });

  it('detects only lines with trailing spaces across multiple lines', () => {
    // "hello  \nworld  "
    // h=0 e=1 l=2 l=3 o=4 ' '=5 ' '=6 \n=7
    // w=8 o=9 r=10 l=11 d=12 ' '=13 ' '=14
    const result = findTrailingSpaceMatches('hello  \nworld  ');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ index: 5, length: 2 });
    expect(result[1]).toEqual({ index: 13, length: 2 });
  });

  it('detects only lines with trailing spaces when mixed with clean lines', () => {
    // "hello  \nworld\nfoo  "
    // h=0 e=1 l=2 l=3 o=4 ' '=5 ' '=6 \n=7
    // w=8 o=9 r=10 l=11 d=12 \n=13
    // f=14 o=15 o=16 ' '=17 ' '=18
    const result = findTrailingSpaceMatches('hello  \nworld\nfoo  ');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ index: 5, length: 2 });
    expect(result[1]).toEqual({ index: 17, length: 2 });
  });

  it('returns an empty array when multiple lines have no trailing spaces', () => {
    expect(findTrailingSpaceMatches('hello\nworld\nfoo')).toEqual([]);
  });

  it('does not detect carriage return as trailing whitespace in CRLF lines', () => {
    // \r is not in [ \t], so CRLF line endings are not flagged
    expect(findTrailingSpaceMatches('hello\r\n')).toEqual([]);
  });

  it('detects trailing spaces before carriage return in CRLF text', () => {
    // spaces before \r\n are still trailing whitespace
    const result = findTrailingSpaceMatches('hello  \r\n');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ index: 5, length: 2 });
  });
});
