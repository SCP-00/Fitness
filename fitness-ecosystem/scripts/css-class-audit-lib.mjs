/**
 * The design system's two halves, checked against each other.
 *
 * Why this exists (2026-10-12): the quick-log bar of TrainingLab was found
 * rendering with the browser's default styles because the mockup-CSS port had
 * deleted the sixteen `.tl-entry*` rules while `SetEntryBar.tsx` kept using the
 * names. Nothing in the repo compared *class used* with *class defined*, so a
 * whole component could lose its look and every gate stayed green: TypeScript
 * cannot see a stylesheet, the linter does not read class strings, and no test
 * mounts the component.
 *
 * Three directions, because they are three different defects:
 *
 *   1. **used but not defined** — the component asks for a look nobody wrote.
 *      This is always a defect: there is no allowlist for it. Only the app's own
 *      `tl-*` namespace is judged, because Tailwind's utilities are generated
 *      from these same sources at build time (a missing utility is a build
 *      error, not a silent one).
 *   2. **defined but not used** — how the system rots, but not always a mistake:
 *      a stylesheet may legitimately hold a component class before its component
 *      lands. Those are listed in `UNUSED_ALLOWLIST` with a reason, and
 *      `staleAllowlistEntries()` fails the moment one of them gets a user again,
 *      so the list cannot quietly become a dumping ground.
 *   3. **named in a selector argument, and nothing else** — a class inside
 *      `:has(…)` / `:not(…)` is a *reference*, not a rule: it names something the
 *      stylesheet expects to exist. `.tl-zen-input` had already been renamed to
 *      `.tl-zen-step-input` everywhere, but a `:has()` branch kept naming the old
 *      one — a branch that could never match again, invisible in both the other
 *      directions because the mention made the name look "defined".
 *
 * What counts as "used": a string literal in a `className` / `class` attribute
 * (including inside its `${…}` expressions, where conditional classes live), or
 * any literal that spells two or more whitespace-separated tokens (the helper
 * constants that build class lists). A lone `"tl-rest"` is a notification tag and
 * a lone `"tl-active"` is a plan id — neither is a class, and pretending
 * otherwise produced exactly those two false positives on the first run.
 *
 * A class assembled at runtime (`fam-${family}`) cannot be seen by any string
 * scan: patterns are reported as *dynamic* and their would-be names are not
 * counted as unused. String and regex literals are told apart with the usual
 * previous-character heuristic, which is what keeps `/[";]/` from swallowing the
 * rest of a file.
 *
 * Pure: texts in, findings out. The walk and the report live in
 * `scripts/css-class-audit.mjs`; `tests/training/test_css_class_audit.test.ts`
 * asserts the invariants on the real app.
 */

/**
 * Classes defined in the stylesheet with no consumer *yet*.
 *
 * Kept deliberately short and specific. The stylesheet's own header declares the
 * component classes as «the boseto ported into the app», so a rule can land
 * before its component — but each entry has to say which port it belongs to, and
 * a single `staleAllowlistEntries()` failure removes it the day the component
 * arrives.
 */
export const UNUSED_ALLOWLIST = new Map([
  // ── Boseto port, in flight 2026-10-10→: components not landed yet ─────────
  // Hero block of the dashboard, gallery/thumbnail cards of the library, the
  // week day-columns, the drop zone and the context chips all exist as CSS and
  // mockup markup; the React screens that will use them are being ported.
  ["tl-hero", "boseto port: hero block (mockup 01), component pending"],
  ["tl-hero-art", "boseto port: hero block, component pending"],
  ["tl-hero-bar", "boseto port: hero block, component pending"],
  ["tl-hero-content", "boseto port: hero block, component pending"],
  ["tl-hero-meta", "boseto port: hero block, component pending"],
  ["tl-hero-progress", "boseto port: hero block, component pending"],
  ["tl-hero-scrim", "boseto port: hero block, component pending"],
  ["tl-hero-slab", "boseto port: hero block, component pending"],
  ["tl-hero-sub", "boseto port: hero block, component pending"],
  ["tl-section-title", "boseto port: section heading, component pending"],
  ["tl-arrow-btn", "boseto port: carousel arrow, component pending"],
  ["tl-badge-pill", "boseto port: pill badge, component pending"],
  ["tl-gallery", "boseto port: library gallery, component pending"],
  ["tl-gcard", "boseto port: library card, component pending"],
  ["tl-gcard-action", "boseto port: library card, component pending"],
  ["tl-gcard-actions", "boseto port: library card, component pending"],
  ["tl-gcard-art", "boseto port: library card, component pending"],
  ["tl-gcard-body", "boseto port: library card, component pending"],
  ["tl-gcard-muscles", "boseto port: library card, component pending"],
  ["tl-gcard-name", "boseto port: library card, component pending"],
  ["tl-gcard-tag", "boseto port: library card, component pending"],
  ["tl-gcard-tags", "boseto port: library card, component pending"],
  ["tl-daygrid", "boseto port: week grid, component pending"],
  ["tl-daycol", "boseto port: week day column, component pending"],
  ["tl-daycol-head", "boseto port: week day column, component pending"],
  ["tl-daycard", "boseto port: week day card, component pending"],
  ["tl-daycard-art", "boseto port: week day card, component pending"],
  ["tl-daycard-meta", "boseto port: week day card, component pending"],
  ["tl-daycard-tags", "boseto port: week day card, component pending"],
  ["tl-daycard-title", "boseto port: week day card, component pending"],
  ["is-over", "boseto port: `.tl-daycol.is-over`, component pending"],
  ["tl-dropzone", "boseto port: import drop zone, component pending"],
  [
    "tl-media-missing",
    "boseto port: missing media placeholder, component pending",
  ],
  ["tl-context-tag", "boseto port: context chip, component pending"],
  ["tl-context-tags", "boseto port: context chip row, component pending"],
  [
    "is-primary",
    "boseto port: `.tl-context-tag.is-primary`, component pending",
  ],
  ["tl-bar", "boseto port: progress bar row, component pending"],
  ["tl-bar-name", "boseto port: progress bar row, component pending"],
  ["tl-bar-num", "boseto port: progress bar row, component pending"],
  ["tl-bar-row", "boseto port: progress bar row, component pending"],
  ["tl-next", "boseto port: next-up strip, component pending"],
  ["tl-thumb", "boseto port: thumbnail of the next-up strip, with `.tl-next`"],
  ["tl-tag", "boseto port: family tag (mockup `.tag`), component pending"],
  [
    "tl-tag-dot",
    "boseto port: family tag dot (mockup `.tag .dot`), component pending",
  ],
  ["tl-last-grid", "boseto port: last-session grid, component pending"],
  ["tl-last-list", "boseto port: last-session list, component pending"],
  [
    "tl-fact-label",
    "boseto port: exercise fact sheet label, component pending",
  ],
  ["tl-exrow-thumb", "boseto port: exercise row thumbnail, component pending"],
  ["tl-rest-ring", "boseto port: rest-timer ring (the app draws its own card)"],
  [
    "tl-rest-time",
    "boseto port: rest-timer readout (the app draws its own card)",
  ],
]);

/** Does this token look like a CSS class name rather than prose or a number? */
const CLASS_TOKEN = /^-?[A-Za-z_][-\w]*$/;

/**
 * Does it look like *one of ours*? The app's class names are namespaced
 * (`tl-…`, the family colours `fam-…`) or states (`is-…`), which is what lets a
 * lone literal inside a lookup table count without letting `mt-4` or a random
 * word through.
 */
const LOOKS_LIKE_CLASS = /^(?:tl|is|fam)-[a-z0-9][-\w]*$/;

/** `/* … *\/` in CSS: the only comment kind CSS has. */
const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;

/** Placeholder standing in for a `${…}` inside a template literal pattern. */
const HOLE = "\u0000";

export function stripCssComments(css) {
  return css.replace(CSS_COMMENT, " ");
}

/** `\.name` anywhere in a selector. */
const CLASS_IN_SELECTOR = /\.(-?[A-Za-z_][-\w]*)/g;

/**
 * Split one rule prelude into the text that carries rules and the text inside
 * pseudo-class arguments, which only refers to other names.
 */
function splitPrelude(prelude) {
  let parenDepth = 0;
  let outside = "";
  let inside = "";
  for (const ch of prelude) {
    if (ch === "(") parenDepth += 1;
    if (parenDepth > 0) inside += ch;
    else outside += ch;
    if (ch === ")") parenDepth = Math.max(0, parenDepth - 1);
  }
  return { outside, inside };
}

/**
 * Hand every rule prelude of the stylesheet to `visit`.
 *
 * A prelude is the text between `}`/`;` and the next `{`: a rule's selector at
 * the top level, or a nested rule's selector inside `@media`. At-rules
 * themselves (`@media`, `@keyframes`) name no class of ours and are skipped.
 */
function eachPrelude(css, visit) {
  const text = stripCssComments(css);
  let buffer = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") {
      const prelude = buffer.trim();
      if (!prelude.startsWith("@")) visit(prelude);
      buffer = "";
      continue;
    }
    if (ch === "}" || ch === ";") {
      buffer = "";
      continue;
    }
    buffer += ch;
  }
}

/**
 * Every class name the stylesheet defines, at any nesting depth.
 *
 * A prelude is the text between `}`/`;` and the next `{`: a rule's selector at
 * the top level, or a nested rule's selector inside `@media`. At-rules
 * themselves (`@media`, `@keyframes`) name no class of ours and are skipped.
 */
export function cssClassNames(css) {
  const names = new Set();
  eachPrelude(css, (prelude) => {
    for (const m of splitPrelude(prelude).outside.matchAll(CLASS_IN_SELECTOR)) {
      names.add(m[1]);
    }
  });
  return names;
}

/**
 * Classes named *only* inside a pseudo-class argument — `:has(.tl-x)`,
 * `:not(.is-now)`. They are expectations about other rules, not definitions of
 * their own, so a name that lives here and nowhere else is a dead branch.
 */
export function cssPseudoReferences(css) {
  const names = new Set();
  eachPrelude(css, (prelude) => {
    for (const m of splitPrelude(prelude).inside.matchAll(CLASS_IN_SELECTOR)) {
      names.add(m[1]);
    }
  });
  return names;
}

/** Keywords after which a `/` opens a regex rather than dividing. */
const REGEX_PREFIX_KEYWORDS = new Set([
  "return",
  "typeof",
  "instanceof",
  "case",
  "in",
  "of",
  "do",
  "else",
  "void",
  "delete",
  "new",
  "yield",
  "await",
  "throw",
]);

/**
 * Read one source file: the class tokens it mentions and the patterns it builds
 * at runtime.
 *
 * Comments are skipped, regex literals are skipped (a quote inside
 * `/[";]/` must not start a string), template literals contribute their literal
 * chunks *and* a pattern with `\u0000` where each `${…}` was, and the contents of
 * those `${…}` are scanned again as code — that is where a conditional class
 * lives (`` `tl-dot ${on ? "is-on" : ""}` ``).
 */
export function scanSource(text) {
  /** Class names spelled out in a class context — the strict reading. */
  const tokens = new Set();
  /**
   * Class names found anywhere in a string literal, including the lookup tables
   * that build them (`{ excellent: "is-band-excellent" }`) and the on/off states
   * chosen with a ternary. Deliberately wider, and deliberately kept for one
   * direction only: a false “used” merely spares a rule from deletion, while a
   * false “missing” would fill the report with ids and notification tags.
   */
  const loose = new Set();
  const patterns = new Set();

  /** Record the single-token name patterns inside a template (`fam-\u0000`). */
  const addNamePatterns = (pattern) => {
    for (const token of pattern.split(/\s+/)) {
      if (isNamePatternToken(token)) patterns.add(token);
    }
  };

  const takeLiteral = (value, classContext) => {
    const parts = value.split(/\s+/).filter(Boolean);
    for (const part of parts) {
      if (!CLASS_TOKEN.test(part)) continue;
      if (LOOKS_LIKE_CLASS.test(part)) loose.add(part);
      // A class attribute holds classes, and a multi-token literal is a class
      // list by convention (`"tl-a tl-b"`). A lone token elsewhere is an id, a
      // key or a notification tag — a class only if it is spelled like one.
      if (classContext || parts.length >= 2) {
        tokens.add(part);
      }
    }
  };

  const skipLineComment = (at) => {
    const end = text.indexOf("\n", at);
    return end === -1 ? text.length : end + 1;
  };
  const skipBlockComment = (at) => {
    const end = text.indexOf("*/", at);
    return end === -1 ? text.length : end + 2;
  };
  /** Index just past the `}` matching the `{` at `at`. */
  const matchBrace = (at) => {
    let depth = 0;
    let j = at;
    while (j < text.length) {
      const ch = text[j];
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) return j + 1;
      }
      j += 1;
    }
    return text.length;
  };
  /**
   * Is the literal starting at `at` the value of a class attribute?
   *
   * Two shapes, and both are everywhere: `className="tl-x"` (the literal is the
   * value) and `className={cond ? "tl-x" : "tl-y"}` (the literal sits inside an
   * expression). The second one is why a plain “immediately after the `=`” test
   * is not enough — it hid `tl-media`/`tl-media-frame` in `ExerciseDemo`.
   */
  const inClassAttribute = (at) => {
    const before = text.slice(Math.max(0, at - 200), at);
    return (
      /(?:className|class)\s*=\s*[`"']?$/.test(before) ||
      /(?:className|class)\s*=\s*\{[^}]{0,160}$/.test(before)
    );
  };
  const readQuoted = (at, inherited) => {
    const quote = text[at];
    const classContext = inherited || inClassAttribute(at);
    let j = at + 1;
    let value = "";
    while (j < text.length) {
      const ch = text[j];
      if (ch === "\\") {
        value += text[j + 1] ?? "";
        j += 2;
        continue;
      }
      if (ch === quote) {
        j += 1;
        break;
      }
      if (ch === "\n") break; // unterminated: stop rather than swallow the file
      value += ch;
      j += 1;
    }
    takeLiteral(value, classContext);
    return j;
  };
  const readTemplate = (at, inherited) => {
    const classContext = inherited || inClassAttribute(at);
    let j = at + 1;
    let chunk = "";
    let pattern = "";
    while (j < text.length) {
      const ch = text[j];
      if (ch === "\\") {
        chunk += text[j + 1] ?? "";
        pattern += text[j + 1] ?? "";
        j += 2;
        continue;
      }
      if (ch === "`") {
        takeLiteral(chunk, classContext);
        addNamePatterns(pattern);
        return j + 1;
      }
      if (ch === "$" && text[j + 1] === "{") {
        takeLiteral(chunk, classContext);
        pattern += HOLE;
        chunk = "";
        const innerEnd = matchBrace(j + 1);
        // `${…}` is code: scan it with the attribute context carried in, so a
        // conditional `is-on` inside a className template is still a class.
        scan(j + 2, innerEnd - 1, classContext);
        j = innerEnd;
        continue;
      }
      chunk += ch;
      pattern += ch;
      j += 1;
    }
    takeLiteral(chunk, classContext);
    addNamePatterns(pattern);
    return j;
  };
  /** `/…/flags` — skipped so a quote inside a class cannot derail the scan. */
  const readRegex = (at) => {
    let j = at + 1;
    let inClass = false;
    while (j < text.length) {
      const ch = text[j];
      if (ch === "\\") {
        j += 2;
        continue;
      }
      if (ch === "\n") return j; // not a regex after all: stop at the line end
      if (ch === "[") inClass = true;
      else if (ch === "]") inClass = false;
      else if (ch === "/" && !inClass) return j + 1;
      j += 1;
    }
    return j;
  };
  const regexCanStart = (at) => {
    let j = at - 1;
    while (j >= 0 && /\s/.test(text[j])) j -= 1;
    if (j < 0) return true;
    if ("(,=:[!&|?{};+-*%~^<>".includes(text[j])) return true;
    let k = j;
    while (k >= 0 && /[\w$]/.test(text[k])) k -= 1;
    return REGEX_PREFIX_KEYWORDS.has(text.slice(k + 1, j + 1));
  };
  /** Walk `[from, to)` as code, carrying the class-attribute context in. */
  const scan = (from, to, inherited) => {
    let i = from;
    while (i < to) {
      const ch = text[i];
      if (ch === "/" && text[i + 1] === "*") {
        i = Math.min(skipBlockComment(i + 2), to);
        continue;
      }
      if (ch === "/" && text[i + 1] === "/") {
        i = Math.min(skipLineComment(i + 2), to);
        continue;
      }
      if (ch === "/" && regexCanStart(i)) {
        i = Math.min(readRegex(i), to);
        continue;
      }
      if (ch === '"' || ch === "'") {
        i = readQuoted(i, inherited);
        continue;
      }
      if (ch === "`") {
        i = readTemplate(i, inherited);
        continue;
      }
      i += 1;
    }
  };

  scan(0, text.length, false);
  return { tokens, loose, patterns };
}

/**
 * Is this template a name being *built* (`fam-\u0000`, `tl-x-\u0000-y`), or just a
 * string with a value dropped into it (`` `${n} min` ``, `` `${t("x")}` ``)?
 *
 * Only the first kind can hide a class name: the token holding the hole must have
 * literal characters on at least one side. Without this rule every template in
 * the app became a `^[\w-]+$` pattern, which “explained” every class name in the
 * stylesheet and made both directions of the audit report nothing — silently.
 */
function isNamePatternToken(token) {
  if (!token.includes(HOLE)) return false;
  const [before = "", after = ""] = token.split(HOLE);
  // The hole has to continue the *same word*, and the literal side has to spell
  // part of that word (hence the letter). Two rejected shapes matter:
  //   * `` `${a}-${b}` `` (id and date builders, everywhere) — `^[\w-]+-[\w-]+$`
  //     would "explain" every hyphenated class name in the stylesheet;
  //   * `` `tl-focusable${x ? " is-on" : ""}` `` — the hole appends a whole
  //     class list, not a fragment, so `tl-focusable` is a complete name already.
  const word = (side) =>
    /^[\w-]*[A-Za-z][\w-]*$/.test(side) && /[A-Za-z]/.test(side);
  return (
    (before.endsWith("-") && word(before)) ||
    (after.startsWith("-") && word(after))
  );
}

/** A runtime-built pattern (`fam-\u0000`) as a regex over class names. */
export function patternToRegExp(pattern) {
  const escaped = pattern
    .split(HOLE)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\w-]+");
  return new RegExp(`^${escaped}$`);
}

/** Does any dynamic pattern explain this class name? */
function matchesPattern(name, patterns) {
  for (const pattern of patterns) {
    if (patternToRegExp(pattern).test(name)) return true;
  }
  return false;
}

/**
 * The audit itself. `sources` is a list of `{ path, text }`; the CSS is the
 * stylesheet those components are styled by.
 */
export function auditCssClasses({ css, sources }) {
  const defined = cssClassNames(css);
  const referenced = cssPseudoReferences(css);
  const usedTl = new Map();
  const usedAnywhere = new Set();
  const patterns = [];
  const dynamic = [];

  for (const source of sources) {
    const scan = scanSource(source.text);
    for (const token of scan.loose) usedAnywhere.add(token);
    for (const token of scan.tokens) {
      usedAnywhere.add(token);
      if (token.startsWith("tl-")) {
        if (!usedTl.has(token)) usedTl.set(token, new Set());
        usedTl.get(token).add(source.path);
      }
    }
    for (const pattern of scan.patterns) {
      patterns.push(pattern);
      dynamic.push({ path: source.path, pattern });
    }
  }

  const missing = [...usedTl.entries()]
    .filter(([name]) => !defined.has(name) && !matchesPattern(name, patterns))
    .map(([name, files]) => ({ name, files: [...files].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const unused = [...defined]
    .filter(
      (name) =>
        !usedAnywhere.has(name) &&
        !matchesPattern(name, patterns) &&
        !UNUSED_ALLOWLIST.has(name),
    )
    .sort();

  const selectorOnly = [...referenced]
    .filter(
      (name) =>
        !defined.has(name) &&
        !usedAnywhere.has(name) &&
        !matchesPattern(name, patterns),
    )
    .sort();

  return {
    missing,
    unused,
    selectorOnly,
    dynamic,
    counts: {
      defined: defined.size,
      usedTl: usedTl.size,
      sources: sources.length,
    },
  };
}

/**
 * Allowlist entries that have found a user again (or a name that the stylesheet
 * no longer defines): both mean the entry is stale and must go.
 */
export function staleAllowlistEntries({ css, sources }) {
  const defined = cssClassNames(css);
  const used = new Set();
  const patterns = [];
  for (const source of sources) {
    const scan = scanSource(source.text);
    for (const token of scan.loose) used.add(token);
    for (const token of scan.tokens) used.add(token);
    patterns.push(...scan.patterns);
  }
  return [...UNUSED_ALLOWLIST.keys()]
    .filter(
      (name) =>
        !defined.has(name) || used.has(name) || matchesPattern(name, patterns),
    )
    .sort();
}
