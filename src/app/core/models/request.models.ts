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
