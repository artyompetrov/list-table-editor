import { TabulatorFull, EditModule, MoveRowsModule, MoveColumnsModule, Formatter, CellComponent, InteractionModule, EmptyCallback, ValueBooleanCallback, ValueVoidCallback } from 'tabulator-tables';
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


    const paramLinesElement = document.getElementById('param-lines');
    
    if (!paramLinesElement) {
        console.error('Element with id "param-lines" not found');
        return;
    }

    const paramLines  = JSON.parse(paramLinesElement.textContent || '[]');

    const customTextAreaFormatter: Formatter = function(cell: CellComponent, formatterParams, onRendered){

        return emptyToSpace(sanitizeHTML(cell.getValue()))
                .replace(/ /g, '<span class="invisible-symbol">·</span>')
                .replace(/\n/g, '<span class="invisible-symbol">↵</span><br>');

        
    }

    function showInvisibleChars(str: string): string {
        // преобразуем пробелы и переводы строк
        return str
          .replace(/ /g, "·")
          .replace(/\n/g, "↵\n"); 
      }
      
      function hideInvisibleChars(str: string): string {
        // возвращаем обратно реальные пробелы и переводы строк
        return str
          .replace(/·/g, " ")
          // обратите внимание, что '\n' на самом деле тоже останется,
          // так как мы записали "↵\n", поэтому нужно сначала убрать "↵",
          // потом оставить сам перенос строки
          .replace(/↵/g, "");
    }


    function customInvisibleEditor(
        cell: CellComponent,
        onRendered: EmptyCallback,
        success: ValueBooleanCallback,
        cancel: ValueVoidCallback,
        editorParams: {}
      ) {
        // Текущее реальное значение ячейки
        const originalValue = (cell.getValue() || "").toString();
      
        // Создаём <textarea>
        const input = document.createElement("textarea");
      
        // Базовые стили, чтобы вписаться в ячейку (при необходимости расширяйте)
        input.style.width = "100%";
        input.style.height = "100%";
        input.style.padding = "3px";
        input.style.resize = "none"; // чтобы нельзя было вручную тянуть <textarea> за угол
      
        // Превращаем пробелы/переносы в "·" / "↵", чтобы при показе уже визуализировать
        input.value = showInvisibleChars(originalValue);
      
        // Когда редактор "отрисован", ставим фокус
        onRendered(() => {
          input.focus();
        });
      
        // При выходе из фокуса (blur) — сохраняем
        input.addEventListener("blur", () => {
          finishEditing();
        });
      
        // По Enter без Shift — сохраняем
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            finishEditing();
          }
        });
      
        // По Esc — отменяем
        input.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            cancel({});
          }
        });
      
        // ———————————————————————————————————————————————————
        // "На лету" меняем символы при каждом нажатии клавиши
        // ———————————————————————————————————————————————————
        input.addEventListener("keydown", () => {
          // Ждём, пока текст вставится (так как keydown ещё до изменения .value)
          setTimeout(() => {
            // 1) Запоминаем позицию курсора
            let pos = input.selectionStart;
      
            // 2) Получаем «видимый» в <textarea> текст, превращаем в обычный
            let currentInvisible = input.value;
            let realValue = hideInvisibleChars(currentInvisible);
      
            // 3) Снова отображаем как "·"/"↵"
            let replaced = showInvisibleChars(realValue);
      
            // 4) Устанавливаем .value
            input.value = replaced;
      
            // 5) Восстанавливаем курсор
            //  - Если pos вышел за пределы строки, ставим в конец
            if (pos > replaced.length) {
              pos = replaced.length;
            }
      
            // Устанавливаем selectionRange
            input.selectionStart = pos;
            input.selectionEnd = pos;
          }, 0);
        });
      
        // Когда пользователь «завершает» редактирование
        function finishEditing() {
          // При сохранении превращаем все "·"/"↵" обратно в реальные пробелы и \n
          let finalValue = hideInvisibleChars(input.value);
          success(finalValue);
        }
      
        return input;
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
            editor: /*"textarea"*/ customInvisibleEditor,
            headerSort: false,
            formatter: /*"textarea" */ customTextAreaFormatter,
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
        
        vscode.postMessage({ command: 'updateTable', params: paramLines, data: tableData });
        });
    } else {
        console.error('Save button not found');
    }


})();
