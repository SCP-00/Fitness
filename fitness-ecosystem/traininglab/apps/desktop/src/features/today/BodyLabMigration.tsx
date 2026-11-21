import { useRef, useState } from "react";
import { schedulePrivateAutobackup } from "../../lib/private-autobackup";
import {
  archiveFromLegacyBodyLab,
  bodyLabCollections,
  parseBodyLabArchive,
  readBodyLabZip,
  reconcileBodyLabArchive,
  type BodyLabArchive,
  type BodyLabMergeReceipt,
} from "../../lib/bodylab-migration";
import {
  loadBodyLabArchive,
  mergeBodyLabArchive,
} from "../../lib/bodylab-migration-db";
import { Button } from "../../ui/primitives";

const labels = {
  es: {
    choose: "Elegir copia de BodyLab",
    omitted: "Esta copia no incluye",
    hint: "Conserva los registros originales en un archivo privado de TrainingLab.",
    review: "Revisión de la copia",
    collection: "Registros",
    add: "Nuevos",
    same: "Ya guardados",
    conflict: "Conflictos",
    conflictHint:
      "Se conserva la versión guardada. Mantén la copia de origen para revisar los conflictos.",
    apply: "Guardar copia privada",
    cancel: "Cancelar",
    done: "Copia privada guardada.",
    invalid:
      "No se pudo leer la copia completa. Comprueba el formato y vuelve a elegir el archivo.",
    failed:
      "No se guardó la copia. Vuelve a elegir el archivo para revisar los datos.",
    profiles: "Perfiles",
    measurements: "Medidas",
    snapshots: "Instantáneas",
    exerciseSets: "Series",
    maxEfforts: "Esfuerzos máximos",
    metadata: "Metadatos y ajustes",
    localPreferences: "Preferencias locales",
  },
  en: {
    choose: "Choose BodyLab archive",
    omitted: "This archive is missing",
    hint: "Keep your original records in a private TrainingLab archive.",
    review: "Archive review",
    collection: "Records",
    add: "New",
    same: "Already saved",
    conflict: "Conflicts",
    conflictHint:
      "The saved version is kept. Retain the original file to review conflicts.",
    apply: "Save private archive",
    cancel: "Cancel",
    done: "Private archive saved.",
    invalid:
      "Could not read the full archive. Check the format and choose the file again.",
    failed:
      "The archive was not saved. Choose the file again to review your data.",
    profiles: "Profiles",
    measurements: "Measurements",
    snapshots: "Snapshots",
    exerciseSets: "Sets",
    maxEfforts: "Max efforts",
    metadata: "Metadata and settings",
    localPreferences: "Local preferences",
  },
} as const;

export function BodyLabMigration({ language }: { language: "es" | "en" }) {
  const copy = labels[language];
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{
    archive: BodyLabArchive;
    receipt: BodyLabMergeReceipt;
    omitted: readonly (typeof bodyLabCollections)[number][];
  } | null>(null);

  async function read(file: File) {
    setBusy(true);
    setMessage("");
    setPreview(null);
    try {
      const isZip = file.name.toLowerCase().endsWith(".bodylab");
      const json: unknown = isZip ? null : JSON.parse(await file.text());
      const legacy = isZip
        ? await readBodyLabZip(new Uint8Array(await file.arrayBuffer()))
        : archiveFromLegacyBodyLab(json);
      const archive = legacy?.archive ?? parseBodyLabArchive(json);
      if (!archive) throw new Error("Invalid BodyLab archive");
      const { receipt } = reconcileBodyLabArchive(
        await loadBodyLabArchive(),
        archive,
      );
      setPreview({ archive, receipt, omitted: legacy?.omitted ?? [] });
    } catch {
      setMessage(copy.invalid);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!preview) return;
    setBusy(true);
    try {
      await mergeBodyLabArchive(preview.archive, preview.receipt);
      void schedulePrivateAutobackup();
      setMessage(copy.done);
    } catch {
      setMessage(copy.failed);
    } finally {
      setPreview(null);
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-[var(--tl-border)] space-y-3">
      <Button size="sm" onClick={() => input.current?.click()} disabled={busy}>
        {copy.choose}
      </Button>
      <input
        ref={input}
        type="file"
        accept=".bodylab,.json,application/zip,application/json"
        hidden
        data-testid="bodylab-migration-file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void read(file);
        }}
      />
      <p className="text-sm text-[var(--tl-text-muted)]">{copy.hint}</p>
      {preview && (
        <>
          {preview.omitted.length > 0 && (
            <p>
              {copy.omitted} ·{" "}
              {preview.omitted.map((key) => copy[key]).join(", ")}
            </p>
          )}
          <table className="w-full text-xs text-left">
            <caption className="text-left font-semibold mb-2">
              {copy.review}
            </caption>
            <thead>
              <tr>
                <th scope="col">{copy.collection}</th>
                <th scope="col">{copy.add}</th>
                <th scope="col">{copy.same}</th>
                <th scope="col">{copy.conflict}</th>
              </tr>
            </thead>
            <tbody>
              {bodyLabCollections.map((key) => {
                const row = preview.receipt[key];
                return (
                  <tr key={key}>
                    <th scope="row" className="font-normal">
                      {copy[key]}
                    </th>
                    <td>{row.added}</td>
                    <td>{row.unchanged}</td>
                    <td>{row.conflicts.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {bodyLabCollections.some(
            (key) => preview.receipt[key].conflicts.length > 0,
          ) && (
            <p className="text-sm text-[var(--tl-text-muted)]">
              {copy.conflictHint}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void save()} disabled={busy}>
              {copy.apply}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPreview(null)}
              disabled={busy}
            >
              {copy.cancel}
            </Button>
          </div>
        </>
      )}
      {message && (
        <p className="text-sm" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
