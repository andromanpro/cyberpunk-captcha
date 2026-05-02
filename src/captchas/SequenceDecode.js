import { BaseCaptcha } from '../core/BaseCaptcha.js';
import { randomItem } from '../utils.js';

const COLORS = ['cyan', 'pink', 'amber', 'green'];
const SYMBOLS = { cyan: '▴', pink: '▶', amber: '▾', green: '◀' };

export class SequenceDecode extends BaseCaptcha {
  static id = 'sequence-decode';
  static name = 'Sequence Decode';

  render() {
    const minLen = this.options.minLen || 3;
    const maxLen = this.options.maxLen || 5;
    const len = minLen + Math.floor(Math.random() * (maxLen - minLen + 1));

    this.state.sequence = [];
    for (let i = 0; i < len; i++) this.state.sequence.push(randomItem(COLORS));
    this.state.userInput = [];
    this.state.locked = false;
    this.state.solved = false;

    this.mount.innerHTML = `
      <div class="cpcap-label">
        <span>// REPEAT THE SEQUENCE</span>
        <span class="cpcap-seq-status">memorize…</span>
      </div>
      <div class="cpcap-seq-pad">
        ${COLORS.map(c => `<button type="button" class="cpcap-seq-btn" data-color="${c}">${SYMBOLS[c]}</button>`).join('')}
      </div>
      <div class="cpcap-seq-progress"></div>
      <div style="text-align: center; margin-top: 8px;">
        <button type="button" class="cpcap-button cpcap-seq-show">▷ show again</button>
      </div>
    `;

    this._pad = this.mount.querySelector('.cpcap-seq-pad');
    this._statusEl = this.mount.querySelector('.cpcap-seq-status');
    this._progress = this.mount.querySelector('.cpcap-seq-progress');
    this._showBtn = this.mount.querySelector('.cpcap-seq-show');

    this._pad.addEventListener('click', (e) => this._onPadClick(e));
    this._showBtn.addEventListener('click', () => this._showSequence());
    this._showSequence();
  }

  _flash(color, dur = 350) {
    const btn = this._pad.querySelector(`.cpcap-seq-btn[data-color="${color}"]`);
    if (!btn) return;
    btn.classList.add('flash');
    setTimeout(() => btn.classList.remove('flash'), dur);
  }

  _showSequence() {
    if (this._destroyed) return;
    this.state.locked = true;
    this.state.userInput = [];
    this._statusEl.textContent = 'watch the sequence…';
    this._statusEl.style.color = 'var(--cpcap-text-muted)';
    this._progress.textContent = '';

    if (this._reduced) {
      this._progress.innerHTML = 'click in order: ' + this.state.sequence.map((c, i) => `${i + 1}.${SYMBOLS[c]}`).join(' ');
      this.state.locked = false;
      this._statusEl.textContent = 'repeat sequence';
      return;
    }

    this.state.sequence.forEach((c, i) => {
      setTimeout(() => this._flash(c, 400), 600 + i * 600);
    });
    setTimeout(() => {
      if (this._destroyed) return;
      this.state.locked = false;
      this._statusEl.textContent = 'repeat sequence';
      this._progress.textContent = `0 / ${this.state.sequence.length}`;
    }, 600 + this.state.sequence.length * 600 + 200);
  }

  _onPadClick(e) {
    if (this.state.locked || this.state.solved) return;
    const btn = e.target.closest('.cpcap-seq-btn');
    if (!btn) return;
    const c = btn.getAttribute('data-color');
    this._flash(c, 200);
    this.state.userInput.push(c);
    const idx = this.state.userInput.length - 1;
    if (this.state.userInput[idx] !== this.state.sequence[idx]) {
      this._statusEl.textContent = 'wrong, restart';
      this._statusEl.style.color = 'var(--cpcap-hot)';
      setTimeout(() => this.replay(), 800);
      return;
    }
    this._progress.textContent = `${this.state.userInput.length} / ${this.state.sequence.length}`;
    this.emit('change', this.state.userInput.length);
    if (this.state.userInput.length === this.state.sequence.length) {
      this.state.solved = true;
      this._statusEl.textContent = '✓ sequence matched';
      this._statusEl.style.color = 'var(--cpcap-cyan)';
    }
  }

  checkValid() {
    if (!this.state.solved) return { pass: false, message: 'sequence not completed' };
    return { pass: true, message: `pattern: ${this.state.sequence.map(c => SYMBOLS[c]).join(' ')}` };
  }
}
