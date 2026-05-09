import { Component, inject, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { DbService, Project } from '../../core/db';
import { BookStore } from '../../core/book.store';
import { ToastService } from '../../core/toast.service';
import { DatePipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-project-modal',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-pointer" tabindex="0" (click)="close.emit()" (keydown.escape)="close.emit()">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden cursor-default" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80">
          <h2 class="text-xl font-bold text-gray-900">Quản lý dự án</h2>
          <div class="flex items-center gap-2">
            <button (click)="fileInput.click()" class="text-sm px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium transition-colors flex items-center gap-1">
              <span class="material-icons text-[18px]">file_upload</span> Nhập dự án
            </button>
            <input #fileInput type="file" accept=".json" class="hidden" (change)="importProject($event)" />
            <button (click)="close.emit()" class="text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center">
              <span class="material-icons !text-[20px] !w-5 !h-5 !flex !items-center !justify-center leading-none">close</span>
            </button>
          </div>
        </div>
        
        <div class="p-6 overflow-y-auto flex-1 bg-white">
          @if (isLoading()) {
            <div class="flex justify-center items-center h-32">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          } @else if (projects().length === 0) {
            <div class="text-center py-12">
              <div class="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span class="material-icons text-gray-400 text-3xl">folder_open</span>
              </div>
              <h3 class="text-lg font-medium text-gray-900 mb-1">Chưa có dự án nào</h3>
              <p class="text-gray-500">Hãy tạo dự án mới để bắt đầu dịch sách.</p>
              
              <button (click)="closeAndGoHome()" class="mt-6 text-blue-600 font-medium hover:text-blue-700 underline underline-offset-2">
                Quay lại trang chủ tạo dự án
              </button>
            </div>
          } @else {
            <div class="grid gap-4">
              @for (p of projects(); track p.id) {
                <div class="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all group flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white relative overflow-hidden"
                     [class.ring-2]="store.currentProjectId() === p.id" [class.ring-blue-500]="store.currentProjectId() === p.id">
                  
                  @if (store.currentProjectId() === p.id) {
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                  }
                  
                  <div class="flex-1 cursor-pointer" (click)="loadProject(p.id)">
                    <h3 class="font-bold text-lg text-gray-900 mb-1 flex items-center">
                      {{p.name}}
                      @if (store.currentProjectId() === p.id) {
                        <span class="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Đang mở
                        </span>
                      }
                    </h3>
                    <div class="flex flex-col gap-2 w-full mt-2">
                      <div class="flex flex-wrap items-center text-sm text-gray-500 gap-x-4 gap-y-2">
                        <span class="flex items-center"><span class="material-icons text-[16px] mr-1">update</span> {{p.updatedAt | date:'short'}}</span>
                        <span class="flex items-center">
                          <span class="w-2 h-2 rounded-full mr-1.5" 
                                [class.bg-gray-400]="p.phase === 1"
                                [class.bg-yellow-400]="p.phase === 2"
                                [class.bg-purple-500]="p.phase === 3"
                                [class.bg-blue-500]="p.phase === 4"
                                [class.bg-green-500]="p.phase === 5"></span>
                          Giai đoạn {{p.phase}}: 
                          {{p.phase === 1 ? 'Tải lên' : (p.phase === 2 ? 'Chia chương' : (p.phase === 3 ? 'Đại từ' : (p.phase === 4 ? 'Từ khó' : 'Dịch thuật')))}}
                        </span>
                        @if (p.pdfTask) {
                           <span class="flex items-center text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs font-medium border border-orange-100 uppercase tracking-wide">
                             <span class="material-icons !text-[14px] !w-3.5 !h-3.5 mr-1 leading-none flex items-center justify-center">warning</span> Gián đoạn PDF
                           </span>
                        }
                      </div>
                      @if (getProgress(p); as prog) {
                        <div class="w-full sm:w-2/3 max-w-sm mt-1 mb-1 flex items-center gap-3">
                          <div class="flex-1 overflow-hidden h-1.5 bg-gray-200 rounded-full">
                            <div class="h-full rounded-full transition-all duration-300" [class]="prog.barColorClass" [style.width.%]="prog.percentage"></div>
                          </div>
                          <span class="text-xs font-bold min-w-[2.5rem] text-right" [class]="prog.textColorClass">{{prog.percentage}}%</span>
                        </div>
                      }
                    </div>
                  </div>
                  <div class="flex sm:flex-col gap-2 min-w-[120px] justify-center">
                    @if (confirmingDeleteId() === p.id) {
                      <div class="flex flex-col gap-2 p-2 bg-red-50 rounded-lg border border-red-100 w-full animate-in fade-in duration-200">
                        <span class="text-xs text-red-700 font-medium text-center">Xóa dự án này?</span>
                        <div class="flex gap-2">
                          <button (click)="deleteProject(p.id, $event)" class="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold transition-colors text-center shadow-sm">
                            Có
                          </button>
                          <button (click)="cancelDelete($event)" class="flex-1 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-xs font-semibold transition-colors text-center shadow-sm">
                            Không
                          </button>
                        </div>
                      </div>
                    } @else {
                      @if (getProgress(p)?.percentage === 100) {
                        <button (click)="exportProject(p, $event)" class="px-4 py-2 w-full bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors border border-green-200 shadow-sm text-center flex items-center justify-center gap-1.5">
                          <span class="material-icons text-[18px]">download</span> Download sách
                        </button>
                      }
                      <button (click)="exportProjectData(p, $event)" class="px-4 py-2 w-full bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm font-medium transition-colors border border-purple-200 shadow-sm text-center flex items-center justify-center gap-1.5" title="Xuất toàn bộ dữ liệu dự án (JSON)">
                        <span class="material-icons text-[18px]">save_alt</span> Sao lưu dự án
                      </button>
                      <button (click)="loadProject(p.id)" class="px-4 py-2 w-full bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors border border-blue-200 shadow-sm text-center flex items-center justify-center gap-1.5">
                        <span class="material-icons text-[18px]">folder_open</span> Mở dự án
                      </button>
                      <button (click)="initiateDelete(p.id, $event)" class="px-4 py-2 w-full bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors border border-red-200 shadow-sm text-center flex items-center justify-center gap-1.5">
                        <span class="material-icons text-[18px]">delete</span> Xóa bỏ
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class ProjectModal implements OnInit {
  db = inject(DbService);
  store = inject(BookStore);
  toast = inject(ToastService);
  
  projects = signal<Project[]>([]);
  isLoading = signal(true);
  confirmingDeleteId = signal<string | null>(null);
  
  @Output() close = new EventEmitter<void>();

  ngOnInit() {
    this.loadProjects();
  }

  async loadProjects() {
    this.isLoading.set(true);
    const list = await this.db.getAllProjects();
    // Sort by updatedAt descending
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    this.projects.set(list);
    this.isLoading.set(false);
  }

  async loadProject(id: string) {
    if (this.store.currentProjectId() !== id) {
      this.close.emit(); // Close UI immediately to feel snappy
      await this.store.loadProject(id);
    } else {
      this.close.emit();
    }
  }

  initiateDelete(id: string, event: Event) {
    event.stopPropagation();
    this.confirmingDeleteId.set(id);
  }

  cancelDelete(event: Event) {
    event.stopPropagation();
    this.confirmingDeleteId.set(null);
  }

  exportProject(p: Project, event: Event) {
    event.stopPropagation();
    this.store.exportProjectToHtml(p);
  }

  exportProjectData(p: Project, event: Event) {
    event.stopPropagation();
    const dataStr = JSON.stringify(p, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SilaProject_${p.name.replace(/\s+/g, '_')}_${p.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.toast.success(this.toast.Messages.PROJECT_BACKUP_SUCCESS);
  }

  async importProject(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    
    try {
      const text = await file.text();
      const proj = JSON.parse(text) as Project;
      
      if (!proj || !proj.id || !proj.name) {
        this.toast.error(this.toast.Messages.PROJECT_IMPORT_DRAFT_ERROR);
        return;
      }
      
      // Check if project already exists, if so generate a new unique timestamp ID
      // To ensure no overlapping, since they can import the same project multiple times
      const existingIds = this.projects().map(p => p.id);
      if (existingIds.includes(proj.id)) {
        proj.id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        proj.name = `${proj.name} (Imported)`;
      }
      
      proj.updatedAt = Date.now();
      
      await this.db.saveProject(proj);
      this.toast.success(this.toast.Messages.PROJECT_IMPORT_SUCCESS);
      await this.loadProjects();
    } catch (e: any) {
      console.error(e);
      this.toast.error(this.toast.Messages.PROJECT_IMPORT_ERROR);
    } finally {
      input.value = ''; // Reset the input
    }
  }

  async deleteProject(id: string, event: Event) {
    event.stopPropagation();
    await this.db.deleteProject(id);
    this.toast.success(this.toast.Messages.PROJECT_DELETE_SUCCESS);
    if (this.store.currentProjectId() === id) {
       this.store.closeProject();
    }
    this.confirmingDeleteId.set(null);
    await this.loadProjects();
  }
  
  closeAndGoHome() {
    this.store.closeProject();
    this.close.emit();
  }

  getProgress(p: Project) {
    if (!p.chapters || p.chapters.length === 0 || p.phase < 3) return null;
    let total = 0;
    let translated = 0;
    for (const c of p.chapters) {
      total += c.wordCount || 0;
      if (c.status === 'done') {
        translated += c.wordCount || 0;
      }
    }
    if (total === 0) return null;
    const percentage = Math.round((translated / total) * 100);
    
    let barColorClass = 'bg-blue-500';
    let textColorClass = 'text-blue-600';
    if (percentage === 100) {
      barColorClass = 'bg-green-500';
      textColorClass = 'text-green-600';
    } else if (percentage === 0) {
      textColorClass = 'text-gray-500';
    }

    return { percentage, barColorClass, textColorClass, translated, total };
  }
}
