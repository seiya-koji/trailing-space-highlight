import { vi, type MockInstance } from 'vitest';
import * as vscode from 'vscode';
import { findTrailingSpaceRanges, updateDecorations, activate, deactivate } from '../src/extension';

// ---- Helpers ----

function createMockDocument(lines: string[]) {
  const text = lines.join('\n');

  const positionAt = (offset: number) => {
    let remaining = offset;
    for (let i = 0; i < lines.length; i++) {
      if (remaining <= lines[i].length) {
        return new vscode.Position(i, remaining);
      }
      remaining -= lines[i].length + 1; // +1 for the newline character
    }
    const last = Math.max(0, lines.length - 1);
    return new vscode.Position(last, lines[last]?.length ?? 0);
  };

  return {
    getText: () => text,
    positionAt,
    lineAt: (lineOrPos: number | vscode.Position) => {
      const lineNum = typeof lineOrPos === 'number' ? lineOrPos : lineOrPos.line;
      const lineText = lines[lineNum] ?? '';
      return {
        text: lineText,
        lineNumber: lineNum,
        range: new vscode.Range(
          new vscode.Position(lineNum, 0),
          new vscode.Position(lineNum, lineText.length)
        ),
      };
    },
    validatePosition: (pos: vscode.Position) => pos,
  };
}

function createMockEditor(lines: string[]) {
  const document = createMockDocument(lines);
  const setDecorations = vi.fn();
  return {
    document,
    setDecorations,
  };
}

function setVisibleTextEditors(editors: unknown[]) {
  (vscode.window as unknown as { visibleTextEditors: unknown[] }).visibleTextEditors = editors;
}

// ---- Tests ----

beforeEach(() => {
  vi.clearAllMocks();
  setVisibleTextEditors([]);
});

describe('findTrailingSpaceRanges', () => {
  it('returns an empty array when there are no trailing spaces', () => {
    const doc = createMockDocument(['hello', 'world']);
    const ranges = findTrailingSpaceRanges(doc as unknown as vscode.TextDocument);
    expect(ranges).toHaveLength(0);
  });

  it('returns a Range at the correct position for a line with trailing spaces', () => {
    // "hello  " → spaces at index=5, length=2
    const doc = createMockDocument(['hello  ', 'world']);
    const ranges = findTrailingSpaceRanges(doc as unknown as vscode.TextDocument);
    expect(ranges).toHaveLength(1);
    expect(ranges[0].start.line).toBe(0);
    expect(ranges[0].start.character).toBe(5);
    expect(ranges[0].end.line).toBe(0);
    expect(ranges[0].end.character).toBe(7);
  });

  it('returns multiple Ranges when multiple lines have trailing spaces', () => {
    const doc = createMockDocument(['hello  ', 'world  ']);
    const ranges = findTrailingSpaceRanges(doc as unknown as vscode.TextDocument);
    expect(ranges).toHaveLength(2);
    expect(ranges[0].start.line).toBe(0);
    expect(ranges[1].start.line).toBe(1);
  });

  it('returns an empty array for an empty document', () => {
    const doc = createMockDocument(['']);
    const ranges = findTrailingSpaceRanges(doc as unknown as vscode.TextDocument);
    expect(ranges).toHaveLength(0);
  });

  it('returns a Range that includes trailing tabs', () => {
    const doc = createMockDocument(['foo\t']);
    const ranges = findTrailingSpaceRanges(doc as unknown as vscode.TextDocument);
    expect(ranges).toHaveLength(1);
    expect(ranges[0].start.character).toBe(3);
    expect(ranges[0].end.character).toBe(4);
  });
});

describe('updateDecorations', () => {
  it('applies decorations to lines with trailing spaces', () => {
    const editor = createMockEditor(['hello  ', 'world']);
    const decoration = vscode.window.createTextEditorDecorationType({});
    updateDecorations(editor as unknown as vscode.TextEditor, decoration);

    expect(editor.setDecorations).toHaveBeenCalledTimes(1);
    const decorations = editor.setDecorations.mock.calls[0][1];
    expect(decorations).toHaveLength(1);
    expect(decorations[0].range.start.line).toBe(0);
  });

  it('includes hoverMessage showing trailing character count', () => {
    const editor = createMockEditor(['hello  ', 'world']);
    const decoration = vscode.window.createTextEditorDecorationType({});
    updateDecorations(editor as unknown as vscode.TextEditor, decoration);

    const decorations = editor.setDecorations.mock.calls[0][1];
    expect(decorations[0].hoverMessage.value).toBe('2 trailing character(s)');
  });

  it('highlights all trailing spaces when multiple lines are affected', () => {
    const editor = createMockEditor(['hello  ', 'world  ', 'foo']);
    const decoration = vscode.window.createTextEditorDecorationType({});
    updateDecorations(editor as unknown as vscode.TextEditor, decoration);

    const decorations = editor.setDecorations.mock.calls[0][1];
    expect(decorations).toHaveLength(2);
  });

  it('sets empty decorations when there are no trailing spaces', () => {
    const editor = createMockEditor(['hello', 'world']);
    const decoration = vscode.window.createTextEditorDecorationType({});
    updateDecorations(editor as unknown as vscode.TextEditor, decoration);

    const decorations = editor.setDecorations.mock.calls[0][1];
    expect(decorations).toHaveLength(0);
  });

  it('applies decorations to whitespace-only lines', () => {
    const editor = createMockEditor(['   ', 'world']);
    const decoration = vscode.window.createTextEditorDecorationType({});
    updateDecorations(editor as unknown as vscode.TextEditor, decoration);

    const decorations = editor.setDecorations.mock.calls[0][1];
    expect(decorations).toHaveLength(1);
    expect(decorations[0].range.start.line).toBe(0);
  });
});

describe('activate', () => {
  it('updates decorations on activation when an active editor exists', () => {
    const mockEditor = createMockEditor(['hello  ']);
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = mockEditor;

    const mockContext = { subscriptions: { push: vi.fn() } } as unknown as vscode.ExtensionContext;
    activate(mockContext);

    expect(mockEditor.setDecorations).toHaveBeenCalled();
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = undefined;
  });

  it('does not throw when no active editor is present', () => {
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = undefined;
    const mockContext = { subscriptions: { push: vi.fn() } } as unknown as vscode.ExtensionContext;
    expect(() => activate(mockContext)).not.toThrow();
  });

  it('pushes decoration and 2 event listeners to subscriptions', () => {
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = undefined;
    const mockContext = { subscriptions: { push: vi.fn() } } as unknown as vscode.ExtensionContext;
    activate(mockContext);

    // 1st call: decoration, 2nd call: 2 event listeners
    expect(mockContext.subscriptions.push).toHaveBeenCalledTimes(2);
    expect((mockContext.subscriptions.push as unknown as MockInstance).mock.calls[1]).toHaveLength(
      2
    );
  });

  it('registers onDidChangeActiveTextEditor', () => {
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = undefined;
    const mockContext = { subscriptions: { push: vi.fn() } } as unknown as vscode.ExtensionContext;
    activate(mockContext);

    expect(vscode.window.onDidChangeActiveTextEditor).toHaveBeenCalled();
  });

  it('registers onDidChangeTextDocument', () => {
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = undefined;
    const mockContext = { subscriptions: { push: vi.fn() } } as unknown as vscode.ExtensionContext;
    activate(mockContext);

    expect(vscode.workspace.onDidChangeTextDocument).toHaveBeenCalled();
  });

  it('calls updateDecorations when onDidChangeActiveTextEditor fires with an editor', () => {
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = undefined;
    let capturedCallback: ((editor: unknown) => void) | undefined;
    (vscode.window.onDidChangeActiveTextEditor as unknown as MockInstance).mockImplementation(
      (cb: (editor: unknown) => void) => {
        capturedCallback = cb;
        return { dispose: vi.fn() };
      }
    );

    const mockContext = { subscriptions: { push: vi.fn() } } as unknown as vscode.ExtensionContext;
    activate(mockContext);

    const mockEditor = createMockEditor(['hello  ']);
    capturedCallback!(mockEditor);

    expect(mockEditor.setDecorations).toHaveBeenCalled();
  });

  it('does not throw when onDidChangeActiveTextEditor fires with undefined', () => {
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = undefined;
    let capturedCallback: ((editor: unknown) => void) | undefined;
    (vscode.window.onDidChangeActiveTextEditor as unknown as MockInstance).mockImplementation(
      (cb: (editor: unknown) => void) => {
        capturedCallback = cb;
        return { dispose: vi.fn() };
      }
    );

    const mockContext = { subscriptions: { push: vi.fn() } } as unknown as vscode.ExtensionContext;
    activate(mockContext);

    expect(() => capturedCallback!(undefined)).not.toThrow();
  });

  it('calls updateDecorations for matching editor in visibleTextEditors on document change', () => {
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = undefined;
    let capturedCallback: ((event: unknown) => void) | undefined;
    (vscode.workspace.onDidChangeTextDocument as unknown as MockInstance).mockImplementation(
      (cb: (event: unknown) => void) => {
        capturedCallback = cb;
        return { dispose: vi.fn() };
      }
    );

    const mockContext = { subscriptions: { push: vi.fn() } } as unknown as vscode.ExtensionContext;
    activate(mockContext);

    const mockEditor = createMockEditor(['hello  ']);
    setVisibleTextEditors([mockEditor]);

    capturedCallback!({ document: mockEditor.document });

    expect(mockEditor.setDecorations).toHaveBeenCalled();
  });

  it('skips updateDecorations when document does not match any visible editor', () => {
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = undefined;
    let capturedCallback: ((event: unknown) => void) | undefined;
    (vscode.workspace.onDidChangeTextDocument as unknown as MockInstance).mockImplementation(
      (cb: (event: unknown) => void) => {
        capturedCallback = cb;
        return { dispose: vi.fn() };
      }
    );

    const mockContext = { subscriptions: { push: vi.fn() } } as unknown as vscode.ExtensionContext;
    activate(mockContext);

    const mockEditor = createMockEditor(['hello  ']);
    setVisibleTextEditors([mockEditor]);

    const differentDoc = createMockDocument(['different']);
    capturedCallback!({ document: differentDoc });

    expect(mockEditor.setDecorations).not.toHaveBeenCalled();
  });
});

describe('deactivate', () => {
  it('does not throw', () => {
    expect(() => deactivate()).not.toThrow();
  });
});
