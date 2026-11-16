/** Just enough of Express's Router for the server's route modules: methods, path params with (a|b) constraints, use(), error handlers. */
type Fn = (...args: any[]) => any;
interface Layer {
  method?: string;
  regex: RegExp;
  keys: string[];
  handler: Fn;
}

function compile(path: string, prefix: boolean) {
  const keys: string[] = [];
  const src = path
    .replace(/\/+$/, '')
    .split('/')
    .map((seg) => {
      const m = seg.match(/^:(\w+)(?:\((.+)\))?$/);
      if (m) {
        keys.push(m[1]);
        return `(${m[2] ?? '[^/]+'})`;
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { regex: new RegExp(`^${src}${prefix ? '(?=/|$)' : '/?$'}`), keys };
}

export function Router() {
  const stack: Layer[] = [];
  const router: any = (req: any, res: any, done: Fn) => {
    let i = 0;
    const next = (err?: unknown): void => {
      while (i < stack.length) {
        const l = stack[i++];
        if (l.method && l.method !== req.method) continue;
        const m = l.regex.exec(req.path);
        if (!m) continue;
        const isErrorHandler = l.handler.length === 4;
        if (!!err !== isErrorHandler) continue;
        try {
          if (err) return l.handler(err, req, res, next);
          if (!l.method) {
            const saved = req.path;
            req.path = req.path.slice(m[0].length) || '/';
            return l.handler(req, res, (e?: unknown) => {
              req.path = saved;
              next(e);
            });
          }
          req.params = Object.fromEntries(l.keys.map((k, n) => [k, decodeURIComponent(m[n + 1])]));
          return l.handler(req, res, next);
        } catch (e) {
          return next(e);
        }
      }
      done?.(err);
    };
    next();
  };
  const add = (method: string) => (path: string, ...handlers: Fn[]) => {
    handlers.flat().forEach((h) => stack.push({ method, ...compile(path, false), handler: h }));
    return router;
  };
  router.get = add('GET');
  router.post = add('POST');
  router.put = add('PUT');
  router.delete = add('DELETE');
  router.use = (...args: any[]) => {
    const path = typeof args[0] === 'string' ? args.shift() : '';
    args.flat().forEach((h: Fn) => stack.push({ ...compile(path === '/' ? '' : path, true), handler: h }));
    return router;
  };
  return router;
}

export default { Router };
