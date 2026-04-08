import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { RequestService, HttpRequestConfig, HttpResponse } from './core/services/request.service';
import { HistoryService, HistoryItem } from './core/services/history.service';
import { RequisitionService, Requisition } from './core/services/requisition.service';
import { SaveRequisitionDialogComponent } from './components/save-requisition-dialog/save-requisition-dialog.component';

interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTabsModule, MatIconModule, MatSnackBarModule, MatDialogModule, MatMenuModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  // Request
  method: string = 'GET';
  methods: string[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
  url: string = '';

  headers: KeyValuePair[] = [{ key: '', value: '', enabled: true }];
  queryParams: KeyValuePair[] = [{ key: '', value: '', enabled: true }];

  // Auth
  authType: string = 'none';
  bearerToken: string = '';
  basicUsername: string = '';
  basicPassword: string = '';
  apiKeyName: string = '';
  apiKeyValue: string = '';
  apiKeyAddTo: string = 'header';

  bodyType: string = 'JSON';
  bodyContent: string = '{\n\n}';
  formDataFields: KeyValuePair[] = [{ key: '', value: '', enabled: true }];

  // State
  isLoading: boolean = false;
  isValidJson: boolean = true;
  isCopied: boolean = false;

  // History
  history: HistoryItem[] = [];

  // Saved Requests
  savedRequests: Requisition[] = [];

  // Response
  response: HttpResponse | null = null;
  selectedItem: string = '';

  get currentRequestName(): string {
    const req = this.savedRequests.find(r => r.id === this.selectedItem);
    return req ? req.name : 'new-request';
  }

  sidebarWidth: number = 240;
  isResizingSidebar: boolean = false;

  isRequisitionsCollapsed: boolean = false;
  isHistoryCollapsed: boolean = false;

  @ViewChild(MatMenuTrigger) contextMenuTrigger!: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };
  activeContextReq: Requisition | null = null;

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isResizingSidebar) return;
    let newWidth = event.clientX - 72;
    if (newWidth < 150) newWidth = 150;
    if (newWidth > 600) newWidth = 600;
    this.sidebarWidth = newWidth;
    event.preventDefault();
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.isResizingSidebar = false;
  }

  startResize(event: MouseEvent) {
    this.isResizingSidebar = true;
    event.preventDefault();
  }

  constructor(
    private reqService: RequestService,
    private historyService: HistoryService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private requisitionService: RequisitionService
  ) { }

  ngOnInit() {
    this.loadHistory();
    this.loadRequisitions();
  }

  loadRequisitions() {
    this.savedRequests = this.requisitionService.getRequisitions();
  }

  loadHistory() {
    this.history = this.historyService.getHistory();
  }

  onUrlChange() {
    try {
      let tempUrl = this.url;
      if (!tempUrl.startsWith('http://') && !tempUrl.startsWith('https://')) {
        tempUrl = 'http://' + tempUrl;
      }
      const parsedUrl = new URL(tempUrl);
      const newParams: KeyValuePair[] = [];
      parsedUrl.searchParams.forEach((value, key) => {
        newParams.push({ key, value, enabled: true });
      });
      if (newParams.length === 0) {
        newParams.push({ key: '', value: '', enabled: true });
      }
      this.queryParams = newParams;
    } catch {
      // Ignore invalid intermediate URLs
    }
  }

  onMethodChange() {
    const req = this.savedRequests.find(r => r.id === this.selectedItem);
    if (req) {
       req.config.method = this.method;
       this.requisitionService.updateRequisitionConfig(req.id, req.config);
       this.loadRequisitions();
    }
  }

  onAuthTypeChange() {
    // Clear credentials when switching type
    this.bearerToken = '';
    this.basicUsername = '';
    this.basicPassword = '';
    this.apiKeyName = '';
    this.apiKeyValue = '';
    this.apiKeyAddTo = 'header';
  }

  updateUrlFromParams() {
    try {
      let tempUrl = this.url;
      if (!tempUrl.trim()) return;
      let hasHttp = true;
      if (!tempUrl.startsWith('http://') && !tempUrl.startsWith('https://')) {
        tempUrl = 'http://' + tempUrl;
        hasHttp = false;
      }
      const parsedUrl = new URL(tempUrl);
      parsedUrl.search = '';
      this.queryParams.forEach(q => {
        if (q.enabled && q.key) {
          parsedUrl.searchParams.append(q.key, q.value);
        }
      });
      let finalUrl = parsedUrl.toString();
      if (!hasHttp) finalUrl = finalUrl.replace(/^http:\/\//, '');
      this.url = finalUrl;
    } catch {
      // Ignore invalid intermediate URLs
    }
  }

  addHeader() {
    this.headers.push({ key: '', value: '', enabled: true });
  }

  removeHeader(index: number) {
    this.headers.splice(index, 1);
  }

  addQueryParam() {
    this.queryParams.push({ key: '', value: '', enabled: true });
    this.updateUrlFromParams();
  }

  removeQueryParam(index: number) {
    this.queryParams.splice(index, 1);
    this.updateUrlFromParams();
  }

  addFormDataField() {
    this.formDataFields.push({ key: '', value: '', enabled: true });
  }

  removeFormDataField(index: number) {
    this.formDataFields.splice(index, 1);
  }

  validateJson() {
    if (this.bodyType === 'JSON' && this.bodyContent.trim()) {
      try {
        JSON.parse(this.bodyContent);
        this.isValidJson = true;
      } catch (e) {
        this.isValidJson = false;
      }
    } else {
      this.isValidJson = true;
    }
  }

  get isValidUrl(): boolean {
    return this.url.startsWith('http://') || this.url.startsWith('https://');
  }

  get canSend(): boolean {
    return this.isValidUrl && this.isValidJson && !this.isLoading;
  }

  async sendRequest() {
    this.validateJson();

    if (!this.isValidUrl) {
      this.snackBar.open('Invalid URL. Must start with http:// or https://', 'Close', { duration: 3000 });
      return;
    }

    if (!this.isValidJson) {
      this.snackBar.open('Invalid JSON syntax in body.', 'Close', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    this.response = null;

    try {
      // Build final URL with query params
      this.updateUrlFromParams();
      const finalUrl = this.url;

      // Build Headers Map
      const finalHeaders: Record<string, string> = {};
      this.headers.forEach(h => {
        if (h.enabled && h.key) {
          finalHeaders[h.key] = h.value;
        }
      });

      // Inject Auth
      if (this.authType === 'bearer' && this.bearerToken) {
        finalHeaders['Authorization'] = `Bearer ${this.bearerToken}`;
      } else if (this.authType === 'basic' && this.basicUsername) {
        const encoded = btoa(`${this.basicUsername}:${this.basicPassword}`);
        finalHeaders['Authorization'] = `Basic ${encoded}`;
      } else if (this.authType === 'api-key' && this.apiKeyName) {
        if (this.apiKeyAddTo === 'header') {
          finalHeaders[this.apiKeyName] = this.apiKeyValue;
        }
        // query param case handled below via queryParams injection
      }

      // Inject content type if JSON
      if (this.bodyType === 'JSON' && this.bodyContent && ['POST', 'PUT', 'PATCH'].includes(this.method)) {
        if (!Object.keys(finalHeaders).find(k => k.toLowerCase() === 'content-type')) {
          finalHeaders['Content-Type'] = 'application/json';
        }
      }

      // Convert formDataFields
      let formDataFinal: Record<string, string> | undefined = undefined;
      if (this.bodyType === 'Form-Data' && ['POST', 'PUT', 'PATCH'].includes(this.method)) {
        formDataFinal = {};
        this.formDataFields.forEach(f => {
          if (f.enabled && f.key) {
            formDataFinal![f.key] = f.value;
          }
        });

        if (Object.keys(formDataFinal).length === 0) {
          formDataFinal = undefined;
        }
      }

      // Inject API key as query param if needed
      let urlForRequest = finalUrl;
      if (this.authType === 'api-key' && this.apiKeyAddTo === 'query' && this.apiKeyName) {
        try {
          const parsedForAuth = new URL(urlForRequest);
          parsedForAuth.searchParams.set(this.apiKeyName, this.apiKeyValue);
          urlForRequest = parsedForAuth.toString();
        } catch { /* ignore */ }
      }

      const config: HttpRequestConfig = {
        method: this.method,
        url: urlForRequest,
        headers: finalHeaders,
        body: this.bodyType !== 'Form-Data' && ['POST', 'PUT', 'PATCH'].includes(this.method) && this.bodyContent.trim() ? this.bodyContent : undefined,
        formDataPayload: formDataFinal
      };

      this.response = await this.reqService.sendRequest(config);

      if (!this.response.error) {
        this.historyService.addHistory(config);
        this.loadHistory();
      } else {
        this.snackBar.open(`Error: ${this.response.error}`, 'Close', { duration: 5000 });
      }

    } catch (err: any) {
      this.snackBar.open(`Application Error: ${err.message}`, 'Close', { duration: 5000 });
    } finally {
      this.isLoading = false;
    }
  }

  createNewRequisition() {
    this.updateUrlFromParams();
    
    const finalHeaders: Record<string, string> = {};
    this.headers.forEach(h => {
      if (h.enabled && h.key) {
        finalHeaders[h.key] = h.value;
      }
    });

    if (this.bodyType === 'JSON' && this.bodyContent && ['POST', 'PUT', 'PATCH'].includes(this.method)) {
      if (!Object.keys(finalHeaders).find(k => k.toLowerCase() === 'content-type')) {
        finalHeaders['Content-Type'] = 'application/json';
      }
    }

    let formDataFinal: Record<string, string> | undefined = undefined;
    if (this.bodyType === 'Form-Data' && ['POST', 'PUT', 'PATCH'].includes(this.method)) {
      formDataFinal = {};
      this.formDataFields.forEach(f => {
        if (f.enabled && f.key) {
          formDataFinal![f.key] = f.value;
        }
      });
      if (Object.keys(formDataFinal).length === 0) {
        formDataFinal = undefined;
      }
    }

    const config: HttpRequestConfig = {
      method: this.method,
      url: this.url,
      headers: finalHeaders,
      body: this.bodyType !== 'Form-Data' && ['POST', 'PUT', 'PATCH'].includes(this.method) && this.bodyContent.trim() ? this.bodyContent : undefined,
      formDataPayload: formDataFinal
    };

    const newReq = this.requisitionService.addRequisition('new-request', '', config);
    this.loadRequisitions();
    this.selectedItem = newReq.id;
  }

  openContextMenu(event: MouseEvent, req: Requisition) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.activeContextReq = req;
    this.contextMenuTrigger.openMenu();
  }

  editContextRequisition() {
    if(!this.activeContextReq) return;
    const req = this.activeContextReq;
    const dialogRef = this.dialog.open(SaveRequisitionDialogComponent, {
      width: '450px',
      panelClass: 'dark-dialog-panel',
      data: { name: req.name, description: req.description }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.requisitionService.updateRequisition(req.id, result.name, result.description);
        this.loadRequisitions();
      }
    });
  }

  deleteContextRequisition() {
    if(!this.activeContextReq) return;
    this.requisitionService.deleteRequisition(this.activeContextReq.id);
    if (this.selectedItem === this.activeContextReq.id) {
        this.selectedItem = '';
    }
    this.loadRequisitions();
  }

  loadRequisition(req: Requisition) {
    this.selectedItem = req.id;
    const mockHistoryItem: HistoryItem = { id: req.id, config: req.config, timestamp: req.timestamp };
    this.loadHistoryItem(mockHistoryItem);
    this.selectedItem = req.id;
  }

  loadHistoryItem(item: HistoryItem) {
    this.method = item.config.method;
    this.selectedItem = item.id;

    // Strip query parameters back to pure URL
    try {
      const u = new URL(item.config.url);
      u.search = '';
      this.url = u.toString();

      // Populate UI query parameters dynamically from the original saved URL
      const originalUrl = new URL(item.config.url);
      this.queryParams = [];
      originalUrl.searchParams.forEach((val, key) => {
        this.queryParams.push({ key, value: val, enabled: true });
      });
    } catch {
      this.url = item.config.url;
      this.queryParams = [];
    }
    if (this.queryParams.length === 0) this.queryParams.push({ key: '', value: '', enabled: true });

    // Populate Headers
    this.headers = [];
    if (item.config.headers) {
      for (const [key, value] of Object.entries(item.config.headers)) {
        // ignore auto-injected headers to avoid polluting UI
        if (key.toLowerCase() !== 'content-length' && key.toLowerCase() !== 'content-type') {
          this.headers.push({ key, value: String(value), enabled: true });
        } else if (key.toLowerCase() === 'content-type' && String(value) !== 'application/json' && !String(value).includes('multipart/form-data')) {
          this.headers.push({ key, value: String(value), enabled: true });
        }
      }
    }
    if (this.headers.length === 0) this.headers.push({ key: '', value: '', enabled: true });

    // Populate Body
    if (item.config.formDataPayload) {
      this.bodyType = 'Form-Data';
      this.formDataFields = [];
      for (const [key, value] of Object.entries(item.config.formDataPayload)) {
        this.formDataFields.push({ key, value: String(value), enabled: true });
      }
      if (this.formDataFields.length === 0) this.formDataFields.push({ key: '', value: '', enabled: true });
    } else if (item.config.body) {
      this.bodyContent = item.config.body;
      try {
        JSON.parse(this.bodyContent);
        this.bodyType = 'JSON';
      } catch {
        this.bodyType = 'Text';
      }
      this.formDataFields = [{ key: '', value: '', enabled: true }];
    } else {
      this.bodyType = 'JSON';
      this.bodyContent = '{\n\n}';
      this.formDataFields = [{ key: '', value: '', enabled: true }];
    }

    this.response = null;
    this.validateJson();
  }

  getResponseBodyDisplay(): string {
    if (!this.response || !this.response.body) return '';
    try {
      // Pretty print if JSON
      const obj = JSON.parse(this.response.body);
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return this.response.body;
    }
  }

  downloadBinary() {
    if (!this.response || !this.response.body) return;
    const blob = new Blob([this.response.body]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'response_data.bin';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  copyResponseBody() {
    const text = this.getResponseBodyDisplay();
    navigator.clipboard.writeText(text).then(() => {
      this.isCopied = true;
      setTimeout(() => this.isCopied = false, 2000);
    });
  }
}
