import { useEffect, useState } from "react";
import { loadBodyLabArchive } from "../../lib/bodylab-migration-db";
import {
  readArchivedMeasurements,
  type ArchivedMeasurement,
} from "../../lib/archived-measurements";
import { getLanguage } from "../../lib/i18n";
import { todayKey } from "../../lib/day";

const labels: Record<string, [string, string]> = {
  weight: ["Peso corporal", "Body weight"],
  wrist: ["Muñeca", "Wrist"],
  neck: ["Cuello", "Neck"],
  shoulders: ["Hombros", "Shoulders"],
  chest: ["Pecho", "Chest"],
  waist: ["Cintura", "Waist"],
  hips: ["Cadera", "Hips"],
  biceps: ["Bíceps", "Biceps"],
  forearm: ["Antebrazo", "Forearm"],
  thigh: ["Muslo", "Thigh"],
  calf: ["Pantorrilla", "Calf"],
  body_fat_percentage: ["Grasa corporal", "Body fat"],
  lean_mass: ["Masa magra", "Lean mass"],
};

function displayType(type: string, es: boolean): string {
  return labels[type]?.[es ? 0 : 1] ?? type.replaceAll("_", " ");
}

export function ArchivedMeasurementsCard({ firstDay }: { firstDay: string }) {
  const es = getLanguage() === "es";
  const [rows, setRows] = useState<ArchivedMeasurement[]>([]);
  const [profile, setProfile] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    void loadBodyLabArchive()
      .then((archive) => {
        if (!active) return;
        const result = readArchivedMeasurements(
          archive?.data.measurements ?? [],
        );
        setRows(result);
        setProfile(result[0]?.profileId ?? "");
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error)
    return (
      <p role="alert">
        {es
          ? "No se pudieron leer las medidas de BodyLab."
          : "Could not read BodyLab measurements."}
      </p>
    );
  if (!rows.length) return null;

  const profiles = [...new Set(rows.map((row) => row.profileId))];
  const profileRows = rows.filter((row) => row.profileId === profile);
  const types = [...new Set(profileRows.map((row) => row.type))];
  const selectedType = types.includes(type) ? type : types[0];
  const history = profileRows.filter(
    (row) =>
      row.type === selectedType && row.day >= firstDay && row.day <= todayKey(),
  );
  const format = new Intl.NumberFormat(es ? "es" : "en", {
    maximumFractionDigits: 12,
  });
  const newest = history[0];
  const comparable =
    selectedType === "weight" && newest
      ? history.filter(
          (row) => row.unit === newest.unit && row.method === newest.method,
        )
      : [];
  const oldest = comparable.at(-1);
  const profilesLabel = es ? "Perfil original" : "Original profile";

  return (
    <section className="card" aria-labelledby="archived-measurements-title">
      <div className="card-head">
        <h2 id="archived-measurements-title">
          {es ? "Medidas de BodyLab" : "BodyLab measurements"}
        </h2>
      </div>
      <div className="card-body flex flex-col gap-3">
        <p>
          {es
            ? "Historial original de la copia. Cada registro conserva su fecha, unidad y método."
            : "Original archive history. Each record retains its date, unit and method."}
        </p>
        {profiles.length > 1 && (
          <label className="field">
            {profilesLabel}
            <select
              value={profile}
              onChange={(event) => setProfile(event.target.value)}
            >
              {profiles.map((id, index) => (
                <option key={id} value={id}>
                  {profilesLabel} {index + 1} · {id}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          {es ? "Medida" : "Measurement"}
          <select
            aria-label={es ? "Medida" : "Measurement"}
            value={selectedType}
            onChange={(event) => setType(event.target.value)}
          >
            {types.map((id) => (
              <option key={id} value={id}>
                {displayType(id, es)}
              </option>
            ))}
          </select>
        </label>
        {newest && oldest && newest.day !== oldest.day && (
          <p>
            {es ? "Cambio de peso" : "Weight change"} ·{" "}
            {newest.value > oldest.value ? "+" : ""}
            {format.format(newest.value - oldest.value)} {newest.unit}
            {" · "}
            {oldest.day} → {newest.day}
          </p>
        )}
        {selectedType !== "weight" && (
          <p>
            {es
              ? "La copia no identifica el punto anatómico de cada medición. Revisa el sitio y el lado antes de comparar."
              : "The archive does not identify each measurement landmark. Check the site and side before comparing."}
          </p>
        )}
        {history.length ? (
          <ul
            aria-label={
              es ? "Historial original de BodyLab" : "Original BodyLab history"
            }
          >
            {history.map((row) => (
              <li key={row.id}>
                <time dateTime={row.timestamp}>{row.day}</time> ·{" "}
                {format.format(row.value)} {row.unit} · {row.method} ·{" "}
                {row.confidence}
                {row.notes && <span> · {row.notes}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {es
              ? "Sin registros de esta medida en el periodo."
              : "No records for this measurement in the period."}
          </p>
        )}
      </div>
    </section>
  );
}
