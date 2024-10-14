import { TabulatorFull, EditModule, MoveRowsModule, MoveColumnsModule, Formatter, CellComponent, InteractionModule  } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import './tabulator.css';

interface vscode {
    postMessage(message: any): void;
}

TabulatorFull.registerModule([EditModule, MoveRowsModule, MoveColumnsModule, InteractionModule]);

function emptyToSpace(value:string){
    return value === null || typeof value === "undefined" || value === "" ? "&nbsp;" : value;
}

function sanitizeHTML(value:string){
    if(value){
        var entityMap:{[key:string]:string} = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };
        
        return String(value).replace(/[&<>"'`=/]/g, function (s) {
            return entityMap[s];
        });
    }else{
        return value;
    }
}

(function () {
    // @ts-ignore
    const vscode: vscode = acquireVsCodeApi();
    const tableDataElement = document.getElementById('table-data');
    
    if (!tableDataElement) {
        console.error('Element with id "table-data" not found');
        return;
    }


    const customTextAreaFormatter: Formatter = function(cell: CellComponent, formatterParams, onRendered){
        cell.getElement().style.whiteSpace = "pre-wrap";

        onRendered(function(){
            cell.getElement().style.height = "0px";
        });

        return emptyToSpace(sanitizeHTML(cell.getValue())).trim()
                .replace(/ /g, '<span class="invisible-symbol">·</span>')
                .replace(/\n/g, '<span class="invisible-symbol">↵</span>\n');

        
    }

    const tableData: any[] = JSON.parse(tableDataElement.textContent || '[]');
    let i = 0;
    // Создаем таблицу с помощью Tabulator
    const table = new TabulatorFull("#table", {
        
        data: tableData,
        resizableColumnFit:true,
        resizableRows:true,
        rowHeader:{
            headerSort:false, resizable: false, minWidth:30, rowHandle:true, formatter:"rownum"
        },
        columnDefaults:{
            maxWidth:700,
            editor: "textarea",
            headerSort: false,
            formatter: "textarea" /* customTextAreaFormatter*/,
            headerContextMenu: 
            [
                {
                    label:'<span style="color: red;">DELETE</span>',
                    
                    action:function(e, column){
                        table.deleteColumn(column);
                    }
                },
                {
                    separator:true,
                },
                {
                    
                    label:'<span style="color: blue;">add &larr;</span>',
                    action:function(e, column){
                        i ++;
                        table.addColumn({title: "new"+i, field: "new"+i}, true, column);
                    }
                },
                {
                    label:'<span style="color: blue;">add &rarr;</span>',
                    action:function(e, column){
                        i ++;
                        table.addColumn({title: "new"+i, field: "new"+i}, false, column);
                    }
                }
    
            ]
            
        },
        layout: "fitDataFill",
        selectable: true,
        movableColumns:true, 
        movableRows: true,
        autoResize: true,
        autoColumns:true, 
        history:true,  
        headerVisible: true,        
        rowContextMenu: [
            {
                label:'<span style="color: red;">DELETE</span>',
                
                action:function(e, row){
                    table.deleteRow(row);
                }
            },
            {
                separator:true,
            },
            {

                label:'<span style="color: blue;">add &uarr;</span>',
                action:function(e, row){
                    table.addRow({}, true, row);
                }
            },
            {
                label:'<span style="color: blue;">add &darr;</span>',
                action:function(e, row){
                    table.addRow({}, false, row);
                }
            }

        ],
        
    });

    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        console.log('Save button not found');
        saveButton.addEventListener('click', () => {
            const data = table.getData();

            let columns = table.getColumnDefinitions(); // Получаем все определения колонок
        let tableData = data.map(row => {
            let rowData : {[key:string]: string} = {};
            let i = 0;
            columns.forEach(col => {
                if (i != 0) {
                    let field = "col" + i;
                    rowData[field] = row.hasOwnProperty(col.field) ? (row[col.field!] ?? "") : ""; // Если ячейка пустая, вставляем пустую строку
                }
                i++;
            });
            return rowData;
        });
        
        vscode.postMessage({ command: 'updateTable', data: tableData });
        });
    } else {
        console.error('Save button not found');
    }


})();
