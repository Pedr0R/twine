import { Injectable } from '@angular/core';

export interface EnvVariable {
  key: string;
  value: string;
  enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  private readonly STORAGE_KEY = 'twine_env_vars_v1';

  // ── Read / Write ───────────────────────────────────────────────────────────

  getVariables(): EnvVariable[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
    return [];
  }

  setVariables(vars: EnvVariable[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vars));
  }

  // ── Resolution ─────────────────────────────────────────────────────────────

  /**
   * Replace every {{varName}} occurrence in `text` with its value from the
   * active variable list. Unmatched tokens are left as-is.
   */
  resolve(text: string): string {
    if (!text || !text.includes('<<')) return text;

    const vars = this.getVariables().filter(v => v.enabled && v.key);
    let result = text;
    for (const v of vars) {
      result = result.replaceAll(`<<${v.key}>>`, v.value);
    }
    return result;
  }

  /**
   * Returns true if the text contains at least one <<variable>> token.
   */
  hasTokens(text: string): boolean {
    return /<<[^>]+>>/.test(text ?? '');
  }
}
