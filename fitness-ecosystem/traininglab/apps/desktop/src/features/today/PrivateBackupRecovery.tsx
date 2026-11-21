import { useEffect, useState } from "react";
import {
  privateBackupHasMissingData,
  readPrivateAutobackup,
  restorePrivateAutobackup,
  type PrivateBackup,
} from "../../lib/private-autobackup";

export function PrivateBackupRecovery({ language }: { language: "es" | "en" }) {
  const [backup, setBackup] = useState<PrivateBackup | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const es = language === "es";

  useEffect(() => {
    let active = true;
    void (async () => {
      const found = await readPrivateAutobackup();
      if (found && (await privateBackupHasMissingData(found)) && active)
        setBackup(found);
    })().catch(() => {
      if (active)
        setMessage(
          es
            ? "No se pudo revisar la copia privada."
            : "Could not check the private backup.",
        );
    });
    return () => {
      active = false;
    };
  }, [es]);

  async function recover() {
    if (!backup) return;
    setBusy(true);
    try {
      await restorePrivateAutobackup(backup);
      setBackup(null);
      setMessage(es ? "Copia privada restaurada." : "Private backup restored.");
    } catch {
      setMessage(
        es
          ? "No se pudo restaurar la copia privada."
          : "Could not restore the private backup.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      {backup && (
        <>
          <p>
            {es
              ? "Hay datos corporales guardados en una copia automática que faltan en este dispositivo."
              : "An automatic backup contains body data missing on this device."}
          </p>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() => void recover()}
          >
            {es ? "Restaurar copia privada" : "Restore private backup"}
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
