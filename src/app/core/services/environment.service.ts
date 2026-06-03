import { Injectable } from '@angular/core';

export interface EnvVariable {
  key: string;
  value: string;
  enabled: boolean;
}

export interface EnvProfile {
  id: string;
  name: string;
  variables: EnvVariable[];
}

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  private readonly PROFILES_KEY = 'twine_env_profiles_v1';
  private readonly ACTIVE_PROFILE_KEY = 'twine_active_env_profile_id_v1';
  private readonly OLD_STORAGE_KEY = 'twine_env_vars_v1';

  constructor() {
    this.migrateIfNeeded();
  }

  private migrateIfNeeded() {
    const oldVars = localStorage.getItem(this.OLD_STORAGE_KEY);
    const hasProfiles = localStorage.getItem(this.PROFILES_KEY);

    if (oldVars && !hasProfiles) {
      try {
        const vars: EnvVariable[] = JSON.parse(oldVars);
        const globalProfile: EnvProfile = {
          id: 'global',
          name: 'Global',
          variables: vars
        };
        this.saveProfiles([globalProfile]);
        this.setActiveProfileId('global');
      } catch {
        // ignore
      }
    }

    if (!localStorage.getItem(this.PROFILES_KEY)) {
      const defaultGlobal: EnvProfile = {
        id: 'global',
        name: 'Global',
        variables: []
      };
      this.saveProfiles([defaultGlobal]);
      this.setActiveProfileId('global');
    }
  }

  // ── Profiles CRUD ──────────────────────────────────────────────────────────

  getProfiles(): EnvProfile[] {
    const data = localStorage.getItem(this.PROFILES_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
    return [];
  }

  saveProfiles(profiles: EnvProfile[]): void {
    localStorage.setItem(this.PROFILES_KEY, JSON.stringify(profiles));
  }

  getActiveProfileId(): string {
    return localStorage.getItem(this.ACTIVE_PROFILE_KEY) || 'global';
  }

  setActiveProfileId(id: string): void {
    localStorage.setItem(this.ACTIVE_PROFILE_KEY, id);
  }

  createProfile(name: string): EnvProfile {
    const profiles = this.getProfiles();
    const id = 'env_' + Math.random().toString(36).substr(2, 9);
    const newProfile: EnvProfile = {
      id,
      name,
      variables: []
    };
    profiles.push(newProfile);
    this.saveProfiles(profiles);
    this.setActiveProfileId(id);
    return newProfile;
  }

  deleteProfile(id: string): void {
    if (id === 'global') return;
    let profiles = this.getProfiles();
    profiles = profiles.filter(p => p.id !== id);
    this.saveProfiles(profiles);
    if (this.getActiveProfileId() === id) {
      this.setActiveProfileId('global');
    }
  }

  // ── Variables CRUD (delegates to active profile) ───────────────────────────

  getVariables(): EnvVariable[] {
    const activeId = this.getActiveProfileId();
    const profiles = this.getProfiles();
    const active = profiles.find(p => p.id === activeId) || profiles.find(p => p.id === 'global');
    return active ? active.variables : [];
  }

  setVariables(vars: EnvVariable[]): void {
    const activeId = this.getActiveProfileId();
    const profiles = this.getProfiles();
    const active = profiles.find(p => p.id === activeId) || profiles.find(p => p.id === 'global');
    if (active) {
      active.variables = vars;
      this.saveProfiles(profiles);
    }
  }

  // ── Resolution ─────────────────────────────────────────────────────────────

  resolve(text: string): string {
    if (!text || !text.includes('<<')) return text;

    const vars = this.getVariables().filter(v => v.enabled && v.key);
    let result = text;
    for (const v of vars) {
      result = result.replaceAll(`<<${v.key}>>`, v.value);
    }
    return result;
  }

  hasTokens(text: string): boolean {
    return /<<[^>]+>>/.test(text ?? '');
  }
}
