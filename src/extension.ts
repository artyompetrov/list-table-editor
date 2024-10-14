import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.insertListTable', () => {
            const editor = vscode.window.activeTextEditor;

            if (editor) {
                // Шаблон таблицы в формате list-table
                const tableTemplate = `:::{list-table}\n\n` +
                    `* - \n\n` +
                    `  - \n\n` +
                    `* - \n\n` +
                    `  - \n\n` +
                    `:::\n`;

                // Вставляем таблицу в текущую позицию курсора
                editor.edit(editBuilder => {
                    editBuilder.insert(editor.selection.active, tableTemplate);
                }).then(success => {
                    if (success) {
                        vscode.window.showInformationMessage('Table inserted successfully!');
                    } else {
                        vscode.window.showErrorMessage('Failed to insert the table.');
                    }
                });
            } else {
                vscode.window.showErrorMessage('No active editor found.');
            }
        })
    );



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
                    'List Table Editor',
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

interface TableRow {
    [key: string]: string;
}

export function parseListTable(tableText: string): TableRow[] {
    const rows: TableRow[] = [];
    const lines = tableText.split('\n');
    let currentRow: TableRow | null = null;
    let currentColIndex = 0;

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === '' || trimmedLine === ':::{list-table}' || trimmedLine === ':::') {
            continue; // Пропускаем пустые строки, начало и конец таблицы
        }

        if (line.startsWith('* - ')) {
            // Начало новой строки
            if (currentRow !== null) {
                rows.push(currentRow);
            }
            currentRow = {};
            currentColIndex = 1;
            const cellContent = line.slice(4);
            currentRow[`col${currentColIndex}`] = cellContent.trimEnd();
        } else if (line.startsWith('  - ')) {
            // Новая ячейка в текущей строке
            if (currentRow === null) {
                throw new Error("New cell encountered without an active row.");
            }
            currentColIndex++;
            const cellContent = line.slice(4);
            currentRow[`col${currentColIndex}`] = cellContent.trimEnd();
        } else if (line.startsWith('    ')) {
            // Продолжение текущей ячейки
            if (currentRow === null || currentColIndex === 0) {
                throw new Error("Continuation encountered without an active cell.");
            }
            const additionalContent = line.slice(4);
            currentRow[`col${currentColIndex}`] += '\n' + additionalContent.trimEnd();
        } else {
            // Неожиданная ситуация
            throw new Error(`Unexpected line format: ${line}`);
        }
    }

    // Добавляем последнюю строку, если она существует
    if (currentRow !== null) {
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
            #saveButton { margin: 10px; }
        </style>
    </head>
    <body>
        <button id="saveButton">Сохранить</button>
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
            .map(element => String(element ?? "").split('\n').join('\n    '))
            .join('\n\n  - ') + '\n\n';
    });

    newTableText = ":::{list-table}\n\n" + newTableText + ":::";

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

            // Set the new cursor position to be right after `:::{list-table}`
            const newCursorPos = editor.document.positionAt(startTablePosition + ':::{list-table}\n'.length);
            
            // Update the selection to the new cursor position
            editor.selection = new vscode.Selection(newCursorPos, newCursorPos);
            
            // Reveal the new cursor position in the editor
            editor.revealRange(new vscode.Range(newCursorPos, newCursorPos), vscode.TextEditorRevealType.InCenter);

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
