class HeadersPolyfill {
  constructor(init) {
    this.map = new Map();
    if (!init) return;
    if (init instanceof HeadersPolyfill) {
      init.forEach((value, key) => this.set(key, value));
      return;
    }
    for (const [key, value] of Object.entries(init)) this.set(key, String(value));
  }

  has(name) {
    return this.map.has(String(name).toLowerCase());
  }

  set(name, value) {
    this.map.set(String(name).toLowerCase(), String(value));
  }

  get(name) {
    return this.map.get(String(name).toLowerCase()) ?? null;
  }

  forEach(callback) {
    for (const [key, value] of this.map) callback(value, key, this);
  }
}

class ResponsePolyfill {
  constructor(body, init = {}) {
    this.bodyText = body == null ? "" : String(body);
    this.status = init.status ?? 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new HeadersPolyfill(init.headers);
  }

  async json() {
    return JSON.parse(this.bodyText);
  }

  async text() {
    return this.bodyText;
  }
}

if (typeof globalThis.Headers !== "function") globalThis.Headers = HeadersPolyfill;
if (typeof globalThis.Response !== "function") globalThis.Response = ResponsePolyfill;
