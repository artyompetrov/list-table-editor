import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.openTableEditor', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const document = editor.document;
                // Get the document text
                const documentText = editor.document.getText();

                // Get the cursor position
                const cursorPosition = editor.selection.active;
                
                // Find the start of the list-table by searching upwards
                let startTablePosition = documentText.lastIndexOf(':::{list-table}', editor.document.offsetAt(cursorPosition));
                if (startTablePosition === -1) {
                    vscode.window.showErrorMessage('Start of the table (::: {list-table}) not found.');
                    return;
                }
            
                // Find the end of the list-table by searching downwards
                let endTablePosition = documentText.indexOf(':::', editor.document.offsetAt(cursorPosition));
                if (endTablePosition === -1) {
                    vscode.window.showErrorMessage('End of the table (::: end) not found.');
                    return;
                }

                // Get the text between startTablePosition and endTablePosition
                const startSelectionPos = editor.document.positionAt(startTablePosition);
                const endSelectionPos = editor.document.positionAt(endTablePosition + 3); // Include ':::' in the selection
                const selectedText = document.getText(new vscode.Range(startSelectionPos, endSelectionPos));

                // Ensure the file is a Markdown file
                if (document.languageId !== 'markdown') {
                    vscode.window.showErrorMessage('This command can be run only for Markdown-files.');
                    return;
                }

                // Parse the table content between the markers
                const parsedTable = parseListTable(selectedText);

                // Create and show the webview panel for table editing
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

                // Handle messages from the webview
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
    const lines = tableText.split('\n');
    let currentRow: any = null;
    let currentColIndex = 1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Проверяем начало новой строки таблицы
        if (/^\*\s+-\s+/.test(line)) {
            // Сохраняем предыдущую строку, если она есть
            if (currentRow) {
                rows.push(currentRow);
            }
            currentRow = {};
            currentColIndex = 1;
            const cellContent = line.replace(/^\*\s+-\s+/, '').trim();
            currentRow[`col${currentColIndex}`] = cellContent;
        }
        // Проверяем начало новой ячейки в той же строке
        else if (/^\s+-\s+/.test(line)) {
            currentColIndex++;
            const cellContent = line.replace(/^\s+-\s+/, '').trim();
            currentRow[`col${currentColIndex}`] = cellContent;
        }
        // Проверяем продолжение ячейки (многострочный текст)
        else if (/^\s{4,}/.test(line)) {
            const continuationContent = line.trim();
            if (currentRow && currentRow[`col${currentColIndex}`]) {
                currentRow[`col${currentColIndex}`] += '\n' + continuationContent;
            }
        }
    }

    // Добавляем последнюю строку, если она есть
    if (currentRow) {
        rows.push(currentRow);
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
        newTableText += '* - ' + Object.values(row)
            .map(element => String(element).split('\n').join('\n    '))
            .join('\n  - ') + '\n';
    });

    // Normalize line endings to CRLF if needed
    newTableText = newTableText.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
    newTableText = ":::{list-table}\n" + newTableText + ":::";

    // Get the document text
    const documentText = editor.document.getText();

    // Get the cursor position
    const cursorPosition = editor.selection.active;

    // Find the start of the list-table by searching upwards
    let startTablePosition = documentText.lastIndexOf(':::{list-table}', editor.document.offsetAt(cursorPosition));
    if (startTablePosition === -1) {
        vscode.window.showErrorMessage('Start of the table (::: {list-table}) not found.');
        return;
    }

    // Find the end of the list-table by searching downwards
    let endTablePosition = documentText.indexOf(':::', editor.document.offsetAt(cursorPosition));
    if (endTablePosition === -1) {
        vscode.window.showErrorMessage('End of the table (::: end) not found.');
        return;
    }

    // Adjust positions to ensure we are selecting the full range of text
    const startSelectionPos = editor.document.positionAt(startTablePosition);
    const endSelectionPos = editor.document.positionAt(endTablePosition + 3); // Include ':::' in the selection

    // Create an edit to replace the selected text with new table text
    const edit = new vscode.WorkspaceEdit();
    const tableRange = new vscode.Range(startSelectionPos, endSelectionPos);
    edit.replace(editor.document.uri, tableRange, newTableText);

    // Apply the edit
    vscode.workspace.applyEdit(edit).then(success => {
        if (success) {
            // Set the new cursor position to be right after `::{list-table}`
            const newCursorPos = editor.document.positionAt(startTablePosition + '::{list-table}\n'.length);
            
            // Update the selection to the new cursor position
            editor.selection = new vscode.Selection(newCursorPos, newCursorPos);
            
            // Reveal the new cursor position in the editor
            editor.revealRange(new vscode.Range(newCursorPos, newCursorPos), vscode.TextEditorRevealType.InCenter);
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
