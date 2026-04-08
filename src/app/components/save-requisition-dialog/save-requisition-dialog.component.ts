import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-save-requisition-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title class="dialog-title">Save Requisition</h2>
      <mat-dialog-content class="dialog-content">
        <p class="dialog-subtitle">Store your current request setup permanently.</p>
        
        <div class="input-group">
          <label>Name <span class="required">*</span></label>
          <input type="text" class="discord-input" [(ngModel)]="name" placeholder="E.g., Login API" autofocus>
        </div>
        
        <div class="input-group">
          <label>Description (Optional)</label>
          <input type="text" class="discord-input" [(ngModel)]="description" placeholder="E.g., Production credentials">
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="dialog-actions">
        <button class="discord-btn-secondary" mat-dialog-close>Cancel</button>
        <button class="discord-btn-primary" [disabled]="!name.trim()" (click)="save()">Save</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      background-color: var(--bg-secondary);
      border: 1px solid var(--background-modifier-active);
      color: var(--text-normal);
      padding: 16px;
      margin: -24px; /* Offset default mat-dialog padding */
      border-radius: 8px;
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
    
    .required {
       color: #f04747;
    }
    
    .discord-input {
      background-color: var(--bg-primary);
      color: var(--text-normal);
      border: 1px solid var(--input-border);
      padding: 10px 12px;
      border-radius: 4px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
      transition: border-color 0.2s;
    }
    
    .discord-input:focus {
      border-color: var(--interactive-active);
    }
    
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
    .discord-btn-secondary:hover {
       text-decoration: underline;
    }
  `]
})
export class SaveRequisitionDialogComponent {
  name: string = '';
  description: string = '';

  constructor(
    public dialogRef: MatDialogRef<SaveRequisitionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { name?: string, description?: string }
  ) {
    if (data) {
      this.name = data.name || '';
      this.description = data.description || '';
    }
  }

  save() {
    if (this.name.trim()) {
      this.dialogRef.close({ name: this.name.trim(), description: this.description.trim() });
    }
  }
}
