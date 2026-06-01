import { HttpResponse } from '../services/request.service';

export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

export interface UrlPart {
  text: string;
  isToken: boolean;
  resolved: boolean;
  value: string | undefined;
}

export interface Tab {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  authType: string;
  bearerToken: string;
  basicUsername: string;
  basicPassword: string;
  apiKeyName: string;
  apiKeyValue: string;
  apiKeyAddTo: string;
  bodyType: string;
  bodyContent: string;
  formDataFields: KeyValuePair[];
  response: HttpResponse | null;
  selectedItem: string;
  isDirty?: boolean;
}

