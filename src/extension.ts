import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.openTableEditor', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const document = editor.document;

                // Проверяем, что файл — это Markdown
                if (document.languageId !== 'markdown') {
                    vscode.window.showErrorMessage('Эта команда может быть выполнена только для Markdown-файлов.');
                    return;
                }

                const text = document.getText();

                // Ищем таблицу с помощью регулярного выражения
                const listTableRegex = /:::{list-table}[\s\S]*?:::/gm;
                const match = listTableRegex.exec(text);

                if (match) {
                    const tableText = match[0];
                    const parsedTable = parseListTable(tableText);

                    const panel = vscode.window.createWebviewPanel(
                        'tableEditor',
                        'Редактор таблицы',
                        vscode.ViewColumn.Beside,
                        {
                            enableScripts: true,
                            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
                        }
                    );

                    panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, parsedTable);

                    // Обработка сообщений из WebView
                    panel.webview.onDidReceiveMessage(
                        message => {
                            switch (message.command) {
                                case 'updateTable':
                                    updateTableInDocument(document, message.data);
                                    break;
                            }
                        },
                        undefined,
                        context.subscriptions
                    );
                } else {
                    vscode.window.showErrorMessage('В этом Markdown-файле не найдена list-table.');
                }
            } else {
                vscode.window.showErrorMessage('Активный редактор не найден.');
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
    // Подключаем Tabulator из локальных файлов
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'tabulator.min.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'tabulator.min.css'));

    const nonce = getNonce();

    return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <title>Редактор таблицы</title>
        <meta http-equiv="Content-Security-Policy"
            content="default-src 'none'; img-src ${webview.cspSource} blob:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
        <link href="${styleUri}" rel="stylesheet">
        <style>
            body { font-family: sans-serif; }
            #table { margin-top: 20px; }
            #saveButton { margin-top: 10px; }
        </style>
    </head>
    <body>
        <h1>Редактор таблицы</h1>
        <div id="table"></div>
        <button id="saveButton">Сохранить изменения</button>
        <script nonce="${nonce}" src="${scriptUri}"></script>
        <script nonce="${nonce}">
            (function () {
                const vscode = acquireVsCodeApi();

                const tableData = ${JSON.stringify(tableData)};

                // Определение колонок на основе ключей в данных
                const columns = Object.keys(tableData[0] || {}).map((key) => {
                    return { title: key, field: key, editor: "input" };
                });

                // Создание таблицы Tabulator
                const table = new Tabulator("#table", {
                    data: tableData,
                    layout: "fitColumns",
                    columns: columns,
                    selectable: false,
                    autoResize: true,
                    resizableColumns: true,
                });

                // Обработка события сохранения
                document.getElementById('saveButton').addEventListener('click', () => {
                    const data = table.getData();
                    vscode.postMessage({ command: 'updateTable', data: data });
                });
            })();
        </script>
    </body>
    </html>
    `;
}

function updateTableInDocument(document: vscode.TextDocument, tableData: any[]) {
    // Преобразование данных обратно в формат list-table
    let newTableText = ':::{list-table}\n';

    tableData.forEach(row => {
        newTableText += '*   - ' + Object.values(row).join('\n    - ') + '\n';
    });

    newTableText += ':::\n';

    // Обновление документа
    const edit = new vscode.WorkspaceEdit();
    const fullText = document.getText();
    const listTableRegex = /:::{list-table}[\s\S]*?:::/gm;
    const match = listTableRegex.exec(fullText);

    if (match) {
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].length);

        edit.replace(document.uri, new vscode.Range(startPos, endPos), newTableText);
        vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage('Таблица обновлена.');
    }
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
