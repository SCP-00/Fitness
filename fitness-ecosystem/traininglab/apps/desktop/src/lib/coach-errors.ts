/**
 * The validator speaks English; the app speaks Spanish — and the owner reads
 * the *rejection*, which is the moment the copy matters most (2026-10-29).
 *
 * `validateProposal` in `lib/llm.ts` is pure logic and its messages are English
 * identifiers of a rule (`"x" is not available with the current equipment`).
 * They are asserted by the root suite, they are what a local model needs to
 * read, and translating them *there* would change behaviour the tests pin. So
 * the translation happens at the view boundary, on the way to the screen:
 *
 *   * the rule is matched by shape, not by string equality, so a new id or a
 *     new budget number still maps;
 *   * an unknown message is returned untouched — a rule this file does not know
 *     yet shows in English rather than disappearing;
 *   * `en` returns the original, so the two languages cannot drift apart into
 *     two different sentences about one rule.
 *
 * @module lib/coach-errors
 */

/** Resolves a muscle family id to the label the UI prints (`chest` → `pecho`). */
export type FamilyLabel = (family: string) => string;

const NOT_AVAILABLE =
  /^"(.+?)" is not available with the current equipment$/;
const INVALID_PRESCRIPTION = /^"(.+?)" has an invalid prescription$/;
const RECOVERY = /^"(.+?)" loads (.+), which is still inside its recovery window today$/;
const REPEAT = /^"(.+?)" repeats the (.+) work already programmed today$/;
const BUDGET = /^estimated (\d+) min exceeds the (\d+) min budget$/;
const VETOED =
  /^"(.+?)" uses the (.+) pattern, which is vetoed while the reported areas are sore$/;
/*
 * The focus rule (2026-10-30): a focused family may appear twice, never three
 * times, and no movement pattern may repeat. Both sentences have to carry the
 * number, because "too many" cannot be acted on.
 */
const THIRD_OF_FAMILY =
  /^"(.+?)" would be a third (.+) exercise: a focused day allows two$/;
const REPEATED_PATTERN =
  /^"(.+?)" repeats the (.+) pattern already in this session$/;
const NO_SLOTS = /^proposal contains no slots$/;

/*
 * The transport's own failures (2026-10-30). They are not validator rules — they
 * come from `lib/llm.ts` when the local server does not answer — but they land in
 * the same list on screen, and "the model ran out of tokens" is exactly the
 * sentence a small reasoning model deserves in his own language.
 */
const HTTP_STATUS = /^(?:local server answered|server answered) (\d{3} .+)$/;
const TOO_LONG = /^the model ran out of tokens mid-answer/;
const TOO_MANY_STEPS = /^the model exceeded (\d+) tool steps/;
const NO_PROPOSAL = /^the model answered without calling (\S+)$/;
const BAD_ARGS = /arguments were not valid JSON|invalid JSON/i;
const NO_NETWORK =
  /failed to fetch|networkerror|load failed|connection refused|econnrefused/i;

/**
 * One validator message in the app's language.
 *
 * `lang` is `es` or `en`; anything else is treated as `es` (the app's default).
 * `familyLabel` is injected so this module stays free of i18n and can be tested
 * with a stub.
 */
export function translateCoachError(
  message: string,
  lang: string,
  familyLabel: FamilyLabel = (family) => family,
): string {
  const text = String(message ?? "").trim();
  if (!lang.startsWith("es")) return text;

  const noSlots = NO_SLOTS.test(text);
  if (noSlots) return "La propuesta no trae ningún ejercicio.";

  if (TOO_LONG.test(text)) {
    return "La respuesta se cortó por el tope de tokens: súbelo en el coach (1024 o más) y vuelve a pedirla.";
  }

  const steps = TOO_MANY_STEPS.exec(text);
  if (steps) {
    return `El modelo se quedó dando vueltas (${steps[1]} pasos) sin cerrar la sesión: el plan determinista sigue en pie.`;
  }

  const noProposal = NO_PROPOSAL.exec(text);
  if (noProposal) {
    return "El modelo contestó en prosa pero no propuso ninguna sesión: el plan determinista sigue en pie. Vuelve a pedirlo o cambia de modelo.";
  }

  if (BAD_ARGS.test(text)) {
    return "El modelo envió la propuesta incompleta (JSON cortado): vuelve a pedirla o sube el tope de tokens.";
  }

  const http = HTTP_STATUS.exec(text);
  if (http) {
    return `El servidor local respondió ${http[1]}. Comprueba la URL con «Probar conexión».`;
  }

  if (text === "local model timed out") {
    return "El modelo local no contestó a tiempo: sube el tiempo de espera o reduce el contexto del servidor.";
  }

  if (NO_NETWORK.test(text)) {
    return "No hay ningún servidor escuchando en esa URL: arráncalo y usa «Probar conexión».";
  }

  if (text === "unexpected response shape from the local server") {
    return "El servidor contestó algo que no es una respuesta de chat: ¿es la URL de un servidor OpenAI-compatible?";
  }

  const notAvailable = NOT_AVAILABLE.exec(text);
  if (notAvailable) {
    return `«${notAvailable[1]}» no está en tu equipamiento actual.`;
  }

  const invalid = INVALID_PRESCRIPTION.exec(text);
  if (invalid) {
    return `«${invalid[1]}» no tiene una prescripción válida (series o repeticiones).`;
  }

  const recovery = RECOVERY.exec(text);
  if (recovery) {
    return `«${recovery[1]}» carga ${familyLabel(recovery[2])}, que todavía está en su ventana de recuperación.`;
  }

  const repeat = REPEAT.exec(text);
  if (repeat) {
    return `«${repeat[1]}» repite el trabajo de ${familyLabel(repeat[2])} que ya tiene la sesión: una familia principal por día.`;
  }

  const third = THIRD_OF_FAMILY.exec(text);
  if (third) {
    return `«${third[1]}» sería el tercer ejercicio de ${familyLabel(third[2])}: un día enfocado admite dos.`;
  }

  const repeated = REPEATED_PATTERN.exec(text);
  if (repeated) {
    return `«${repeated[1]}» repite el patrón ${repeated[2]}, que ya está en la sesión: un patrón de movimiento por sesión.`;
  }

  const vetoed = VETOED.exec(text);
  if (vetoed) {
    return `«${vetoed[1]}» es ${vetoed[2]}, un patrón vetado por la molestia que reportaste.`;
  }

  const budget = BUDGET.exec(text);
  if (budget) {
    return `La propuesta ocupa unos ${budget[1]} min y el presupuesto del día es ${budget[2]} min.`;
  }

  // Unknown rule: show it rather than swallow it, and say it came from the
  // validator so the owner knows it is not the app's own copy.
  return text;
}
