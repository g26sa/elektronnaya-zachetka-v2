/**
 * Минималистичный движок шаблонов в духе Handlebars.
 * Поддерживает:
 *   {{path.to.value}}             — подстановка
 *   {{#if path.to.value}}...{{/if}}    — условный блок
 *   {{#each items}}...{{/each}}        — цикл; внутри доступны this и @index
 *   {{#with path}}...{{/with}}         — смена контекста
 * Без eval, без зависимостей, безопасно для пользовательского контента.
 */

type Ctx = Record<string, unknown>;

function getPath(ctx: unknown, path: string): unknown {
  if (path === "this" || path === ".") return ctx;
  const parts = path.split(".");
  let cur: unknown = ctx;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    return v.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  return String(v);
}

type Token =
  | { kind: "text"; text: string }
  | { kind: "var"; expr: string; raw: boolean }
  | { kind: "blockOpen"; name: "if" | "each" | "with"; expr: string }
  | { kind: "blockClose"; name: "if" | "each" | "with" };

function tokenize(template: string): Token[] {
  const tokens: Token[] = [];
  const re = /\{\{\{?\s*([#/]?[\w.@\s]+?)\s*\}?\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    if (m.index > last) {
      tokens.push({ kind: "text", text: template.slice(last, m.index) });
    }
    const inner = m[1].trim();
    const raw = m[0].startsWith("{{{") && m[0].endsWith("}}}");
    if (inner.startsWith("#")) {
      const [op, ...rest] = inner.slice(1).split(/\s+/);
      tokens.push({ kind: "blockOpen", name: op as "if" | "each" | "with", expr: rest.join(" ") });
    } else if (inner.startsWith("/")) {
      tokens.push({ kind: "blockClose", name: inner.slice(1) as "if" | "each" | "with" });
    } else {
      tokens.push({ kind: "var", expr: inner, raw });
    }
    last = m.index + m[0].length;
  }
  if (last < template.length) {
    tokens.push({ kind: "text", text: template.slice(last) });
  }
  return tokens;
}

type Node =
  | { kind: "text"; text: string }
  | { kind: "var"; expr: string; raw: boolean }
  | { kind: "block"; name: "if" | "each" | "with"; expr: string; body: Node[] };

function parse(tokens: Token[]): Node[] {
  const root: Node[] = [];
  const stack: Node[][] = [root];
  const blockStack: { name: "if" | "each" | "with"; expr: string; body: Node[] }[] = [];

  for (const t of tokens) {
    const top = stack[stack.length - 1];
    if (t.kind === "text") top.push({ kind: "text", text: t.text });
    else if (t.kind === "var") top.push({ kind: "var", expr: t.expr, raw: t.raw });
    else if (t.kind === "blockOpen") {
      const node: Node = { kind: "block", name: t.name, expr: t.expr, body: [] };
      top.push(node);
      stack.push(node.body);
      blockStack.push({ name: t.name, expr: t.expr, body: node.body });
    } else if (t.kind === "blockClose") {
      const open = blockStack.pop();
      if (!open || open.name !== t.name) {
        throw new Error(`Шаблон: незакрытый блок ${t.name}`);
      }
      stack.pop();
    }
  }
  if (blockStack.length > 0) {
    throw new Error("Шаблон: остались незакрытые блоки");
  }
  return root;
}

function render(nodes: Node[], ctx: Ctx, root: Ctx): string {
  let out = "";
  for (const n of nodes) {
    if (n.kind === "text") out += n.text;
    else if (n.kind === "var") {
      const v = getPath(ctx, n.expr);
      if (v === undefined) {
        // fallback: попытаться искать в корневом контексте
        const rootV = getPath(root, n.expr);
        const s = stringify(rootV);
        out += n.raw ? s : escapeHtml(s);
      } else {
        const s = stringify(v);
        out += n.raw ? s : escapeHtml(s);
      }
    } else if (n.kind === "block") {
      const target = getPath(ctx, n.expr);
      if (n.name === "if") {
        if (target) out += render(n.body, ctx, root);
      } else if (n.name === "each") {
        if (Array.isArray(target)) {
          for (let i = 0; i < target.length; i++) {
            const item = target[i];
            const itemCtx: Ctx = {
              ...(typeof item === "object" && item !== null ? (item as Ctx) : { value: item }),
              "@index": i,
              "@first": i === 0,
              "@last": i === target.length - 1,
              this: item,
            };
            out += render(n.body, itemCtx, root);
          }
        }
      } else if (n.name === "with") {
        if (target && typeof target === "object") {
          out += render(n.body, target as Ctx, root);
        }
      }
    }
  }
  return out;
}

export function renderTemplate(template: string, data: Ctx): string {
  const tokens = tokenize(template);
  const tree = parse(tokens);
  return render(tree, data, data);
}

/**
 * Извлекает список плейсхолдеров {{xxx}} для UI-подсказок.
 */
export function extractPlaceholders(template: string): string[] {
  const re = /\{\{\{?\s*([#/]?[\w.@\s]+?)\s*\}?\}\}/g;
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    const inner = m[1].trim();
    if (inner.startsWith("#") || inner.startsWith("/")) continue;
    set.add(inner);
  }
  return Array.from(set);
}
