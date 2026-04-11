import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { EnvVariable } from '../../core/services/environment.service';

@Component({
  selector: 'app-env-variables-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule, MatSlideToggleModule],
  templateUrl: './env-variables-dialog.component.html',
  styleUrl: './env-variables-dialog.component.scss'
})
export class EnvVariablesDialogComponent implements OnInit {
  variables: EnvVariable[] = [];

  constructor(
    private dialogRef: MatDialogRef<EnvVariablesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { variables: EnvVariable[] }
  ) {}

  ngOnInit(): void {
    // Deep-copy so changes don't mutate parent state before Save
    this.variables = this.data.variables.map(v => ({ ...v }));
    if (this.variables.length === 0) {
      this.addRow();
    }
  }

  addRow(): void {
    this.variables.push({ key: '', value: '', enabled: true });
  }

  removeRow(index: number): void {
    this.variables.splice(index, 1);
    if (this.variables.length === 0) this.addRow();
  }

  save(): void {
    const cleaned = this.variables.filter(v => v.key.trim() !== '');
    this.dialogRef.close(cleaned);
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
