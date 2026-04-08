import { Injectable } from '@angular/core';

export interface HttpRequestConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  formDataPayload?: Record<string, string>;
}

export interface HttpResponse {
  statusCode?: number;
  time: number;
  size: number;
  headers?: Record<string, string | string[]>;
  body?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  constructor() { }

  async sendRequest(config: HttpRequestConfig): Promise<HttpResponse> {
    if ((window as any).electronAPI) {
      return await (window as any).electronAPI.sendRequest(config);
    } else {
      console.error('Electron API not available');
      return {
        error: 'Application is not running in Electron.',
        time: 0,
        size: 0
      };
    }
  }
}
