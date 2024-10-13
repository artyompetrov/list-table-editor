import { Tabulator, Editor } from 'tabulator-tables';
import "vscode-webview"


(function () {
    const vscode = acquireVsCodeApi();


    const tableDataElement = document.getElementById('table-data');
    
    if (!tableDataElement) {
        console.error('Element with id "table-data" not found');
        return;
    }


    const tableData: any[] = JSON.parse(tableDataElement.textContent || '[]');


    const columns = Object.keys(tableData[0] || {}).map((key) => {
        return { title: key, field: key, editor: "input" as Editor };  // Явно указываем тип для редактора
    });

    // Создаем таблицу с помощью Tabulator
    const table = new Tabulator("#table", {
        data: tableData,
        layout: "fitColumns",
        columns: columns,
        selectable: false,
        autoResize: true
    });

    // Добавляем обработчик для кнопки сохранения
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            const data = table.getData();
            vscode.postMessage({ command: 'updateTable', data: data });
        });
    } else {
        console.error('Save button not found');
    }
})();
