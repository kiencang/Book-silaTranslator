import { Component, input, model, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-markdown-table-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="flex flex-col space-y-4">
      @if (confirmDelete()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/20 backdrop-blur-sm">
          <div class="bg-white rounded-xl shadow-xl border border-zinc-200 max-w-sm w-full p-6 text-center animate-in fade-in zoom-in duration-200">
            <div class="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
              <mat-icon class="text-red-500">warning_amber</mat-icon>
            </div>
            <h3 class="text-lg font-medium text-zinc-900 mb-2">Xác nhận xóa</h3>
            <p class="text-sm text-zinc-500 mb-6">
              Bạn có chắc chắn muốn xóa {{ confirmDelete()?.type === 'row' ? 'hàng' : 'cột' }} này không?
            </p>
            <div class="flex items-center justify-center gap-3">
              <button 
                (click)="confirmDelete.set(null)"
                class="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Hủy
              </button>
              <button 
                (click)="executeDelete()"
                class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      }

      <div class="flex items-center justify-between">
        <span class="block text-xs font-semibold text-zinc-700 uppercase tracking-widest flex items-center">
          Nội dung (Có thể chỉnh sửa)
        </span>
        <div class="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
          <button 
            type="button"
            (click)="setMode('table')"
            [class.bg-white]="mode() === 'table'"
            [class.shadow-sm]="mode() === 'table'"
            class="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 text-zinc-700"
          >
            <mat-icon class="!w-4 !h-4 !text-[16px]">grid_on</mat-icon>
            Dạng bảng
          </button>
          <button 
            type="button"
            (click)="setMode('raw')"
            [class.bg-white]="mode() === 'raw'"
            [class.shadow-sm]="mode() === 'raw'"
            class="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 text-zinc-700"
          >
            <mat-icon class="!w-4 !h-4 !text-[16px]">code</mat-icon>
            Mã nguồn
          </button>
        </div>
      </div>
      
      <ng-content></ng-content>

      <div class="w-full">
        @if (mode() === 'raw') {
          <textarea 
            [value]="value()"
            (input)="onRawInput($event)"
            [disabled]="disabled()"
            rows="12" 
            class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 w-full sm:text-sm border border-zinc-300 rounded-lg bg-white disabled:bg-zinc-100 p-3 font-mono text-sm leading-relaxed"
            [placeholder]="placeholder()"></textarea>
        } @else {
          <div class="border border-zinc-300 rounded-lg bg-white overflow-hidden flex flex-col shadow-sm">
            @if (tableData().length === 0) {
              <div class="p-8 text-center text-zinc-500 pb-8 flex flex-col items-center">
                <mat-icon class="!w-8 !h-8 !text-[32px] mb-2 text-zinc-300">table_view</mat-icon>
                <p>Không tìm thấy bảng trong nội dung.</p>
                <button (click)="createEmptyTable()" class="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors">Tạo bảng trống</button>
              </div>
            } @else {
              <div class="overflow-x-auto w-full">
                <table class="w-full text-sm text-left relative">
                  <thead class="text-xs text-zinc-700 uppercase bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <th class="p-3 w-10 text-center font-medium bg-zinc-50 sticky left-0 z-10 border-r border-zinc-200">#</th>
                      @for (col of tableData()[0]; track $index; let colIndex = $index) {
                        <th class="p-0 border-r border-zinc-200 min-w-[150px] bg-zinc-50 relative group">
                          <input 
                            [value]="col" 
                            (input)="updateCell(0, colIndex, $event)"
                            [disabled]="disabled()"
                            class="w-full bg-transparent p-3 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-indigo-500 uppercase text-base"
                          />
                          <button 
                            (click)="removeColumn(colIndex)"
                            class="absolute top-1/2 -translate-y-1/2 right-2 w-6 h-6 flex items-center justify-center bg-white rounded shadow border border-zinc-200 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                            title="Xóa cột"
                          >
                            <mat-icon class="!w-4 !h-4 !text-[16px]">close</mat-icon>
                          </button>
                        </th>
                      }
                      <th class="p-2 w-10 text-center bg-zinc-50 border-r border-zinc-200">
                        <button (click)="addColumn()" title="Thêm cột" class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-zinc-200 text-zinc-500 transition-colors">
                          <mat-icon class="!w-4 !h-4 !text-[16px]">add</mat-icon>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of tableData().slice(1); track rowIndex; let rowIndex = $index) {
                      <tr class="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 group/row">
                        <td class="p-3 text-center text-zinc-400 font-mono text-xs bg-white group-hover/row:bg-zinc-50/50 sticky left-0 z-10 border-r border-zinc-200">
                          {{ rowIndex + 1 }}
                        </td>
                        @for (cell of row; track colIndex; let colIndex = $index) {
                          <td class="p-0 border-r border-zinc-100 relative group/cell align-top">
                            <div class="grid w-full min-h-[46px]">
                              <div class="invisible whitespace-pre-wrap col-start-1 row-start-1 p-3 text-base break-words pointer-events-none" aria-hidden="true">{{ cell + ' ' }}</div>
                              <textarea
                                  [value]="cell"
                                  (input)="updateCell(rowIndex + 1, colIndex, $event)"
                                  [disabled]="disabled()"
                                  rows="1"
                                  class="col-start-1 row-start-1 w-full h-full bg-transparent p-3 focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-indigo-500 resize-none overflow-hidden block text-base break-words"
                              ></textarea>
                            </div>
                          </td>
                        }
                        <td class="p-2 text-center align-middle border-r border-zinc-100">
                          <button (click)="removeRow(rowIndex + 1)" title="Xóa hàng" class="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-all mx-auto">
                            <mat-icon class="!w-4 !h-4 !text-[16px]">delete</mat-icon>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="px-4 py-3 border-t border-zinc-200 bg-zinc-50 flex items-center">
                <button (click)="addRow()" class="flex items-center space-x-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-indigo-50 transition-colors">
                  <mat-icon class="!w-4 !h-4 !text-[16px]">add</mat-icon>
                  <span>Thêm hàng</span>
                </button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class MarkdownTableEditorComponent {
  value = model<string>('');
  disabled = input<boolean>(false);
  placeholder = input<string>('Ví dụ:\n| Từ | Nghĩa |\n| --- | --- |');

  mode = signal<'table' | 'raw'>('table');
  tableData = signal<string[][]>([]);
  confirmDelete = signal<{type: 'row' | 'col', index: number} | null>(null);

  // Flag to prevent recursive updates
  private isUpdatingInternally = false;
  
  constructor() {
    effect(() => {
      const currentVal = this.value();
      if (!this.isUpdatingInternally && this.mode() === 'table') {
        this.parseMarkdownToTable(currentVal);
      }
    });
  }

  setMode(newMode: 'table' | 'raw') {
    if (newMode === 'table' && this.mode() === 'raw') {
      this.parseMarkdownToTable(this.value());
    } else if (newMode === 'raw' && this.mode() === 'table') {
      this.syncTableToMarkdown();
    }
    this.mode.set(newMode);
  }

  onRawInput(event: Event) {
    const newVal = (event.target as HTMLTextAreaElement).value;
    this.isUpdatingInternally = true;
    this.value.set(newVal);
    this.isUpdatingInternally = false;
  }

  updateCell(rowIndex: number, colIndex: number, event: Event) {
    const val = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    const currentData = [...this.tableData()];
    currentData[rowIndex][colIndex] = val;
    this.tableData.set(currentData);
    this.syncTableToMarkdown();
  }

  addRow() {
    const currentData = [...this.tableData()];
    if (currentData.length === 0) return;
    const cols = currentData[0].length;
    currentData.push(new Array(cols).fill(''));
    this.tableData.set(currentData);
    this.syncTableToMarkdown();
  }

  removeRow(rowIndex: number) {
    const row = this.tableData()[rowIndex];
    const hasContent = row && row.some(cell => cell.trim().length > 0);
    
    if (hasContent) {
      this.confirmDelete.set({ type: 'row', index: rowIndex });
    } else {
      const currentData = [...this.tableData()];
      currentData.splice(rowIndex, 1);
      this.tableData.set(currentData);
      this.syncTableToMarkdown();
    }
  }

  addColumn() {
    const currentData = this.tableData().map((row, index) => {
      const newRow = [...row];
      newRow.push(index === 0 ? 'Cột ' + (row.length + 1) : '');
      return newRow;
    });
    this.tableData.set(currentData);
    this.syncTableToMarkdown();
  }

  removeColumn(colIndex: number) {
    const currentData = this.tableData();
    let hasContent = false;
    for (let i = 1; i < currentData.length; i++) {
      if (currentData[i][colIndex] && currentData[i][colIndex].trim().length > 0) {
        hasContent = true;
        break;
      }
    }

    if (hasContent) {
      this.confirmDelete.set({ type: 'col', index: colIndex });
    } else {
      const newData = currentData.map(row => {
        const newRow = [...row];
        newRow.splice(colIndex, 1);
        return newRow;
      });
      if (newData.length > 0 && newData[0].length === 0) {
        this.tableData.set([]);
      } else {
        this.tableData.set(newData);
      }
      this.syncTableToMarkdown();
    }
  }

  executeDelete() {
    const toDelete = this.confirmDelete();
    if (!toDelete) return;

    if (toDelete.type === 'row') {
      const currentData = [...this.tableData()];
      currentData.splice(toDelete.index, 1);
      this.tableData.set(currentData);
      this.syncTableToMarkdown();
    } else if (toDelete.type === 'col') {
      const currentData = this.tableData().map(row => {
        const newRow = [...row];
        newRow.splice(toDelete.index, 1);
        return newRow;
      });
      if (currentData.length > 0 && currentData[0].length === 0) {
        this.tableData.set([]);
      } else {
        this.tableData.set(currentData);
      }
      this.syncTableToMarkdown();
    }
    
    this.confirmDelete.set(null);
  }

  createEmptyTable() {
    this.tableData.set([
      ['Cột 1', 'Cột 2'],
      ['', '']
    ]);
    this.syncTableToMarkdown();
  }

  private parseMarkdownToTable(markdown: string) {
    if (!markdown) {
      this.tableData.set([]);
      return;
    }
    
    // Convert `<br>` back to `\n` in case they were escaped
    // Actually we only unescape `<br>` because markdown tables don't support multiline directly.
    const lines = markdown.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.includes('|'));
    if (lines.length === 0) {
      this.tableData.set([]);
      return;
    }
    
    const parsedRows: string[][] = [];
    for (const line of lines) {
      if (/^[|\s\-:]+$/.test(line) && line.includes('-')) {
        continue; // delimiter line
      }
      let cleaned = line;
      if (cleaned.startsWith('|')) cleaned = cleaned.substring(1);
      if (cleaned.endsWith('|')) cleaned = cleaned.substring(0, cleaned.length - 1);
      
      const cells = cleaned.split('|').map(c => c.trim().replace(/<br\s*\/?>/gi, '\n'));
      parsedRows.push(cells);
    }
    
    if (parsedRows.length > 0) {
      const maxCols = Math.max(...parsedRows.map(r => r.length));
      for (const row of parsedRows) {
        while (row.length < maxCols) {
          row.push('');
        }
      }
    }
    this.tableData.set(parsedRows);
  }

  private syncTableToMarkdown() {
    const data = this.tableData();
    if (data.length === 0) return;

    let newTableStr = '';
    
    // Header
    const headers = data[0].map(h => h.replace(/\n/g, '<br>'));
    newTableStr += '| ' + headers.join(' | ') + ' |\n';
    
    // Delimiter
    newTableStr += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
    
    // Body
    for (let i = 1; i < data.length; i++) {
        // Escape newlines in cells
        const row = data[i].map(c => c.replace(/\n/g, '<br>'));
        newTableStr += '| ' + row.join(' | ') + ' |\n';
    }

    const original = this.value();
    if (!original) {
        this.isUpdatingInternally = true;
        this.value.set(newTableStr.trim());
        this.isUpdatingInternally = false;
        return;
    }
    
    const lines = original.split('\n');
    let tableStartIndex = -1;
    let tableEndIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (t.includes('|')) {
            if (tableStartIndex === -1) tableStartIndex = i;
            tableEndIndex = i;
        } else if (tableStartIndex !== -1) {
            if (t !== '') {
               break;
            } else {
               tableEndIndex = i;
            }
        }
    }

    let finalTableEnd = tableEndIndex;
    for (let i = tableEndIndex; i >= tableStartIndex && i >= 0; i--) {
        if (lines[i].trim().includes('|')) {
            finalTableEnd = i;
            break;
        }
    }

    let finalMarkdown;
    if (tableStartIndex !== -1) {
        // Replace
        const before = lines.slice(0, tableStartIndex).join('\n');
        const after = lines.slice(finalTableEnd + 1).join('\n');
        
        // ensure nice spacing
        finalMarkdown = (before ? before + '\n\n' : '') + newTableStr.trim() + (after ? '\n\n' + after.trimStart() : '');
    } else {
        // Append
        finalMarkdown = (original ? original + '\n\n' : '') + newTableStr.trim();
    }
    
    this.isUpdatingInternally = true;
    this.value.set(finalMarkdown);
    this.isUpdatingInternally = false;
  }
}
