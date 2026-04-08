import { Injectable } from '@angular/core';
import { HttpRequestConfig } from './request.service';

export interface HistoryItem {
  id: string;
  timestamp: number;
  config: HttpRequestConfig;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private readonly STORAGE_KEY = 'cattp_history';

  constructor() { }

  getHistory(): HistoryItem[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  addHistory(config: HttpRequestConfig): HistoryItem {
    const history = this.getHistory();
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      config: JSON.parse(JSON.stringify(config))
    };
    
    // Keep last 50 items
    history.unshift(newItem);
    if (history.length > 50) {
      history.pop();
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    return newItem;
  }
}
