import { Tabulator, ColumnDefinition, EditModule  } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import './tabulator.css';

interface vscode {
    postMessage(message: any): void;
}

declare const vscode: vscode;

Tabulator.registerModule([EditModule]);

(function () {

    const tableDataElement = document.getElementById('table-data');
    
    if (!tableDataElement) {
        console.error('Element with id "table-data" not found');
        return;
    }

    

    const tableData: any[] = JSON.parse(tableDataElement.textContent || '[]');

    // Создаем таблицу с помощью Tabulator
    const table = new Tabulator("#table", {
        data: tableData,
        resizableColumnFit:true,
        resizableRows:true,
        columnDefaults:{
            maxWidth:700,
            editor: "textarea",
            editorParams: {
                
            }
        },
        layout: "fitDataFill",
        selectable: true,
        movableColumns:true, 
        height: "100%", 
        autoResize: true,
        autoColumns:true, 
        history:true,  
        headerVisible: false,
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
