import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Collection } from '../../core/services/collection.service';

export interface SaveToCollectionDialogData {
  collections: Collection[];
  requestName?: string;
}

export interface SaveToCollectionDialogResult {
  collectionId: string;       // ID of existing collection (or __new__ if creating)
  newCollectionName?: string; // Only if collectionId === '__new__'
  requestName: string;
  requestDescription: string;
}

@Component({
  selector: 'app-save-to-collection-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title class="dialog-title">Save to Collection</h2>
      <mat-dialog-content class="dialog-content">
        <p class="dialog-subtitle">Add the current request to a collection to keep it organized.</p>

        <!-- Request name -->
        <div class="input-group">
          <label>Request Name <span class="required">*</span></label>
          <input type="text" class="discord-input" [(ngModel)]="requestName" placeholder="E.g., GET Users">
        </div>

        <!-- Request description -->
        <div class="input-group">
          <label>Description (Optional)</label>
          <input type="text" class="discord-input" [(ngModel)]="requestDescription" placeholder="E.g., Fetch all users from the API">
        </div>

        <!-- Collection picker -->
        <div class="input-group">
          <label>Collection <span class="required">*</span></label>

          <div *ngIf="!isCreatingNew">
            <select class="discord-select" [(ngModel)]="selectedCollectionId">
              <option value="" disabled>Select a collection…</option>
              <option *ngFor="let col of collections" [value]="col.id">
                {{ col.name }}
              </option>
            </select>
            <button class="create-new-btn" (click)="startCreating()">
              <mat-icon>add_circle_outline</mat-icon> Create new collection instead
            </button>
          </div>

          <div *ngIf="isCreatingNew" class="new-collection-box">
            <input type="text" class="discord-input" [(ngModel)]="newCollectionName" placeholder="New collection name…" autofocus>
            <button class="create-new-btn cancel-new" (click)="cancelCreating()" *ngIf="collections.length > 0">
              ← Pick existing collection
            </button>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button class="discord-btn-secondary" mat-dialog-close>Cancel</button>
        <button class="discord-btn-primary" [disabled]="!canSave" (click)="save()">Save</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      background-color: var(--bg-secondary);
      border: 1px solid var(--background-modifier-active);
      color: var(--text-normal);
      padding: 16px;
      margin: -24px;
      border-radius: 8px;
      min-width: 440px;
    }
    .dialog-title {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      margin: 0 0 8px 0;
    }
    .dialog-subtitle {
      font-size: 14px;
      color: var(--text-muted);
      margin-top: 0;
      margin-bottom: 24px;
    }
    .input-group {
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .input-group label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .required { color: #f04747; }
    .discord-input, .discord-select {
      background-color: var(--bg-primary);
      color: var(--text-normal);
      border: 1px solid var(--input-border);
      padding: 10px 12px;
      border-radius: 4px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
      transition: border-color 0.2s;
      width: 100%;
      box-sizing: border-box;
    }
    .discord-input:focus, .discord-select:focus { border-color: var(--interactive-active); }
    .discord-select { cursor: pointer; }
    .create-new-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      color: var(--brand-experiment);
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      padding: 6px 0 0 0;
      font-weight: 500;
    }
    .create-new-btn:hover { text-decoration: underline; }
    .create-new-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .cancel-new { color: var(--text-muted); }
    .new-collection-box { display: flex; flex-direction: column; gap: 6px; }
    .dialog-actions {
      margin-bottom: 0;
      padding-top: 16px;
      border-top: 1px solid var(--background-modifier-active);
    }
    .discord-btn-primary, .discord-btn-secondary {
      font-family: inherit;
      font-weight: 600;
      border-radius: 4px;
      padding: 8px 16px;
      border: none;
      cursor: pointer;
    }
    .discord-btn-primary {
      background-color: var(--brand-experiment);
      color: #fff;
    }
    .discord-btn-primary:disabled {
      background-color: var(--interactive-muted);
      color: var(--text-muted);
      cursor: not-allowed;
    }
    .discord-btn-secondary {
      background-color: transparent;
      color: var(--text-normal);
    }
    .discord-btn-secondary:hover { text-decoration: underline; }
  `]
})
export class SaveToCollectionDialogComponent {
  collections: Collection[];
  requestName: string = '';
  requestDescription: string = '';
  selectedCollectionId: string = '';
  newCollectionName: string = '';
  isCreatingNew: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<SaveToCollectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SaveToCollectionDialogData
  ) {
    this.collections = data.collections || [];
    this.requestName = data.requestName || '';
    // If no collections exist, default to create-new mode
    if (this.collections.length === 0) {
      this.isCreatingNew = true;
    }
  }

  get canSave(): boolean {
    const hasName = !!this.requestName.trim();
    const hasCollection = this.isCreatingNew
      ? !!this.newCollectionName.trim()
      : !!this.selectedCollectionId;
    return hasName && hasCollection;
  }

  startCreating() {
    this.isCreatingNew = true;
    this.selectedCollectionId = '';
  }

  cancelCreating() {
    this.isCreatingNew = false;
    this.newCollectionName = '';
  }

  save() {
    if (!this.canSave) return;
    const result: SaveToCollectionDialogResult = {
      collectionId: this.isCreatingNew ? '__new__' : this.selectedCollectionId,
      newCollectionName: this.isCreatingNew ? this.newCollectionName.trim() : undefined,
      requestName: this.requestName.trim(),
      requestDescription: this.requestDescription.trim()
    };
    this.dialogRef.close(result);
  }
}
