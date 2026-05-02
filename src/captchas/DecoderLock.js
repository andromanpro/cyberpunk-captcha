import { BaseCaptcha } from '../core/BaseCaptcha.js';
import { randomItem, escapeHtml } from '../utils.js';

const DEFAULT_POOL = ['ANDROMAN', 'CYBERPUNK', 'SIGNAL', 'MATRIX', 'NEURAL', 'AVATAR', 'HACKER', 'UPLINK', 'DECODER', 'KINDR'];
const DEFAULT_NOISE = '#@$%&*+=!?><~:;.-_ABCDEFАБВГДЕЖИКЛМНОПабвгдежиклмноп0123456789';

export class DecoderLock extends BaseCaptcha {
  static id = 'decoder-lock';
  static name = 'Decoder Lock';

  render() {
    const pool = this.options.pool || DEFAULT_POOL;
    const noise = this.options.noise || DEFAULT_NOISE;
    const stepMs = this.options.stepMs || 60;

    this.state.expected = randomItem(pool);
    this.state.locked = false;
    this.state.noise = noise;
    this.state.stepMs = stepMs;

    this.mount.innerHTML = `
      <div class="cpcap-label">
        <span>// SIGNAL DECODER</span>
        <span class="cpcap-decoder-status">decoding…</span>
      </div>
      <div class="cpcap-decoder-display"></div>
      <input type="text" class="cpcap-input cpcap-decoder-input" autocomplete="off" placeholder="type the unlocked signal" />
    `;

    this._display = this.mount.querySelector('.cpcap-decoder-display');
    this._statusEl = this.mount.querySelector('.cpcap-decoder-status');
    this._input = this.mount.querySelector('.cpcap-decoder-input');

    this._input.addEventListener('input', () => this.emit('change'));

    if (this._reduced) {
      this._display.textContent = this.state.expected;
      this._statusEl.textContent = '✓ locked';
      this._statusEl.style.color = 'var(--cpcap-cyan)';
      this.state.locked = true;
      return;
    }

    this._runDecode();
  }

  _runDecode() {
    const word = this.state.expected;
    const noise = this.state.noise;
    let revealed = 0;
    const tick = () => {
      if (this._destroyed) return;
      let out = '';
      for (let i = 0; i < word.length; i++) {
        if (i < revealed) {
          out += word.charAt(i);
        } else {
          out += noise.charAt(Math.floor(Math.random() * noise.length));
        }
      }
      this._display.textContent = out;
      if (revealed < word.length) {
        revealed++;
        this._timer = setTimeout(tick, this.state.stepMs);
      } else {
        this._statusEl.textContent = '✓ locked';
        this._statusEl.style.color = 'var(--cpcap-cyan)';
        this.state.locked = true;
        this.emit('lock');
      }
    };
    tick();
  }

  destroy() {
    if (this._timer) clearTimeout(this._timer);
    super.destroy();
  }

  checkValid() {
    if (!this.state.locked) return { pass: false, message: 'wait for signal lock' };
    const typed = (this._input.value || '').trim().toUpperCase();
    if (!typed) return { pass: false, message: 'enter the unlocked signal' };
    if (typed === this.state.expected) return { pass: true, message: `signal accepted: ${this.state.expected}` };
    return { pass: false, message: `wrong signal: «${escapeHtml(typed)}» ≠ «${this.state.expected}»` };
  }
}
