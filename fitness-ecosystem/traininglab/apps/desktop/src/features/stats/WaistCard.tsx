import { useEffect, useState, type FormEvent } from "react";
import { MEASUREMENT_RANGES } from "@fitness/bodylab-measurements";
import { todayKey } from "../../lib/day";
import { getLanguage } from "../../lib/i18n";
import { parseNumberInput } from "../../lib/parse-num";
import { uid } from "../../lib/uid";
import {
  comparableWaistHistory,
  isWaistMeasurement,
  type WaistMeasurement,
} from "../../lib/waist";
import {
  loadWaistMeasurements,
  saveWaistMeasurement,
} from "../../lib/waist-db";

export function WaistCard({ firstDay }: { firstDay: string }) {
  const es = getLanguage() === "es";
  const [rows, setRows] = useState<WaistMeasurement[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [landmark, setLandmark] =
    useState<WaistMeasurement["landmark"]>("navel");
  const [day, setDay] = useState(todayKey);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const today = todayKey();
  const history = comparableWaistHistory(rows ?? [], landmark, firstDay, today);
  const latest = history.at(-1);
  const first = history[0];
  const format = new Intl.NumberFormat(es ? "es" : "en", {
    maximumFractionDigits: 2,
  });
  const { min, max } = MEASUREMENT_RANGES.waist;

  useEffect(() => {
    let active = true;
    void loadWaistMeasurements().then(
      (result) => {
        if (active) setRows(result);
      },
      () => {
        if (active)
          setError(
            es
              ? "No se pudieron leer las medidas."
              : "Could not load measurements.",
          );
      },
    );
    return () => {
      active = false;
    };
  }, [es]);

  function clearForm() {
    setEditing(null);
    setInput("");
    setDay(today);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || rows === null) return;
    const row = {
      id: editing ?? uid(),
      cm: parseNumberInput(input),
      day,
      landmark,
    };
    setStatus("");
    if (!isWaistMeasurement(row) || day > today) {
      setError(
        es
          ? `Indica una fecha válida y un valor de ${min} a ${max} cm.`
          : `Enter a valid date and a value from ${min} to ${max} cm.`,
      );
      return;
    }
    setError("");
    setBusy(true);
    try {
      setRows(await saveWaistMeasurement(row));
      setStatus(es ? "Medida guardada." : "Measurement saved.");
      clearForm();
    } catch {
      setError(
        es
          ? "No se pudo guardar. Puedes reintentar."
          : "Could not save. You can try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="waist-title">
      <div className="card-head">
        <h2 id="waist-title">{es ? "Medir cintura" : "Measure waist"}</h2>
      </div>
      <div className="card-body flex flex-col gap-3">
        <p>
          {es
            ? "De pie, con el abdomen relajado, coloca una cinta no extensible en horizontal y al final de una exhalación normal. Ajusta sin comprimir. Usa el mismo punto al repetir."
            : "Stand relaxed. Keep a non-stretch tape horizontal and take the reading at the end of a normal exhale. Keep it snug without compressing. Use the same landmark each time."}
        </p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => void submit(event)}
        >
          <label className="field">
            {es ? "Punto de medición" : "Measurement landmark"}
            <select
              value={landmark}
              disabled={busy || editing !== null}
              onChange={(event) =>
                setLandmark(
                  event.target.value === "narrowest" ? "narrowest" : "navel",
                )
              }
            >
              <option value="navel">
                {es ? "A la altura del ombligo" : "At the navel"}
              </option>
              <option value="narrowest">
                {es
                  ? "Punto más estrecho del torso"
                  : "Narrowest point of the torso"}
              </option>
            </select>
          </label>
          <div className="row-wrap">
            <label className="field">
              {es ? "Fecha" : "Date"}
              <input
                type="date"
                max={today}
                value={day}
                required
                disabled={busy}
                onChange={(event) => setDay(event.target.value)}
              />
            </label>
            <label className="field">
              {es ? "Perímetro (cm)" : "Circumference (cm)"}
              <input
                inputMode="decimal"
                value={input}
                required
                disabled={busy}
                onChange={(event) => setInput(event.target.value)}
              />
            </label>
          </div>
          <div className="row-wrap">
            <button
              className="btn btn-primary"
              disabled={rows === null || busy}
            >
              {editing
                ? es
                  ? "Guardar corrección"
                  : "Save correction"
                : es
                  ? "Guardar medida"
                  : "Save measurement"}
            </button>
            {editing && (
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={clearForm}
              >
                {es ? "Cancelar" : "Cancel"}
              </button>
            )}
          </div>
        </form>
        {error && <p role="alert">{error}</p>}
        <p role="status">{status}</p>
        {latest && (
          <p>
            {es ? "Última medida del periodo" : "Latest measurement in period"}{" "}
            · {format.format(latest.cm)} cm
          </p>
        )}
        {first && latest && first.day !== latest.day && (
          <p>
            {es ? "Cambio en el periodo" : "Change over the period"} ·{" "}
            {latest.cm > first.cm ? "+" : ""}
            {format.format(latest.cm - first.cm)} cm
          </p>
        )}
        {rows !== null && history.length === 0 && (
          <p>
            {es
              ? "Sin medidas de este punto en el periodo."
              : "No measurements at this landmark in the selected period."}
          </p>
        )}
        {history.length > 0 && (
          <ul aria-label={es ? "Historial de cintura" : "Waist history"}>
            {[...history].reverse().map((row) => (
              <li key={row.id} className="row-wrap">
                <time dateTime={row.day}>{row.day}</time> ·{" "}
                {format.format(row.cm)} cm
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={busy}
                  onClick={() => {
                    setEditing(row.id);
                    setInput(String(row.cm));
                    setDay(row.day);
                    setError("");
                    setStatus("");
                  }}
                >
                  {es ? "Corregir" : "Edit"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
