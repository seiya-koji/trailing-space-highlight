import * as vscode from 'vscode';

export function findTrailingSpaceMatches(text: string): Array<{ index: number; length: number }> {
  const matches: Array<{ index: number; length: number }> = [];
  const regexp = /[ \t]+$/gm;
  let match: RegExpExecArray | null;
  while ((match = regexp.exec(text)) !== null) {
    matches.push({ index: match.index, length: match[0].length });
  }
  return matches;
}

export function findTrailingSpaceRanges(document: vscode.TextDocument): vscode.Range[] {
  return findTrailingSpaceMatches(document.getText()).map(
    ({ index, length }) =>
      new vscode.Range(document.positionAt(index), document.positionAt(index + length))
  );
}

export function updateDecorations(
  editor: vscode.TextEditor,
  decoration: vscode.TextEditorDecorationType
): void {
  const decorations = findTrailingSpaceRanges(editor.document).map((range) => ({
    range,
    hoverMessage: new vscode.MarkdownString(
      `${range.end.character - range.start.character} trailing character(s)`
    ),
  }));
  editor.setDecorations(decoration, decorations);
}

export function activate(context: vscode.ExtensionContext): void {
  const decoration = vscode.window.createTextEditorDecorationType({
    borderRadius: '3px',
    borderWidth: '1px',
    borderStyle: 'solid',
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    borderColor: 'rgba(255, 0, 0, 0.6)',
  });
  context.subscriptions.push(decoration);

  if (vscode.window.activeTextEditor) {
    updateDecorations(vscode.window.activeTextEditor, decoration);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) updateDecorations(editor, decoration);
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document === event.document) {
          updateDecorations(editor, decoration);
        }
      }
    })
  );
}

export function deactivate(): void {
  // decoration is disposed automatically via context.subscriptions
}
