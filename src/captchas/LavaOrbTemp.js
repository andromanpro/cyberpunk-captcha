import { BaseCaptcha } from '../core/BaseCaptcha.js';

const BANDS = [
  { name: 'ICE',  min: 0,   max: 15  },
  { name: 'COLD', min: 16,  max: 35  },
  { name: 'WARM', min: 36,  max: 55  },
  { name: 'HOT',  min: 56,  max: 75  },
  { name: 'FIRE', min: 76,  max: 100 }
];

function bandFor(v) {
  for (const b of BANDS) if (v >= b.min && v <= b.max) return b;
  return BANDS[BANDS.length - 1];
}

/**
 * LavaOrbTemp — drag a slider into a target temperature band (ICE/COLD/WARM/HOT/FIRE).
 *
 * Optional: pass `LavaOrb` (from @andromanpro/lava-orb) via options to attach a
 * temperature-reactive orb to the slider. Without it, captcha works as a styled
 * gradient slider.
 *
 * options.lavaOrb — pass `window.LavaOrb` if loaded via script tag, or import
 *                   from '@andromanpro/lava-orb' and pass the imported value.
 */
export class LavaOrbTemp extends BaseCaptcha {
  static id = 'lava-orb-temp';
  static name = 'Lava-Orb Temperature';

  render() {
    this.state.targetBand = BANDS[Math.floor(Math.random() * BANDS.length)];

    this.mount.innerHTML = `
      <div class="cpcap-label">
        <span>// SET TEMPERATURE TO:</span>
        <span class="cpcap-lava-target" style="color: var(--cpcap-cyan); font-weight: 700;"></span>
      </div>
      <div class="cpcap-lava-wrap">
        <input type="range" class="cpcap-lava-slider" min="0" max="100" value="50" step="1" />
        <div class="cpcap-lava-bands">
          <span>ICE</span><span>COLD</span><span>WARM</span><span>HOT</span><span>FIRE</span>
        </div>
      </div>
      <div class="cpcap-lava-readout">
        <span class="side">0%</span>
        <span class="current">50% · WARM</span>
        <span class="side">100%</span>
      </div>
      <div class="cpcap-status"></div>
    `;

    this._slider = this.mount.querySelector('.cpcap-lava-slider');
    this._target = this.mount.querySelector('.cpcap-lava-target');
    this._current = this.mount.querySelector('.cpcap-lava-readout .current');
    this._status = this.mount.querySelector('.cpcap-status');

    this._target.textContent = `${this.state.targetBand.name} (${this.state.targetBand.min}%–${this.state.targetBand.max}%)`;

    this._slider.addEventListener('input', () => this._onChange(this._slider.value));
    this._onChange(50);

    // Optional LavaOrb attach
    const LavaOrb = this.options.lavaOrb || (typeof window !== 'undefined' && window.LavaOrb);
    if (LavaOrb && typeof LavaOrb.attach === 'function') {
      try {
        this._orbHandle = LavaOrb.attach(this._slider, {
          size: this.options.orbSize || 70,
          detach: false,
          onChange: (v) => this._onChange(v)
        });
      } catch (e) {
        console.warn('[cyberpunk-captcha] lava-orb attach failed, falling back to gradient slider:', e);
      }
    }
  }

  _onChange(v) {
    v = parseInt(v, 10);
    const band = bandFor(v);
    this._current.textContent = `${v}% · ${band.name}`;
    if (band.name === this.state.targetBand.name) {
      this._status.textContent = '✓ in target band';
      this._status.className = 'cpcap-status cpcap-ok';
    } else {
      this._status.textContent = 'adjust slider…';
      this._status.className = 'cpcap-status';
    }
    this.emit('change', v);
  }

  destroy() {
    if (this._orbHandle && typeof this._orbHandle.destroy === 'function') {
      try { this._orbHandle.destroy(); } catch (e) {}
    }
    super.destroy();
  }

  checkValid() {
    const v = parseInt(this._slider.value, 10);
    const band = bandFor(v);
    if (band.name !== this.state.targetBand.name) {
      return { pass: false, message: `temperature ${v}% (${band.name}) ≠ target ${this.state.targetBand.name}` };
    }
    return { pass: true, message: `temperature: ${v}% · ${band.name}` };
  }
}
