var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/utils.js
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}
function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function createEmitter() {
  const listeners = /* @__PURE__ */ new Map();
  return {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, /* @__PURE__ */ new Set());
      listeners.get(event).add(fn);
      return () => {
        var _a;
        return (_a = listeners.get(event)) == null ? void 0 : _a.delete(fn);
      };
    },
    off(event, fn) {
      var _a;
      (_a = listeners.get(event)) == null ? void 0 : _a.delete(fn);
    },
    emit(event, ...args) {
      const set = listeners.get(event);
      if (!set) return;
      for (const fn of set) {
        try {
          fn(...args);
        } catch (e) {
          console.error(`[cyberpunk-captcha] handler for "${event}" threw:`, e);
        }
      }
    },
    clear() {
      listeners.clear();
    }
  };
}

// src/core/BaseCaptcha.js
var BaseCaptcha = class {
  constructor(mountEl, options = {}) {
    if (!mountEl || !(mountEl instanceof HTMLElement)) {
      throw new Error("[cyberpunk-captcha] mount element required");
    }
    this.mount = mountEl;
    this.options = options;
    this.state = {};
    this._emitter = createEmitter();
    this._destroyed = false;
    this._reduced = reducedMotion();
    this.mount.classList.add("cpcap", `cpcap-${this.constructor.id || "base"}`);
    this.render();
  }
  // Override in subclass
  render() {
    this.mount.innerHTML = '<div class="cpcap-error">BaseCaptcha.render() not implemented</div>';
  }
  // Override in subclass
  checkValid() {
    return { pass: false, message: "BaseCaptcha.checkValid() not implemented" };
  }
  isValid() {
    if (this._destroyed) return false;
    const verdict = this.checkValid();
    this._emitter.emit(verdict.pass ? "pass" : "fail", verdict);
    if (typeof this.options.onValidate === "function") {
      this.options.onValidate(verdict.pass, verdict);
    }
    return verdict.pass;
  }
  // Validation with full verdict (pass + message)
  validate() {
    if (this._destroyed) return { pass: false, message: "destroyed" };
    return this.checkValid();
  }
  replay() {
    if (this._destroyed) return;
    this.state = {};
    this.mount.innerHTML = "";
    this.render();
    this._emitter.emit("replay");
  }
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.mount.innerHTML = "";
    this.mount.classList.remove("cpcap", `cpcap-${this.constructor.id || "base"}`);
    this._emitter.clear();
  }
  on(event, fn) {
    return this._emitter.on(event, fn);
  }
  off(event, fn) {
    this._emitter.off(event, fn);
  }
  emit(event, ...args) {
    this._emitter.emit(event, ...args);
    if (event === "change" && typeof this.options.onChange === "function") {
      try {
        this.options.onChange(...args);
      } catch (e) {
      }
    }
  }
};
__publicField(BaseCaptcha, "name", "BaseCaptcha");

// src/captchas/DecoderLock.js
var DEFAULT_POOL = ["ANDROMAN", "CYBERPUNK", "SIGNAL", "MATRIX", "NEURAL", "AVATAR", "HACKER", "UPLINK", "DECODER", "KINDR"];
var DEFAULT_NOISE = "#@$%&*+=!?><~:;.-_ABCDEF\u0410\u0411\u0412\u0413\u0414\u0415\u0416\u0418\u041A\u041B\u041C\u041D\u041E\u041F\u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0438\u043A\u043B\u043C\u043D\u043E\u043F0123456789";
var DecoderLock = class extends BaseCaptcha {
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
        <span class="cpcap-decoder-status">decoding\u2026</span>
      </div>
      <div class="cpcap-decoder-display"></div>
      <input type="text" class="cpcap-input cpcap-decoder-input" autocomplete="off" placeholder="type the unlocked signal" />
    `;
    this._display = this.mount.querySelector(".cpcap-decoder-display");
    this._statusEl = this.mount.querySelector(".cpcap-decoder-status");
    this._input = this.mount.querySelector(".cpcap-decoder-input");
    this._input.addEventListener("input", () => {
      this._userTyped = true;
      this.emit("change");
    });
    if (this._reduced) {
      this._display.textContent = this.state.expected;
      this._statusEl.textContent = "\u2713 locked";
      this._statusEl.style.color = "var(--cpcap-cyan)";
      this.state.locked = true;
      return;
    }
    this._userTyped = false;
    this._startLoop();
  }
  // Петля: decode → пауза 2.5s → scramble → пауза 0.4s → decode → …
  // Останавливается когда пользователь начал печатать.
  _startLoop() {
    if (this._destroyed || this._userTyped) return;
    this._statusEl.textContent = "decoding\u2026";
    this._statusEl.style.color = "";
    this._runDecode(() => {
      this._timer = setTimeout(() => {
        if (this._destroyed || this._userTyped) return;
        this._runScramble(() => {
          this._timer = setTimeout(() => this._startLoop(), 400);
        });
      }, 2500);
    });
  }
  // Decode: символы открываются слева направо
  _runDecode(onComplete) {
    const word = this.state.expected;
    const noise = this.state.noise;
    let revealed = 0;
    const tick = () => {
      if (this._destroyed) return;
      let out = "";
      for (let i = 0; i < word.length; i++) {
        out += i < revealed ? word.charAt(i) : noise.charAt(Math.floor(Math.random() * noise.length));
      }
      this._display.textContent = out;
      if (revealed < word.length) {
        revealed++;
        this._timer = setTimeout(tick, this.state.stepMs);
      } else {
        this._statusEl.textContent = "\u2713 locked";
        this._statusEl.style.color = "var(--cpcap-cyan)";
        this.state.locked = true;
        this.emit("lock");
        if (onComplete) onComplete();
      }
    };
    tick();
  }
  // Scramble: символы прячутся справа налево
  _runScramble(onComplete) {
    const word = this.state.expected;
    const noise = this.state.noise;
    this.state.locked = false;
    let visible = word.length;
    const tick = () => {
      if (this._destroyed) return;
      let out = "";
      for (let i = 0; i < word.length; i++) {
        out += i < visible ? word.charAt(i) : noise.charAt(Math.floor(Math.random() * noise.length));
      }
      this._display.textContent = out;
      if (visible > 0) {
        visible--;
        this._timer = setTimeout(tick, 40);
      } else {
        if (onComplete) onComplete();
      }
    };
    tick();
  }
  destroy() {
    if (this._timer) clearTimeout(this._timer);
    super.destroy();
  }
  checkValid() {
    if (!this.state.locked) return { pass: false, message: "wait for signal lock" };
    const typed = (this._input.value || "").trim().toUpperCase();
    if (!typed) return { pass: false, message: "enter the unlocked signal" };
    if (typed === this.state.expected) return { pass: true, message: `signal accepted: ${this.state.expected}` };
    return { pass: false, message: `wrong signal: \xAB${escapeHtml(typed)}\xBB \u2260 \xAB${this.state.expected}\xBB` };
  }
};
__publicField(DecoderLock, "id", "decoder-lock");
__publicField(DecoderLock, "name", "Decoder Lock");

// src/captchas/LavaOrbTemp.js
var BANDS = [
  { name: "ICE", min: 0, max: 15 },
  { name: "COLD", min: 16, max: 35 },
  { name: "WARM", min: 36, max: 55 },
  { name: "HOT", min: 56, max: 75 },
  { name: "FIRE", min: 76, max: 100 }
];
function bandFor(v) {
  for (const b of BANDS) if (v >= b.min && v <= b.max) return b;
  return BANDS[BANDS.length - 1];
}
var LavaOrbTemp = class extends BaseCaptcha {
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
        <span class="current">50% \xB7 WARM</span>
        <span class="side">100%</span>
      </div>
      <div class="cpcap-status"></div>
    `;
    this._slider = this.mount.querySelector(".cpcap-lava-slider");
    this._target = this.mount.querySelector(".cpcap-lava-target");
    this._current = this.mount.querySelector(".cpcap-lava-readout .current");
    this._status = this.mount.querySelector(".cpcap-status");
    this._target.textContent = `${this.state.targetBand.name} (${this.state.targetBand.min}%\u2013${this.state.targetBand.max}%)`;
    this._slider.addEventListener("input", () => this._onChange(this._slider.value));
    this._onChange(50);
    const LavaOrb = this.options.lavaOrb || typeof window !== "undefined" && window.LavaOrb;
    if (LavaOrb && typeof LavaOrb.attach === "function") {
      try {
        this._orbHandle = LavaOrb.attach(this._slider, {
          size: this.options.orbSize || 70,
          detach: false,
          onChange: (v) => this._onChange(v)
        });
      } catch (e) {
        console.warn("[cyberpunk-captcha] lava-orb attach failed, falling back to gradient slider:", e);
      }
    }
  }
  _onChange(v) {
    v = parseInt(v, 10);
    const band = bandFor(v);
    this._current.textContent = `${v}% \xB7 ${band.name}`;
    if (band.name === this.state.targetBand.name) {
      this._status.textContent = "\u2713 in target band";
      this._status.className = "cpcap-status cpcap-ok";
    } else {
      this._status.textContent = "adjust slider\u2026";
      this._status.className = "cpcap-status";
    }
    this.emit("change", v);
  }
  destroy() {
    if (this._orbHandle && typeof this._orbHandle.destroy === "function") {
      try {
        this._orbHandle.destroy();
      } catch (e) {
      }
    }
    super.destroy();
  }
  checkValid() {
    const v = parseInt(this._slider.value, 10);
    const band = bandFor(v);
    if (band.name !== this.state.targetBand.name) {
      return { pass: false, message: `temperature ${v}% (${band.name}) \u2260 target ${this.state.targetBand.name}` };
    }
    return { pass: true, message: `temperature: ${v}% \xB7 ${band.name}` };
  }
};
__publicField(LavaOrbTemp, "id", "lava-orb-temp");
__publicField(LavaOrbTemp, "name", "Lava-Orb Temperature");

// src/captchas/SequenceDecode.js
var COLORS = ["cyan", "pink", "amber", "green"];
var ICONS = {
  cyan: '<svg viewBox="0 0 36 36" width="34" height="34" aria-hidden="true"><polygon points="18,4 31,11.5 31,24.5 18,32 5,24.5 5,11.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="miter"/><circle cx="18" cy="18" r="3" fill="currentColor"/></svg>',
  pink: '<svg viewBox="0 0 36 36" width="34" height="34" aria-hidden="true"><circle cx="18" cy="18" r="13" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="18" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="18" r="3" fill="currentColor"/></svg>',
  amber: '<svg viewBox="0 0 36 36" width="34" height="34" aria-hidden="true"><polyline points="5,21 11,12 14,18 18,9 22,18 25,12 31,21" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="miter" stroke-linecap="square"/></svg>',
  green: '<svg viewBox="0 0 36 36" width="34" height="34" aria-hidden="true"><rect x="6" y="6" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"/><line x1="6" y1="14" x2="30" y2="14" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="22" x2="30" y2="22" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="6" x2="14" y2="30" stroke="currentColor" stroke-width="1.5"/><line x1="22" y1="6" x2="22" y2="30" stroke="currentColor" stroke-width="1.5"/></svg>'
};
var LABELS = { cyan: "01_HEX", pink: "02_CORE", amber: "03_WAVE", green: "04_GRID" };
var SYMBOLS = { cyan: "\u25A2HEX", pink: "\u25C9CORE", amber: "\u3030WAVE", green: "\u25A6GRID" };
var SequenceDecode = class extends BaseCaptcha {
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
        <span class="cpcap-seq-status">memorize\u2026</span>
      </div>
      <div class="cpcap-seq-pad">
        ${COLORS.map((c) => `<button type="button" class="cpcap-seq-btn" data-color="${c}" aria-label="${LABELS[c]}"><span class="cpcap-seq-icon">${ICONS[c]}</span><span class="cpcap-seq-tag">${LABELS[c]}</span></button>`).join("")}
      </div>
      <div class="cpcap-seq-progress"></div>
      <div style="text-align: center; margin-top: 8px;">
        <button type="button" class="cpcap-button cpcap-seq-show">\u25B7 show again</button>
      </div>
    `;
    this._pad = this.mount.querySelector(".cpcap-seq-pad");
    this._statusEl = this.mount.querySelector(".cpcap-seq-status");
    this._progress = this.mount.querySelector(".cpcap-seq-progress");
    this._showBtn = this.mount.querySelector(".cpcap-seq-show");
    this._pad.addEventListener("click", (e) => this._onPadClick(e));
    this._showBtn.addEventListener("click", () => this._showSequence());
    this._showSequence();
  }
  _flash(color, dur = 350) {
    const btn = this._pad.querySelector(`.cpcap-seq-btn[data-color="${color}"]`);
    if (!btn) return;
    btn.classList.add("flash");
    setTimeout(() => btn.classList.remove("flash"), dur);
  }
  _showSequence() {
    if (this._destroyed) return;
    this.state.locked = true;
    this.state.userInput = [];
    this._statusEl.textContent = "watch the sequence\u2026";
    this._statusEl.style.color = "var(--cpcap-text-muted)";
    this._progress.textContent = "";
    if (this._reduced) {
      this._progress.innerHTML = "click in order: " + this.state.sequence.map((c, i) => `${i + 1}.${SYMBOLS[c]}`).join(" ");
      this.state.locked = false;
      this._statusEl.textContent = "repeat sequence";
      return;
    }
    this.state.sequence.forEach((c, i) => {
      setTimeout(() => this._flash(c, 400), 600 + i * 600);
    });
    setTimeout(() => {
      if (this._destroyed) return;
      this.state.locked = false;
      this._statusEl.textContent = "repeat sequence";
      this._progress.textContent = `0 / ${this.state.sequence.length}`;
    }, 600 + this.state.sequence.length * 600 + 200);
  }
  _onPadClick(e) {
    if (this.state.locked || this.state.solved) return;
    const btn = e.target.closest(".cpcap-seq-btn");
    if (!btn) return;
    const c = btn.getAttribute("data-color");
    this._flash(c, 200);
    this.state.userInput.push(c);
    const idx = this.state.userInput.length - 1;
    if (this.state.userInput[idx] !== this.state.sequence[idx]) {
      this._statusEl.textContent = "wrong, restart";
      this._statusEl.style.color = "var(--cpcap-hot)";
      setTimeout(() => this.replay(), 800);
      return;
    }
    this._progress.textContent = `${this.state.userInput.length} / ${this.state.sequence.length}`;
    this.emit("change", this.state.userInput.length);
    if (this.state.userInput.length === this.state.sequence.length) {
      this.state.solved = true;
      this._statusEl.textContent = "\u2713 sequence matched";
      this._statusEl.style.color = "var(--cpcap-cyan)";
    }
  }
  checkValid() {
    if (!this.state.solved) return { pass: false, message: "sequence not completed" };
    return { pass: true, message: `pattern: ${this.state.sequence.map((c) => SYMBOLS[c]).join(" ")}` };
  }
};
__publicField(SequenceDecode, "id", "sequence-decode");
__publicField(SequenceDecode, "name", "Sequence Decode");

// src/captchas/HoneypotTime.js
var HoneypotTime = class extends BaseCaptcha {
  render() {
    this.state.minElapsed = this.options.minElapsed || 3;
    this.state.fieldName = this.options.fieldName || "website2";
    this.state.startTime = Math.floor(Date.now() / 1e3);
    this.state.showDebug = this.options.showDebug !== false;
    let html = `
      <input type="text" class="cpcap-hp-honey cpcap-hp-honey-input" name="${escapeHtml(this.state.fieldName)}" tabindex="-1" autocomplete="off" />
      <input type="hidden" class="cpcap-hp-ts" value="${this.state.startTime}" />
    `;
    if (this.state.showDebug) {
      html += `
        <div class="cpcap-label">
          <span>// HONEYPOT STATUS \xB7 debug overlay</span>
        </div>
        <div class="cpcap-hp-debug"></div>
        <div style="margin-top: 10px;">
          <button type="button" class="cpcap-button cpcap-hp-pretend" style="border-color: var(--cpcap-hot); color: var(--cpcap-hot);">\u26A0 pretend bot</button>
        </div>
      `;
    }
    this.mount.innerHTML = html;
    this._honey = this.mount.querySelector(".cpcap-hp-honey-input");
    this._ts = this.mount.querySelector(".cpcap-hp-ts");
    this._debug = this.mount.querySelector(".cpcap-hp-debug");
    this._honey.addEventListener("input", () => this.emit("change"));
    if (this.state.showDebug) {
      this._pretend = this.mount.querySelector(".cpcap-hp-pretend");
      this._pretend.addEventListener("click", () => {
        this._honey.value = "http://spam-site.example.com";
        this._ts.value = Math.floor(Date.now() / 1e3);
        this._updateDebug();
      });
      this._timer = setInterval(() => this._updateDebug(), 250);
      this._updateDebug();
    }
  }
  _updateDebug() {
    if (!this._debug) return;
    const now = Math.floor(Date.now() / 1e3);
    const elapsed = now - parseInt(this._ts.value, 10);
    const honeyEmpty = this._honey.value === "";
    const verdict = honeyEmpty && elapsed >= this.state.minElapsed ? "HUMAN" : "BOT";
    const verdictColor = verdict === "HUMAN" ? "var(--cpcap-signal-green)" : "var(--cpcap-hot)";
    this._debug.innerHTML = `<div>field empty: <span style="color: ${honeyEmpty ? "var(--cpcap-signal-green)" : "var(--cpcap-hot)"}">${honeyEmpty ? "\u2713 true" : "\u2717 false (\xAB" + escapeHtml(this._honey.value.substring(0, 30)) + "\xBB)"}</span></div><div>elapsed: <span style="color: ${elapsed >= this.state.minElapsed ? "var(--cpcap-signal-green)" : "var(--cpcap-hot)"}">${elapsed}s${elapsed >= this.state.minElapsed ? " \u2713" : ` (need \u2265${this.state.minElapsed})`}</span></div><div>verdict: <span style="color: ${verdictColor}; font-weight: bold">${verdict}</span></div>`;
  }
  destroy() {
    if (this._timer) clearInterval(this._timer);
    super.destroy();
  }
  checkValid() {
    const elapsed = Math.floor(Date.now() / 1e3) - parseInt(this._ts.value, 10);
    if (this._honey.value !== "") return { pass: false, message: "honeypot triggered (bot detected)" };
    if (elapsed < this.state.minElapsed) return { pass: false, message: `too fast (${elapsed}s < ${this.state.minElapsed}s)` };
    return { pass: true, message: `verified (${elapsed}s elapsed)` };
  }
};
__publicField(HoneypotTime, "id", "honeypot-time");
__publicField(HoneypotTime, "name", "Honeypot + Time-based");

// src/captchas/CodeBug1C.js
var DEFAULT_SETS = [
  [
    { code: '\u041F\u0440\u043E\u0446\u0435\u0434\u0443\u0440\u0430 \u0422\u0435\u0441\u0442()\n  \u0421\u043E\u043E\u0431\u0449\u0438\u0442\u044C("\u041F\u0440\u0438\u0432\u0435\u0442");\n\u041A\u043E\u043D\u0435\u0446\u041F\u0440\u043E\u0446\u0435\u0434\u0443\u0440\u044B', bug: false },
    { code: '\u0415\u0441\u043B\u0438 \u0430 > 0 \u0422\u043E\u0433\u0434\u0430\n  \u0421\u043E\u043E\u0431\u0449\u0438\u0442\u044C("+");\n\u041A\u043E\u043D\u0435\u0446\u0415\u0441\u043B\u0438;', bug: false },
    { code: '\u041F\u0440\u043E\u0446\u0435\u0434\u0443\u0440\u0430 \u0422\u0435\u0441\u0442()\n  \u0421\u043E\u043E\u0431\u0449\u0438\u0442\u044C("\u041F\u0440\u0438\u0432\u0435\u0442");', bug: true }
  ],
  [
    { code: '\u0422\u043E\u0432\u0430\u0440\u044B = \u041D\u043E\u0432\u044B\u0439 \u041C\u0430\u0441\u0441\u0438\u0432;\n\u0422\u043E\u0432\u0430\u0440\u044B.\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C("\u041F\u0438\u0446\u0446\u0430");', bug: false },
    { code: '\u0422\u043E\u0432\u0430\u0440\u044B = \u041D\u043E\u0432\u044B\u0439 \u041C\u0430\u0441\u0441\u0438\u0432(;\n\u0422\u043E\u0432\u0430\u0440\u044B.\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C("\u041F\u0438\u0446\u0446\u0430");', bug: true },
    { code: "\u0422\u043E\u0432\u0430\u0440\u044B = \u041D\u043E\u0432\u044B\u0439 \u041C\u0430\u0441\u0441\u0438\u0432;\n\u0422\u043E\u0432\u0430\u0440\u044B.\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C();", bug: false }
  ],
  [
    { code: '\u0417\u0430\u043F\u0440\u043E\u0441 = \u041D\u043E\u0432\u044B\u0439 \u0417\u0430\u043F\u0440\u043E\u0441;\n\u0417\u0430\u043F\u0440\u043E\u0441.\u0422\u0435\u043A\u0441\u0442 = "\u0412\u042B\u0411\u0420\u0410\u0422\u042C * \u0418\u0417 \u0421\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A.\u041D\u043E\u043C\u0435\u043D\u043A\u043B\u0430\u0442\u0443\u0440\u0430";', bug: false },
    { code: '\u0417\u0430\u043F\u0440\u043E\u0441 = \u041D\u043E\u0432\u044B\u0439 \u0417\u0430\u043F\u0440\u043E\u0441\n\u0417\u0430\u043F\u0440\u043E\u0441.\u0422\u0435\u043A\u0441\u0442 = "\u0412\u042B\u0411\u0420\u0410\u0422\u042C";', bug: true },
    { code: "\u0417\u0430\u043F\u0440\u043E\u0441 = \u041D\u043E\u0432\u044B\u0439 \u0417\u0430\u043F\u0440\u043E\u0441;\n\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 = \u0417\u0430\u043F\u0440\u043E\u0441.\u0412\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C();", bug: false }
  ],
  [
    { code: "\u0414\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0421\u0442\u0440 \u0418\u0437 \u0422\u0430\u0431\u043B\u0438\u0446\u0430 \u0426\u0438\u043A\u043B\n  \u0421\u043E\u043E\u0431\u0449\u0438\u0442\u044C(\u0421\u0442\u0440.\u0418\u043C\u044F);\n\u041A\u043E\u043D\u0435\u0446\u0426\u0438\u043A\u043B\u0430;", bug: false },
    { code: "\u0414\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0421\u0442\u0440 \u0418\u0437 \u0422\u0430\u0431\u043B\u0438\u0446\u0430 \u0426\u0438\u043A\u043B\n  \u0421\u043E\u043E\u0431\u0449\u0438\u0442\u044C(\u0421\u0442\u0440.\u0418\u043C\u044F);", bug: true },
    { code: "\u041F\u043E\u043A\u0430 \u0421\u0447\u0451\u0442\u0447\u0438\u043A < 10 \u0426\u0438\u043A\u043B\n  \u0421\u0447\u0451\u0442\u0447\u0438\u043A = \u0421\u0447\u0451\u0442\u0447\u0438\u043A + 1;\n\u041A\u043E\u043D\u0435\u0446\u0426\u0438\u043A\u043B\u0430;", bug: false }
  ],
  [
    { code: '\u0421\u043E\u043E\u0431\u0449\u0438\u0442\u044C("\u041F\u0440\u0438\u0432\u0435\u0442, " + \u0418\u043C\u044F\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F);', bug: false },
    { code: '\u0421\u043E\u043E\u0431\u0449\u0438\u0442\u044C("\u041F\u0440\u0438\u0432\u0435\u0442, " + \u0418\u043C\u044F\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F);\n  \u0421\u043E\u043E\u0431\u0449\u0438\u0442\u044C(\u0414\u0430\u0442\u0430);', bug: false },
    { code: '\u0421\u043E\u043E\u0431\u0449\u0438\u0442\u044C("\u041F\u0440\u0438\u0432\u0435\u0442, " + \u0418\u043C\u044F\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F;', bug: true }
  ]
];
var CodeBug1C = class extends BaseCaptcha {
  render() {
    const sets = this.options.sets || DEFAULT_SETS;
    this.state.set = randomItem(sets).slice().sort(() => Math.random() - 0.5);
    this.state.solved = false;
    this.mount.innerHTML = `
      <div class="cpcap-label">
        <span>// CLICK THE BROKEN TRANSMISSION</span>
        <span class="cpcap-bug-status">scan\u2026</span>
      </div>
      <div class="cpcap-bug-snippets">
        ${this.state.set.map((s) => `<div class="cpcap-bug-snippet" data-bug="${s.bug ? "1" : "0"}">${this._escape(s.code)}</div>`).join("")}
      </div>
    `;
    this._snippetsRoot = this.mount.querySelector(".cpcap-bug-snippets");
    this._statusEl = this.mount.querySelector(".cpcap-bug-status");
    this._snippetsRoot.addEventListener("click", (e) => this._onClick(e));
  }
  _escape(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  _onClick(e) {
    if (this.state.solved) return;
    const div = e.target.closest(".cpcap-bug-snippet");
    if (!div) return;
    const isBug = div.getAttribute("data-bug") === "1";
    if (isBug) {
      div.classList.add("cpcap-locked-correct");
      this._statusEl.textContent = "\u2713 broken transmission spotted";
      this._statusEl.style.color = "var(--cpcap-signal-green)";
      this.state.solved = true;
      this.emit("change", true);
    } else {
      div.classList.add("cpcap-locked-wrong");
      this._statusEl.textContent = "\u2717 this one valid, scan others";
      this._statusEl.style.color = "var(--cpcap-hot)";
    }
  }
  checkValid() {
    if (!this.state.solved) return { pass: false, message: "find the broken snippet" };
    return { pass: true, message: "bug spotted \u2014 1\u0421 verified" };
  }
};
__publicField(CodeBug1C, "id", "code-bug-1c");
__publicField(CodeBug1C, "name", "1\u0421 Code \u2014 Spot the Bug");

// src/captchas/ScrubReveal.js
var DEFAULT_POOL2 = ["LAVA", "ORBS", "NEON", "CYBER", "VECTOR", "PIXEL", "GHOST", "ECHO", "SIGNAL", "MATRIX"];
var NOISE = "\u2588\u2593\u2592\u2591#@$%&*+=!?>~";
var ScrubReveal = class extends BaseCaptcha {
  render() {
    this.state.pool = this.options.pool || DEFAULT_POOL2;
    this.state.windowSize = this.options.windowSize || 3;
    const tMin = this.options.targetMin || 30;
    const tMax = this.options.targetMax || 89;
    this.state.expected = randomItem(this.state.pool);
    this.state.target = randomInt(tMin, tMax);
    this.mount.innerHTML = `
      <div class="cpcap-label">
        <span>// SCRUB-DECODE</span>
        <span class="cpcap-scrub-status">find sweet spot\u2026</span>
      </div>
      <div class="cpcap-scrub-display"></div>
      <input type="range" class="cpcap-scrub-slider" min="0" max="100" value="0" step="1" />
      <div class="cpcap-scrub-readout">
        <span>0%</span>
        <span class="cpcap-scrub-pct">0%</span>
        <span>window: <span class="cpcap-scrub-target">${this.state.target - this.state.windowSize}\u2013${this.state.target + this.state.windowSize}%</span></span>
      </div>
      <div style="margin-top: 14px;">
        <input type="text" class="cpcap-input cpcap-scrub-input" autocomplete="off" placeholder="type the revealed signal" />
      </div>
    `;
    this._slider = this.mount.querySelector(".cpcap-scrub-slider");
    this._display = this.mount.querySelector(".cpcap-scrub-display");
    this._pct = this.mount.querySelector(".cpcap-scrub-pct");
    this._statusEl = this.mount.querySelector(".cpcap-scrub-status");
    this._input = this.mount.querySelector(".cpcap-scrub-input");
    this._slider.addEventListener("input", () => this._update());
    this._input.addEventListener("input", () => this.emit("change"));
    this._update();
  }
  _update() {
    const v = parseInt(this._slider.value, 10);
    this._pct.textContent = `${v}%`;
    const w = this.state.windowSize;
    const t = this.state.target;
    let distance;
    if (v >= t - w && v <= t + w) distance = 0;
    else if (v < t - w) distance = t - w - v;
    else distance = v - (t + w);
    let revealRatio;
    if (distance === 0) revealRatio = 1;
    else if (distance >= 30) revealRatio = 0;
    else revealRatio = 1 - distance / 30;
    const word = this.state.expected;
    const revealCount = Math.round(word.length * revealRatio);
    let out = "";
    for (let i = 0; i < word.length; i++) {
      if (i < revealCount) out += word.charAt(i);
      else out += NOISE.charAt(Math.floor(Math.random() * NOISE.length));
    }
    this._display.textContent = out;
    if (distance === 0) {
      this._statusEl.textContent = `\u2713 in sweet spot \xB7 ${v}%`;
      this._statusEl.className = "cpcap-scrub-status cpcap-ok";
      this._statusEl.style.color = "var(--cpcap-cyan)";
    } else if (distance < 5) {
      this._statusEl.textContent = `almost there \xB7 ${v}% (off by ${distance})`;
      this._statusEl.style.color = "var(--cpcap-text-dim)";
    } else if (revealRatio > 0.4) {
      this._statusEl.textContent = `getting closer \xB7 ${v}%`;
      this._statusEl.style.color = "var(--cpcap-text-muted)";
    } else {
      this._statusEl.textContent = `too far \xB7 ${v}%`;
      this._statusEl.style.color = "var(--cpcap-text-muted)";
    }
    this.emit("change", v);
  }
  checkValid() {
    const v = parseInt(this._slider.value, 10);
    const w = this.state.windowSize;
    const t = this.state.target;
    if (v < t - w || v > t + w) {
      return { pass: false, message: `out of sweet spot: ${v}% \u2209 [${t - w}\u2013${t + w}]` };
    }
    const typed = (this._input.value || "").trim().toUpperCase();
    if (!typed) return { pass: false, message: "type the revealed signal" };
    if (typed === this.state.expected) return { pass: true, message: `sweet spot hit: ${v}% \xB7 signal: ${this.state.expected}` };
    return { pass: false, message: `wrong: \xAB${escapeHtml(typed)}\xBB \u2260 \xAB${this.state.expected}\xBB` };
  }
};
__publicField(ScrubReveal, "id", "scrub-reveal");
__publicField(ScrubReveal, "name", "Scrub Reveal");

// src/index.js
var REGISTRY = {
  "decoder-lock": DecoderLock,
  "lava-orb-temp": LavaOrbTemp,
  "sequence-decode": SequenceDecode,
  "honeypot-time": HoneypotTime,
  "code-bug-1c": CodeBug1C,
  "scrub-reveal": ScrubReveal
};
var CaptchaRotation = class {
  constructor(mount, opts = {}) {
    this.mount = mount;
    this.opts = opts;
    const variants = opts.variants || Object.keys(REGISTRY);
    this.variants = variants.filter((id) => REGISTRY[id]);
    if (this.variants.length === 0) throw new Error("[cyberpunk-captcha] no valid variants");
    let pickedId;
    if (opts.pickStrategy === "session" && typeof sessionStorage !== "undefined") {
      const key = opts.sessionKey || "cpcap-pick";
      pickedId = sessionStorage.getItem(key);
      if (!pickedId || !this.variants.includes(pickedId)) {
        pickedId = this.variants[Math.floor(Math.random() * this.variants.length)];
        sessionStorage.setItem(key, pickedId);
      }
    } else {
      pickedId = this.variants[Math.floor(Math.random() * this.variants.length)];
    }
    this.pickedId = pickedId;
    const Ctor = REGISTRY[pickedId];
    const subOpts = opts.options && opts.options[pickedId] || {};
    this.captcha = new Ctor(mount, subOpts);
  }
  isValid() {
    return this.captcha.isValid();
  }
  validate() {
    return this.captcha.validate();
  }
  replay() {
    this.captcha.replay();
  }
  destroy() {
    this.captcha.destroy();
  }
  on(event, fn) {
    return this.captcha.on(event, fn);
  }
  off(event, fn) {
    this.captcha.off(event, fn);
  }
};
if (typeof window !== "undefined") {
  window.CyberpunkCaptcha = window.CyberpunkCaptcha || {
    BaseCaptcha,
    DecoderLock,
    LavaOrbTemp,
    SequenceDecode,
    HoneypotTime,
    CodeBug1C,
    ScrubReveal,
    CaptchaRotation
  };
}
export {
  BaseCaptcha,
  CaptchaRotation,
  CodeBug1C,
  DecoderLock,
  HoneypotTime,
  LavaOrbTemp,
  ScrubReveal,
  SequenceDecode
};
