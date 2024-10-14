import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.openTableEditor', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const document = editor.document;
                const selectedText = document.getText(editor.selection);

                if (document.languageId !== 'markdown') {
                    vscode.window.showErrorMessage('This command can be run only for Markdown-files.');
                    return;
                }

                if (selectedText.trim().length === 0) {
                    vscode.window.showErrorMessage('Please select the table content.');
                    return;
                }

                const parsedTable = parseListTable(selectedText);

                const panel = vscode.window.createWebviewPanel(
                    'tableEditor',
                    'Table Editor',
                    vscode.ViewColumn.Beside,
                    {
                        enableScripts: true,
                        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
                    }
                );

                panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, parsedTable);

                panel.webview.onDidReceiveMessage(
                    message => {
                        switch (message.command) {
                            case 'updateTable':
                                updateTableInDocument(editor, message.data);
                                break;
                        }
                    },
                    undefined,
                    context.subscriptions
                );
            } else {
                vscode.window.showErrorMessage('No active editor found.');
            }
        })
    );
}

function parseListTable(tableText: string): any[] {
    const rows: any[] = [];
    const rowRegex = /\*\s+-\s+([^\n]+)((?:\s+-\s+[^\n]+)*)/g;
    let match: RegExpExecArray | null;

    while ((match = rowRegex.exec(tableText)) !== null) {
        const row: any = {};
        row['col1'] = match[1];
        if (match[2]) {
            const additionalCells = match[2].match(/\s+-\s+([^\n]+)/g);
            if (additionalCells) {
                additionalCells.forEach((cellMatch, index) => {
                    const cellContent = cellMatch.replace(/\s+-\s+/, '');
                    row[`col${index + 2}`] = cellContent;
                });
            }
        }
        rows.push(row);
    }

    return rows;
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, tableData: any[]) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'tableEditor.js'));

    const nonce = getNonce();

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy"
            content="default-src 'none'; img-src ${webview.cspSource} blob:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
        <style>
            body { font-family: sans-serif; }
            #table { margin-top: 20px; }
            #saveButton { margin-top: 10px; }
        </style>
    </head>
    <body>
        <div id="table-data" style="display: none;">${JSON.stringify(tableData)}</div>
        <div id="table"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>
    `;
}

function updateTableInDocument(editor: vscode.TextEditor, tableData: any[]) {
    // Convert data back to list-table format
    let newTableText = '';

    tableData.forEach(row => {
        newTableText += '* - ' + Object.values(row).map(element => String(element).split('\n').join('\n    ')).join('\n  - ') + '\n';
    });

    // Save the start position before the edit
    const startPos = editor.selection.start;

    // Create an edit to delete the selected text and insert new text
    const edit = new vscode.WorkspaceEdit();
    edit.delete(editor.document.uri, editor.selection);
    edit.insert(editor.document.uri, startPos, newTableText);

    // Apply the edit
    vscode.workspace.applyEdit(edit).then(success => {
        if (success) {
            // Calculate the new selection range
            const newStart = startPos;
            const newEnd = editor.document.positionAt(
                editor.document.offsetAt(startPos) + newTableText.length
            );

            // Set the new selection
            editor.selection = new vscode.Selection(newStart, newEnd);
            editor.revealRange(new vscode.Range(newStart, newEnd), vscode.TextEditorRevealType.InCenter);
        } else {
            vscode.window.showErrorMessage('Failed to update the table.');
        }
    });
}


function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export function deactivate() {}
