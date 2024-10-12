import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.openTableEditor', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const document = editor.document;

                // Проверяем, что файл — это Markdown
                if (document.languageId !== 'markdown') {
                    vscode.window.showErrorMessage('This command can only be run on Markdown files.');
                    return;
                }

                // Получаем позицию курсора
                const cursorPosition = editor.selection.active;
                const documentText = document.getText();

                // Ищем назад до начала таблицы
                const startTable = findStartOfTable(documentText, cursorPosition);

                // Ищем вперед до конца таблицы
                const endTable = findEndOfTable(documentText, cursorPosition);

                if (startTable !== -1 && endTable !== -1) {
                    // Извлекаем текст таблицы между найденными границами
                    const tableText = documentText.substring(startTable, endTable);

                    // Открываем WebView для редактирования таблицы
                    const panel = vscode.window.createWebviewPanel(
                        'tableEditor',
                        'Table Editor',
                        vscode.ViewColumn.Beside,
                        { enableScripts: true }
                    );

                    panel.webview.html = getWebviewContent(parseListTable(tableText));
                    console.log("Opened WebView for editing list-table.");
                } else {
                    vscode.window.showErrorMessage('No list-table found around the cursor position.');
                }
            } else {
                vscode.window.showErrorMessage('No active editor found.');
            }
        })
    );
}

// Поиск начала таблицы назад от позиции курсора
function findStartOfTable(text: string, position: vscode.Position): number {
    const lines = text.split('\n');
    let lineIndex = position.line;

    while (lineIndex >= 0) {
        if (lines[lineIndex].includes(':::{list-table}')) {
            return text.indexOf(':::{list-table}', text.indexOf(lines[lineIndex]));
        }
        lineIndex--;
    }

    return -1; // Начало таблицы не найдено
}

// Поиск конца таблицы вперед от позиции курсора
function findEndOfTable(text: string, position: vscode.Position): number {
    const lines = text.split('\n');
    let lineIndex = position.line;

    while (lineIndex < lines.length) {
        if (lines[lineIndex].includes(':::')) {
            return text.indexOf(':::', text.indexOf(lines[lineIndex])) + 3; // включаем конец таблицы
        }
        lineIndex++;
    }

    return -1; // Конец таблицы не найден
}

// Функция парсинга текста таблицы
function parseListTable(tableText: string): string[][] {
    const rows: string[][] = [];
    const rowRegex = /\*\s+-\s+([^\n]+)((\s+-\s+[^\n]+)*)/g;
    let match: RegExpExecArray | null;

    // Парсим строки таблицы
    while ((match = rowRegex.exec(tableText)) !== null) {
        const row = match[0].split(/\s+-\s+/).slice(1); // Убираем маркер и пустые строки
        rows.push(row);
    }

    return rows;
}

// Генерация контента для WebView
function getWebviewContent(tableData: string[][]) {
    let tableHTML = '<table id="editableTable" border="1" style="width:100%; border-collapse: collapse; position: relative;">';

    // Добавляем строки
    tableData.forEach((row, rowIndex) => {
        tableHTML += '<tr>';
        row.forEach((cell, cellIndex) => {
            tableHTML += `<td contenteditable="true" style="position: relative;">${cell}`;

            // Добавляем кнопки для первого ряда (добавление столбцов)
            if (rowIndex === 0) {
                tableHTML += `
                    <div class="control-button add-column-left" title="Add Column Left">+ L</div>
                    <div class="control-button add-column-right" title="Add Column Right">+ R</div>`;
            }

            // Добавляем кнопки для первого столбца (добавление строк)
            if (cellIndex === 0) {
                tableHTML += `
                    <div class="control-button add-row-top" title="Add Row Above">+ ↑</div>
                    <div class="control-button add-row-bottom" title="Add Row Below">+ ↓</div>`;
            }

            tableHTML += `</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</table>';

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Table Editor</title>
            <style>
                td {
                    padding: 8px;
                    text-align: left;
                    position: relative;
                }
                th {
                    background-color: #f2f2f2;
                    padding: 8px;
                }
                .control-button {
                    position: absolute;
                    width: 24px;
                    height: 24px;
                    background-color: #007acc;
                    color: white;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 10px;
                }
                .control-button.add-column-left {
                    top: -12px;
                    left: -28px;
                    transform: translate(-50%, -50%);
                }
                .control-button.add-column-right {
                    top: -12px;
                    left: calc(100% + 14px);
                    transform: translate(-50%, -50%);
                }
                .control-button.add-row-top {
                    left: -12px;
                    top: -28px;
                    transform: translate(-50%, -50%);
                }
                .control-button.add-row-bottom {
                    left: -12px;
                    top: calc(100% + 14px);
                    transform: translate(-50%, -50%);
                }
            </style>
        </head>
        <body>
            <h1>Edit List Table</h1>
            ${tableHTML}
            <script>
                function addControlButtonsToCell(cell, rowIndex, cellIndex) {
                    // Добавляем кнопки для первого ряда (добавление столбцов)
                    if (rowIndex === 0) {
                        const addColumnLeftButton = document.createElement('div');
                        addColumnLeftButton.className = 'control-button add-column-left';
                        addColumnLeftButton.innerText = '+ L';
                        addColumnLeftButton.title = "Add Column Left";
                        cell.appendChild(addColumnLeftButton);

                        const addColumnRightButton = document.createElement('div');
                        addColumnRightButton.className = 'control-button add-column-right';
                        addColumnRightButton.innerText = '+ R';
                        addColumnRightButton.title = "Add Column Right";
                        cell.appendChild(addColumnRightButton);

                        // Добавляем обработчики для добавления столбцов
                        addColumnLeftButton.addEventListener('click', () => addColumn(cellIndex, 'left'));
                        addColumnRightButton.addEventListener('click', () => addColumn(cellIndex, 'right'));
                    }

                    // Добавляем кнопки для первого столбца (добавление строк)
                    if (cellIndex === 0) {
                        const addRowTopButton = document.createElement('div');
                        addRowTopButton.className = 'control-button add-row-top';
                        addRowTopButton.innerText = '+ ↑';
                        addRowTopButton.title = "Add Row Above";
                        cell.appendChild(addRowTopButton);

                        const addRowBottomButton = document.createElement('div');
                        addRowBottomButton.className = 'control-button add-row-bottom';
                        addRowBottomButton.innerText = '+ ↓';
                        addRowBottomButton.title = "Add Row Below";
                        cell.appendChild(addRowBottomButton);

                        // Добавляем обработчики для добавления строк
                        addRowTopButton.addEventListener('click', () => addRow(rowIndex, 'top'));
                        addRowBottomButton.addEventListener('click', () => addRow(rowIndex, 'bottom'));
                    }
                }

                function addColumn(cellIndex, position) {
                    const table = document.getElementById('editableTable');
                    for (let i = 0; i < table.rows.length; i++) {
                        const row = table.rows[i];
                        const newCell = position === 'left' ? row.insertCell(cellIndex) : row.insertCell(cellIndex + 1);
                        newCell.contentEditable = "true";
                        newCell.innerText = "New Cell";

                        // Добавляем кнопки для новой ячейки, если это первый ряд или первый столбец
                        addControlButtonsToCell(newCell, i, cellIndex);
                    }
                }

                function addRow(rowIndex, position) {
                    const table = document.getElementById('editableTable');
                    const rowCount = table.rows[0].cells.length;

                    const newRow = position === 'top' ? table.insertRow(rowIndex) : table.insertRow(rowIndex + 1);
                    for (let i = 0; i < rowCount; i++) {
                        const newCell = newRow.insertCell(i);
                        newCell.contentEditable = "true";
                        newCell.innerText = "New Cell";

                        // Добавляем кнопки для новой ячейки, если это первый ряд или первый столбец
                        addControlButtonsToCell(newCell, rowIndex, i);
                    }
                }

                document.querySelectorAll('td').forEach((cell, index) => {
                    const rowIndex = cell.parentElement.rowIndex;
                    const cellIndex = cell.cellIndex;

                    addControlButtonsToCell(cell, rowIndex, cellIndex);

                    cell.addEventListener('blur', () => {
                        console.log('Edited cell value:', cell.innerText);
                    });
                });
            </script>
        </body>
        </html>
    `;
}



export function deactivate() {}
