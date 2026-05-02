import { BaseCaptcha } from '../core/BaseCaptcha.js';
import { escapeHtml } from '../utils.js';

/**
 * HoneypotTime — invisible captcha. Hidden field that bots auto-fill +
 * timestamp check (submission < 3s after render = bot).
 *
 * options.minElapsed — required seconds since render (default 3)
 * options.fieldName  — honeypot field name in form (default 'website2')
 * options.showDebug  — render visible debug overlay (default true)
 */
export class HoneypotTime extends BaseCaptcha {
  static id = 'honeypot-time';
  static name = 'Honeypot + Time-based';

  render() {
    this.state.minElapsed = this.options.minElapsed || 3;
    this.state.fieldName = this.options.fieldName || 'website2';
    this.state.startTime = Math.floor(Date.now() / 1000);
    this.state.showDebug = this.options.showDebug !== false;

    let html = `
      <input type="text" class="cpcap-hp-honey cpcap-hp-honey-input" name="${escapeHtml(this.state.fieldName)}" tabindex="-1" autocomplete="off" />
      <input type="hidden" class="cpcap-hp-ts" value="${this.state.startTime}" />
    `;
    if (this.state.showDebug) {
      html += `
        <div class="cpcap-label">
          <span>// HONEYPOT STATUS · debug overlay</span>
        </div>
        <div class="cpcap-hp-debug"></div>
        <div style="margin-top: 10px;">
          <button type="button" class="cpcap-button cpcap-hp-pretend" style="border-color: var(--cpcap-hot); color: var(--cpcap-hot);">⚠ pretend bot</button>
        </div>
      `;
    }
    this.mount.innerHTML = html;

    this._honey = this.mount.querySelector('.cpcap-hp-honey-input');
    this._ts = this.mount.querySelector('.cpcap-hp-ts');
    this._debug = this.mount.querySelector('.cpcap-hp-debug');

    this._honey.addEventListener('input', () => this.emit('change'));

    if (this.state.showDebug) {
      this._pretend = this.mount.querySelector('.cpcap-hp-pretend');
      this._pretend.addEventListener('click', () => {
        this._honey.value = 'http://spam-site.example.com';
        this._ts.value = Math.floor(Date.now() / 1000);
        this._updateDebug();
      });
      this._timer = setInterval(() => this._updateDebug(), 250);
      this._updateDebug();
    }
  }

  _updateDebug() {
    if (!this._debug) return;
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - parseInt(this._ts.value, 10);
    const honeyEmpty = this._honey.value === '';
    const verdict = (honeyEmpty && elapsed >= this.state.minElapsed) ? 'HUMAN' : 'BOT';
    const verdictColor = verdict === 'HUMAN' ? 'var(--cpcap-signal-green)' : 'var(--cpcap-hot)';
    this._debug.innerHTML =
      `<div>field empty: <span style="color: ${honeyEmpty ? 'var(--cpcap-signal-green)' : 'var(--cpcap-hot)'}">${honeyEmpty ? '✓ true' : '✗ false («' + escapeHtml(this._honey.value.substring(0, 30)) + '»)'}</span></div>` +
      `<div>elapsed: <span style="color: ${elapsed >= this.state.minElapsed ? 'var(--cpcap-signal-green)' : 'var(--cpcap-hot)'}">${elapsed}s${elapsed >= this.state.minElapsed ? ' ✓' : ` (need ≥${this.state.minElapsed})`}</span></div>` +
      `<div>verdict: <span style="color: ${verdictColor}; font-weight: bold">${verdict}</span></div>`;
  }

  destroy() {
    if (this._timer) clearInterval(this._timer);
    super.destroy();
  }

  checkValid() {
    const elapsed = Math.floor(Date.now() / 1000) - parseInt(this._ts.value, 10);
    if (this._honey.value !== '') return { pass: false, message: 'honeypot triggered (bot detected)' };
    if (elapsed < this.state.minElapsed) return { pass: false, message: `too fast (${elapsed}s < ${this.state.minElapsed}s)` };
    return { pass: true, message: `verified (${elapsed}s elapsed)` };
  }
}
