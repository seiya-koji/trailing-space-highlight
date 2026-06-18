import { vi } from 'vitest';

class Position {
  constructor(
    public readonly line: number,
    public readonly character: number
  ) {}
}

class Range {
  constructor(
    public readonly start: Position,
    public readonly end: Position
  ) {}

  get isEmpty(): boolean {
    return this.start.line === this.end.line && this.start.character === this.end.character;
  }
}

const window = {
  createTextEditorDecorationType: vi.fn(() => ({ dispose: vi.fn() })),
  activeTextEditor: undefined as unknown,
  visibleTextEditors: [] as unknown[],
  onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
  onDidChangeTextEditorSelection: vi.fn(() => ({ dispose: vi.fn() })),
};

const workspace = {
  onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
};

class MarkdownString {
  constructor(public readonly value: string) {}
}

export { window, workspace, Position, Range, MarkdownString };
