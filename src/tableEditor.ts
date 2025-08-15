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
                .replace(/ /g, '·')
                .replace(/\n/g, '↵<br>');

        
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
        // Исходное (реальное) значение ячейки
        const originalValue = (cell.getValue() || "").toString();
      
        // Создаём <textarea>
        const input = document.createElement("textarea");
        input.style.width = "100%";
        input.style.height = "100%";
        input.style.resize = "none";
        input.style.padding = "3px";
        input.style.boxSizing = "border-box";
      
        // Показываем «·» вместо пробелов и «↵\n» вместо \n
        input.value = showInvisibleChars(originalValue);
      
        // Фокусируем, когда элемент готов
        onRendered(() => {
          input.focus();
        });
      
        // При выходе из фокуса — завершаем (сохраняем)
        input.addEventListener("blur", finishEditing);

        input.addEventListener("copy", (e: ClipboardEvent) => {
            // Получим границы выделения
            const start = input.selectionStart ?? 0;
            const end = input.selectionEnd ?? 0;
          
            // Если действительно что-то выделено
            if (end > start) {
              // Берём «визуальный» текст из textarea
              const selectedText = input.value.substring(start, end);
          
              // Превращаем обратно в «чистый» текст
              const realText = hideInvisibleChars(selectedText);
          
              // Кладём наш "очищенный" текст в буфер обмена
              // (нужно отменить действие по умолчанию, иначе браузер скопирует как есть)
              e.preventDefault();
          
              // В некоторых браузерах clipboardData может быть undefined — проверьте
              // (для безопасности или полифилы). В современном Chrome/Firefox всё работает.
              if (e.clipboardData) {
                e.clipboardData.setData("text/plain", realText);
              }
            }
          });
      
      
        // Специальный флаг для Shift+Enter
        let lastWasEnter = false;
      
        // ---- Обработка нажатий клавиш, преобразование «на лету» ----
        input.addEventListener("keydown", (e) => {
            // Если зажата Ctrl или Meta (Cmd на Mac), пропускаем «на лету» обработку
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
                return;
            }

          // Сбросим флаг перед каждой клавишей
          lastWasEnter = false;
      
          // Если это Enter
          if (e.key === "Enter") {
            lastWasEnter = true;
          }
      
          setTimeout(() => {
            // 1) Текущая позиция курсора
            let pos = input.selectionStart;
      
            // 2) Превращаем «визуалку» (·, ↵) обратно в реальный текст
            const currentInvisible = input.value;
            const realValue = hideInvisibleChars(currentInvisible);
      
            // 3) Снова делаем showInvisibleChars
            let replaced = showInvisibleChars(realValue);
      
            // 4) Если это **НЕ** Shift+Enter, и мы оказались "за ↵", — сдвигаем назад
            //    Но если Shift+Enter — наоборот, хотим перейти на новую строку
            if (!lastWasEnter && pos > 0 && replaced[pos - 1] === "↵") {
              // «запрещаем» курсор быть за ↵
              pos--;
            } else if (lastWasEnter) {
              // При Shift+Enter добавили реальный \n в строку, который
              // превратился в "↵\n" = 2 символа
              //
              // Чтобы курсор оказался "после" этого \n, двигаемся ещё на 2 символа,
              // т.е. начинаем следующую строку
              pos += 2;
            }
      
            // 5) Запишем новое значение в <textarea>
            input.value = replaced;
      
            // 6) Проверим выход за границы
            if (pos < 0) pos = 0;
            if (pos > replaced.length) pos = replaced.length;
      
            // 7) Возвращаем курсор
            input.selectionStart = pos;
            input.selectionEnd = pos;
          }, 0);
        });
      
        // ---- Если пользователь кликает мышью или двигает курсор стрелками ----
        // тоже чиним «курсор за ↵», но **не** трогаем, если последнее было Shift+Enter
        // (иначе можем потерять переход на новую строку)
        input.addEventListener("mouseup", () => {
          setTimeout(() => {
            if (!lastWasEnter) {
              fixCursorIfBehindArrow();
            }
          }, 0);
        });
        input.addEventListener("keyup", (e) => {
          setTimeout(() => {
            // Если пользователь не нажал (Shift+Enter), можно «чинить»
            if (!(e.key === "Enter" && e.shiftKey)) {
              fixCursorIfBehindArrow();
            }
          }, 0);
        });
      
        function fixCursorIfBehindArrow() {
          // Если выделение есть (selectionStart != selectionEnd), не трогаем
          if (input.selectionStart !== input.selectionEnd) return;
      
          let pos = input.selectionStart;
          const replaced = input.value;
      
          if (pos > 0 && replaced[pos - 1] === "↵") {
            pos--;
            if (pos < 0) pos = 0;
            input.selectionStart = pos;
            input.selectionEnd = pos;
          }
        }
      
        // ---- Завершение редактирования ----
        function finishEditing() {
          // Убираем «·» и «↵» => возвращаем обычные пробелы и переносы
          const finalValue = hideInvisibleChars(input.value);
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

    // пересчет размера ячеек
    table.on("cellEdited", function (cell) {
        // cell - объект CellComponent, если нужно
        table.redraw(true); // true - полностью пересчитать всё
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
