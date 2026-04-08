import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RequestService, HttpRequestConfig, HttpResponse } from './core/services/request.service';
import { HistoryService, HistoryItem } from './core/services/history.service';

interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTabsModule, MatIconModule, MatSnackBarModule],
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
  
  bodyType: string = 'JSON';
  bodyContent: string = '{\n\n}';
  formDataFields: KeyValuePair[] = [{ key: '', value: '', enabled: true }];
  
  // State
  isLoading: boolean = false;
  isValidJson: boolean = true;
  
  // History
  history: HistoryItem[] = [];
  
  // Response
  response: HttpResponse | null = null;
  
  constructor(
    private reqService: RequestService,
    private historyService: HistoryService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.history = this.historyService.getHistory();
  }

  onUrlChange() {
    // URL dynamically updates query param UI if mapped later. Handled upon history item load.
  }

  addHeader() {
    this.headers.push({ key: '', value: '', enabled: true });
  }

  removeHeader(index: number) {
    this.headers.splice(index, 1);
  }

  addQueryParam() {
    this.queryParams.push({ key: '', value: '', enabled: true });
  }

  removeQueryParam(index: number) {
    this.queryParams.splice(index, 1);
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
      const parsedUrl = new URL(this.url);
      this.queryParams.forEach(q => {
        if (q.enabled && q.key) {
          parsedUrl.searchParams.append(q.key, q.value);
        }
      });
      const finalUrl = parsedUrl.toString();

      // Build Headers Map
      const finalHeaders: Record<string, string> = {};
      this.headers.forEach(h => {
        if (h.enabled && h.key) {
          finalHeaders[h.key] = h.value;
        }
      });
      
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

      const config: HttpRequestConfig = {
        method: this.method,
        url: finalUrl,
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

  loadHistoryItem(item: HistoryItem) {
    this.method = item.config.method;
    
    // Strip query parameters back to pure URL
    try {
       const u = new URL(item.config.url);
       u.search = '';
       this.url = u.toString();
       
       // Populate UI query parameters dynamically from the original saved URL
       const originalUrl = new URL(item.config.url);
       this.queryParams = [];
       originalUrl.searchParams.forEach((val, key) => {
          this.queryParams.push({key, value: val, enabled: true});
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
}
