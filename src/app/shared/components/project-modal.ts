import { Component, inject, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { DbService, Project } from '../../core/db';
import { BookStore } from '../../core/book.store';
import { ToastService } from '../../core/toast.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-project-modal',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-pointer" tabindex="0" (click)="closeModal.emit()" (keydown.escape)="closeModal.emit()">
      <div role="presentation" tabindex="-1" (keyup.enter)="$event.stopPropagation()" class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden cursor-default" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/80">
          <h2 class="text-xl font-bold text-zinc-900">Quản lý dự án</h2>
          <div class="flex items-center gap-2">
            <button (click)="fileInput.click()" class="text-sm px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg font-medium transition-colors flex items-center gap-1">
              <span class="material-icons text-[18px]">file_upload</span> Nhập dự án
            </button>
            <input #fileInput type="file" accept=".json" class="hidden" (change)="importProject($event)" />
            <button (click)="closeModal.emit()" class="text-zinc-400 hover:text-zinc-700 w-8 h-8 rounded-full hover:bg-zinc-200 transition-colors flex items-center justify-center">
              <span class="material-icons !text-[20px] !w-5 !h-5 !flex !items-center !justify-center leading-none">close</span>
            </button>
          </div>
        </div>
        
        <div class="p-6 overflow-y-auto flex-1 bg-white">
          @if (isLoading()) {
            <div class="flex justify-center items-center h-32">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          } @else if (projects().length === 0) {
            <div class="text-center py-12">
              <div class="bg-zinc-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span class="material-icons text-zinc-400 text-3xl">folder_open</span>
              </div>
              <h3 class="text-lg font-medium text-zinc-900 mb-1">Chưa có dự án nào</h3>
              <p class="text-zinc-500">Hãy tạo dự án mới để bắt đầu dịch sách.</p>
              
              <button (click)="closeAndGoHome()" class="mt-6 text-indigo-600 font-medium hover:text-indigo-700 underline underline-offset-2">
                Quay lại trang chủ tạo dự án
              </button>
            </div>
          } @else {
            <div class="grid gap-4">
              @for (p of projects(); track p.id) {
                <div class="border border-zinc-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white relative overflow-hidden"
                     [class.ring-2]="store.currentProjectId() === p.id" [class.ring-indigo-500]="store.currentProjectId() === p.id">
                  
                  @if (store.currentProjectId() === p.id) {
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                  }
                  
                  <div class="flex-1 cursor-pointer min-w-0" role="button" tabindex="0" (keydown.enter)="loadProject(p.id)" (click)="loadProject(p.id)">
                    @if (store.currentProjectId() === p.id) {
                      <div class="mb-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          Đang mở
                        </span>
                      </div>
                    }
                    <div class="flex items-start justify-between gap-3">
                      <h3 class="font-bold text-base text-zinc-900 mb-1 line-clamp-2" [title]="p.name">
                        {{p.name}}
                      </h3>
                    </div>
                    <div class="flex flex-col gap-2 w-full mt-2">
                      <div class="flex flex-wrap items-center text-sm text-zinc-500 gap-x-4 gap-y-2">
                        <span class="flex items-center"><span class="material-icons text-[16px] mr-1">update</span> {{p.updatedAt | date:'short'}}</span>
                        <span class="flex items-center">
                          <span class="w-2 h-2 rounded-full mr-1.5" 
                                [class.bg-zinc-400]="p.phase === 1"
                                [class.bg-yellow-400]="p.phase === 2"
                                [class.bg-purple-500]="p.phase === 3"
                                [class.bg-indigo-500]="p.phase === 4"
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
                          <div class="flex-1 overflow-hidden h-1.5 bg-zinc-200 rounded-full">
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
                          <button (click)="cancelDelete($event)" class="flex-1 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-md text-xs font-semibold transition-colors text-center shadow-sm">
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
                      <button (click)="loadProject(p.id)" class="px-4 py-2 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors border border-indigo-200 shadow-sm text-center flex items-center justify-center gap-1.5">
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
  
  @Output() closeModal = new EventEmitter<void>();

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
      this.closeModal.emit(); // Close UI immediately to feel snappy
      await this.store.loadProject(id);
    } else {
      this.closeModal.emit();
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

  async exportProject(p: Project, event: Event) {
    event.stopPropagation();
    const fullProject = await this.db.getProject(p.id);
    if (!fullProject) {
      this.toast.error('Dữ liệu dự án bị lỗi, không thể xuất bản');
      return;
    }
    this.store.exportProjectToHtml(fullProject);
  }

  async exportProjectData(p: Project, event: Event) {
    event.stopPropagation();
    const fullProject = await this.db.getProject(p.id);
    if (!fullProject) {
      this.toast.error('Dữ liệu dự án bị lỗi, không thể xuất bản');
      return;
    }
    const dataStr = JSON.stringify(fullProject, null, 2);
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
      
      // Always generate a new unique ID for imported projects to prevent ANY collision
      // since users might import a project they already have, or deleted and re-imported.
      const newProjectId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      const existingIds = this.projects().map(p => p.id);
      
      if (existingIds.includes(proj.id)) {
        proj.name = `${proj.name} (Imported)`;
      }
      proj.id = newProjectId;
      
      // We MUST assign new unique IDs to the imported chapters, because IndexedDB uses `id` as the primary key.
      // If we don't, importing the same project again will overwrite the old project's chapters in the DB!
      if (proj.chapters) {
        proj.chapters = proj.chapters.map(c => ({
          ...c,
          id: `${newProjectId}_${c.id}`
        }));
      }
      
      proj.updatedAt = Date.now();
      
      await this.db.saveProject(proj);
      this.toast.success(this.toast.Messages.PROJECT_IMPORT_SUCCESS);
      await this.loadProjects();
    } catch (e: unknown) {
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
    this.closeModal.emit();
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
    
    let barColorClass = 'bg-indigo-500';
    let textColorClass = 'text-indigo-600';
    if (percentage === 100) {
      barColorClass = 'bg-green-500';
      textColorClass = 'text-green-600';
    } else if (percentage === 0) {
      textColorClass = 'text-zinc-500';
    }

    return { percentage, barColorClass, textColorClass, translated, total };
  }
}
