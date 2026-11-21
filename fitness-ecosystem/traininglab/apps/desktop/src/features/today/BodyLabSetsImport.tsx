import { useState } from "react";
import { buildBackup } from "../../lib/backup";
import { loadBodyLabArchive } from "../../lib/bodylab-migration-db";
import {
  planBodyLabSets,
  type BodyLabSetsPreview,
} from "../../lib/bodylab-sets";
import type { TLSet, TLSession } from "../../lib/types";
import { Button } from "../../ui/primitives";

export function BodyLabSetsImport({
  language,
  sets,
  sessions,
  importBackup,
}: {
  language: "es" | "en";
  sets: TLSet[];
  sessions: TLSession[];
  importBackup: (file: File) => Promise<{ ok: boolean; message: string }>;
}) {
  const es = language === "es";
  const [preview, setPreview] = useState<BodyLabSetsPreview | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function review() {
    setBusy(true);
    setMessage("");
    try {
      const archive = await loadBodyLabArchive();
      if (!archive) {
        setMessage(
          es
            ? "Primero guarda una copia de BodyLab."
            : "First save a BodyLab archive.",
        );
        setPreview(null);
      } else {
        setPreview(planBodyLabSets(archive, sets, sessions));
      }
    } catch {
      setMessage(
        es ? "No se pudo leer la copia." : "Could not read the archive.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!preview) return;
    setBusy(true);
    try {
      const archive = await loadBodyLabArchive();
      if (
        !archive ||
        JSON.stringify(planBodyLabSets(archive, sets, sessions)) !==
          JSON.stringify(preview)
      ) {
        setPreview(null);
        setMessage(
          es
            ? "Los datos cambiaron. Revisa la importación otra vez."
            : "Data changed. Review the import again.",
        );
        return;
      }
      const backup = buildBackup({
        sets: preview.sets,
        sessions: preview.sessions,
        health: [],
        settings: null,
        decisionModel: null,
      });
      const file = new File([JSON.stringify(backup)], "bodylab-sets.json", {
        type: "application/json",
      });
      const result = await importBackup(file);
      setMessage(
        result.ok
          ? es
            ? `Importadas ${preview.sets.length} series de BodyLab.`
            : `Imported ${preview.sets.length} BodyLab sets.`
          : result.message,
      );
      setPreview(null);
    } catch {
      setMessage(
        es ? "No se pudieron importar las series." : "Could not import sets.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <Button
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => void review()}
      >
        {es ? "Revisar series de BodyLab" : "Review BodyLab sets"}
      </Button>
      {preview && (
        <div>
          <p>
            {es
              ? `${preview.sets.length} listas para importar · ${preview.duplicates} ya importadas · ${preview.ambiguous} posibles duplicados · ${preview.invalid} sin datos compatibles.`
              : `${preview.sets.length} ready to import · ${preview.duplicates} already imported · ${preview.ambiguous} possible duplicates · ${preview.invalid} incompatible.`}
          </p>
          <p>
            {es
              ? "Cada registro se muestra por separado en Historial con origen BodyLab. Los posibles duplicados permanecen en la copia original."
              : "Each entry appears separately in History with BodyLab as its source. Possible duplicates remain in the original archive."}
          </p>
          <Button
            size="sm"
            disabled={busy || !preview.sets.length}
            onClick={() => void apply()}
          >
            {es ? "Importar series revisadas" : "Import reviewed sets"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setPreview(null)}
          >
            {es ? "Cancelar" : "Cancel"}
          </Button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
