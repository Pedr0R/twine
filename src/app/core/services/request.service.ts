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
      console.log('Electron API not available, falling back to local CORS proxy...');
      try {
        const response = await fetch('http://localhost:5201/proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(config)
        });
        if (!response.ok) {
          throw new Error(`Proxy returned HTTP status ${response.status}`);
        }
        return await response.json();
      } catch (err: any) {
        console.error('CORS Proxy failed:', err);
        return {
          error: `CORS Proxy unavailable (is it running? Run 'npm run proxy'). Details: ${err.message}`,
          time: 0,
          size: 0
        };
      }
    }
  }
}
