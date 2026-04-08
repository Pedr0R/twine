import { Injectable } from '@angular/core';
import { HttpRequestConfig } from './request.service';

export interface Requisition {
  id: string;
  name: string;
  description: string;
  config: HttpRequestConfig;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class RequisitionService {
  private readonly STORAGE_KEY = 'cattp_requisitions_v1';

  constructor() { }

  getRequisitions(): Requisition[] {
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

  addRequisition(name: string, description: string, config: HttpRequestConfig): Requisition {
    const reqs = this.getRequisitions();
    const newReq: Requisition = {
      id: crypto.randomUUID(),
      name,
      description,
      config: JSON.parse(JSON.stringify(config)),
      timestamp: Date.now()
    };
    
    // Most recent on top
    reqs.unshift(newReq);
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reqs));
    return newReq;
  }
  
  updateRequisition(id: string, name: string, description: string): void {
     const reqs = this.getRequisitions();
     const req = reqs.find(r => r.id === id);
     if (req) {
       req.name = name;
       req.description = description;
       localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reqs));
     }
  }

  updateRequisitionConfig(id: string, config: HttpRequestConfig): void {
     const reqs = this.getRequisitions();
     const req = reqs.find(r => r.id === id);
     if (req) {
       req.config = JSON.parse(JSON.stringify(config));
       localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reqs));
     }
  }

  deleteRequisition(id: string): void {
     const reqs = this.getRequisitions().filter(r => r.id !== id);
     localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reqs));
  }
}
