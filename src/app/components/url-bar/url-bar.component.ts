import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EnvironmentService } from '../../core/services/environment.service';
import { UrlPart } from '../../core/models/request.models';

@Component({
  selector: 'app-url-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './url-bar.component.html',
  styleUrl: './url-bar.component.scss'
})
export class UrlBarComponent implements OnInit, OnChanges {
  @Input() url: string = '';
  @Input() isLoading: boolean = false;
  @Output() urlChange = new EventEmitter<string>();
  @Output() send = new EventEmitter<void>();

  @ViewChild('urlInput') urlInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('urlBackdrop') urlBackdropRef!: ElementRef<HTMLDivElement>;

  inputActivated: boolean = false;
  tokenRanges: Array<{ start: number; end: number; key: string; value: string | undefined }> = [];
  tokenTooltip: { key: string; value: string | null; x: number; y: number } | null = null;
  private _measureCanvas: HTMLCanvasElement | null = null;

  get windowHeight(): number {
    return window.innerHeight;
  }

  constructor(
    private envService: EnvironmentService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.refreshHighlights();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['url']) {
      this.refreshHighlights();
    }
  }

  refreshHighlights() {
    this.updateTokenRanges();
  }

  /** Splits the URL into plain-text and <<token>> chunks for template rendering. */
  get urlParts(): UrlPart[] {
    if (!this.url) return [];
    const vars = this.envService.getVariables().filter(v => v.enabled && v.key);
    const varMap = new Map(vars.map(v => [v.key, v.value]));
    const parts: UrlPart[] = [];
    const regex = /<<([^>]+)>>/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(this.url)) !== null) {
      if (match.index > last) {
        parts.push({ text: this.url.slice(last, match.index), isToken: false, resolved: true, value: undefined });
      }
      const key = match[1];
      const value = varMap.get(key);
      parts.push({ text: `<<${key}>>`, isToken: true, resolved: value !== undefined, value });
      last = match.index + match[0].length;
    }
    if (last < this.url.length) {
      parts.push({ text: this.url.slice(last), isToken: false, resolved: true, value: undefined });
    }
    return parts;
  }

  updateTokenRanges(): void {
    if (!this.url) {
      this.tokenRanges = [];
      return;
    }
    const vars = this.envService.getVariables().filter(v => v.enabled && v.key);
    const varMap = new Map(vars.map(v => [v.key, v.value]));
    const ranges: typeof this.tokenRanges = [];
    const regex = /<<([^>]+)>>/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(this.url)) !== null) {
      const key = match[1];
      const value = varMap.get(key);
      ranges.push({ start: match.index, end: match.index + match[0].length, key, value });
    }
    this.tokenRanges = ranges;
  }

  onUrlInputScroll(): void {
    if (this.urlBackdropRef) {
      this.urlBackdropRef.nativeElement.scrollLeft = this.urlInputRef.nativeElement.scrollLeft;
    }
  }

  onUrlMouseMove(event: MouseEvent): void {
    if (this.tokenRanges.length === 0) {
      this.tokenTooltip = null;
      return;
    }
    const input = this.urlInputRef.nativeElement;
    const rect = input.getBoundingClientRect();
    const relX = event.clientX - rect.left + input.scrollLeft;

    if (!this._measureCanvas) this._measureCanvas = document.createElement('canvas');
    const ctx = this._measureCanvas.getContext('2d')!;
    const style = window.getComputedStyle(input);
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const paddingLeft = parseFloat(style.paddingLeft);

    let charIdx = this.url.length;
    for (let i = 0; i <= this.url.length; i++) {
      if (ctx.measureText(this.url.slice(0, i)).width + paddingLeft >= relX) {
        charIdx = i;
        break;
      }
    }

    const token = this.tokenRanges.find(t => charIdx >= t.start && charIdx < t.end);
    if (token) {
      this.tokenTooltip = {
        key: token.key,
        value: token.value ?? null,
        x: event.clientX,
        y: rect.top
      };
    } else {
      this.tokenTooltip = null;
    }
  }

  onUrlMouseLeave(): void {
    this.tokenTooltip = null;
  }

  onTokenSpanEnter(event: MouseEvent, part: UrlPart): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    this.tokenTooltip = {
      key: part.text.replace(/^<<|>>$/g, ''), // strip << and >>
      value: part.value ?? null,
      x: rect.left + rect.width / 2,
      y: rect.top
    };
  }

  toggleInput(): void {
    if (this.inputActivated === true) {
      this.inputActivated = false;
      this.urlInputRef.nativeElement.blur();
    }
    else {
      this.inputActivated = true;
      setTimeout(() => this.urlInputRef.nativeElement.focus(), 0);
    }
  }

  emitUrlChange() {
    this.urlChange.emit(this.url);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.send.emit();
    }
  }
}
