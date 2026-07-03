/**
 * router.js
 * Micro-roteador HTTP construído sobre o módulo nativo `http` do Node.
 * Suporta parâmetros de rota (:id), métodos HTTP e middlewares em cadeia.
 */

class Router {
    constructor() {
        this.routes = [];
    }

    // Registra uma rota
    _add(method, pattern, ...handlers) {
        const keys = [];
        const regexStr = pattern
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace(/:([a-zA-Z_]+)/g, (_, k) => { keys.push(k); return "([^/]+)"; });
        const regex = new RegExp(`^${regexStr}$`);
        this.routes.push({ method: method.toUpperCase(), regex, keys, handlers });
    }

    get(p, ...h)    { this._add("GET",    p, ...h); }
    post(p, ...h)   { this._add("POST",   p, ...h); }
    put(p, ...h)    { this._add("PUT",    p, ...h); }
    delete(p, ...h) { this._add("DELETE", p, ...h); }

    handle(req, res) {
        const url    = req.url.split("?")[0];
        const method = req.method.toUpperCase();

        for (const route of this.routes) {
            if (route.method !== method) continue;
            const match = url.match(route.regex);
            if (!match) continue;

            req.params = {};
            route.keys.forEach((k, i) => { req.params[k] = decodeURIComponent(match[i + 1]); });

            let idx = 0;
            const next = () => {
                const handler = route.handlers[idx++];
                if (handler) handler(req, res, next);
            };
            next();
            return true;
        }
        return false;
    }
}

module.exports = Router;
