/** Browser stand-ins for the Node modules the server imports. Only the members it uses. */
const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
const unb64 = (s: string) => decodeURIComponent(escape(atob(s)));

/** Demo token: signed by nothing, because the "server" is this browser tab. */
export const jwt = {
  sign(payload: object, _secret: string, opts?: { expiresIn?: string }) {
    const hours = Number(String(opts?.expiresIn ?? '12h').replace('h', '')) || 12;
    return b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + hours * 3600 }));
  },
  verify(token: string) {
    const p = JSON.parse(unb64(token));
    if (!p.exp || p.exp < Date.now() / 1000) throw new Error('jwt expired');
    return p;
  },
};

export const crypto = {
  randomBytes(n: number) {
    const a = new Uint8Array(n);
    globalThis.crypto.getRandomValues(a);
    return { toString: () => Array.from(a, (x) => x.toString(16).padStart(2, '0')).join('') };
  },
};

export const fs = { mkdirSync() {}, existsSync: () => false, rmSync() {} };
export const path = { resolve: (...p: string[]) => p.join('/'), dirname: (p: string) => p, join: (...p: string[]) => p.join('/') };
