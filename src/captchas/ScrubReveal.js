import { BaseCaptcha } from '../core/BaseCaptcha.js';
import { randomItem, escapeHtml, randomInt } from '../utils.js';

const DEFAULT_POOL = ['LAVA', 'ORBS', 'NEON', 'CYBER', 'VECTOR', 'PIXEL', 'GHOST', 'ECHO', 'SIGNAL', 'MATRIX'];
const NOISE = '█▓▒░#@$%&*+=!?>~';

/**
 * ScrubReveal — drag slider into a sweet-spot window (target ±N%) where word fully reveals.
 * Outside window — fades back to noise. Type the revealed word to pass.
 *
 * options.pool — words pool (default DEFAULT_POOL)
 * options.windowSize — half-width of sweet spot in % (default 3 → 6% wide window)
 * options.targetMin / targetMax — random target range (default 30-89)
 */
export class ScrubReveal extends BaseCaptcha {
  static id = 'scrub-reveal';
  static name = 'Scrub Reveal';

  render() {
    this.state.pool = this.options.pool || DEFAULT_POOL;
    this.state.windowSize = this.options.windowSize || 3;
    const tMin = this.options.targetMin || 30;
    const tMax = this.options.targetMax || 89;

    this.state.expected = randomItem(this.state.pool);
    this.state.target = randomInt(tMin, tMax);

    this.mount.innerHTML = `
      <div class="cpcap-label">
        <span>// SCRUB-DECODE</span>
        <span class="cpcap-scrub-status">find sweet spot…</span>
      </div>
      <div class="cpcap-scrub-display"></div>
      <input type="range" class="cpcap-scrub-slider" min="0" max="100" value="0" step="1" />
      <div class="cpcap-scrub-readout">
        <span>0%</span>
        <span class="cpcap-scrub-pct">0%</span>
        <span>window: <span class="cpcap-scrub-target">${this.state.target - this.state.windowSize}–${this.state.target + this.state.windowSize}%</span></span>
      </div>
      <div style="margin-top: 14px;">
        <input type="text" class="cpcap-input cpcap-scrub-input" autocomplete="off" placeholder="type the revealed signal" />
      </div>
    `;

    this._slider = this.mount.querySelector('.cpcap-scrub-slider');
    this._display = this.mount.querySelector('.cpcap-scrub-display');
    this._pct = this.mount.querySelector('.cpcap-scrub-pct');
    this._statusEl = this.mount.querySelector('.cpcap-scrub-status');
    this._input = this.mount.querySelector('.cpcap-scrub-input');

    this._slider.addEventListener('input', () => this._update());
    this._input.addEventListener('input', () => this.emit('change'));
    this._update();
  }

  _update() {
    const v = parseInt(this._slider.value, 10);
    this._pct.textContent = `${v}%`;
    const w = this.state.windowSize;
    const t = this.state.target;
    let distance;
    if (v >= t - w && v <= t + w) distance = 0;
    else if (v < t - w) distance = (t - w) - v;
    else distance = v - (t + w);

    let revealRatio;
    if (distance === 0) revealRatio = 1;
    else if (distance >= 30) revealRatio = 0;
    else revealRatio = 1 - (distance / 30);

    const word = this.state.expected;
    const revealCount = Math.round(word.length * revealRatio);
    let out = '';
    for (let i = 0; i < word.length; i++) {
      if (i < revealCount) out += word.charAt(i);
      else out += NOISE.charAt(Math.floor(Math.random() * NOISE.length));
    }
    this._display.textContent = out;

    if (distance === 0) {
      this._statusEl.textContent = `✓ in sweet spot · ${v}%`;
      this._statusEl.className = 'cpcap-scrub-status cpcap-ok';
      this._statusEl.style.color = 'var(--cpcap-cyan)';
    } else if (distance < 5) {
      this._statusEl.textContent = `almost there · ${v}% (off by ${distance})`;
      this._statusEl.style.color = 'var(--cpcap-text-dim)';
    } else if (revealRatio > 0.4) {
      this._statusEl.textContent = `getting closer · ${v}%`;
      this._statusEl.style.color = 'var(--cpcap-text-muted)';
    } else {
      this._statusEl.textContent = `too far · ${v}%`;
      this._statusEl.style.color = 'var(--cpcap-text-muted)';
    }
    this.emit('change', v);
  }

  checkValid() {
    const v = parseInt(this._slider.value, 10);
    const w = this.state.windowSize;
    const t = this.state.target;
    if (v < t - w || v > t + w) {
      return { pass: false, message: `out of sweet spot: ${v}% ∉ [${t - w}–${t + w}]` };
    }
    const typed = (this._input.value || '').trim().toUpperCase();
    if (!typed) return { pass: false, message: 'type the revealed signal' };
    if (typed === this.state.expected) return { pass: true, message: `sweet spot hit: ${v}% · signal: ${this.state.expected}` };
    return { pass: false, message: `wrong: «${escapeHtml(typed)}» ≠ «${this.state.expected}»` };
  }
}
