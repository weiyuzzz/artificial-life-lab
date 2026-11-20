import {
  downloadText,
  fileSlug,
} from "@/components/experiments/experimentData";
import { activateExperiment } from "@/components/experiments/session";
import { ctlButton } from "@/components/experiments/styles";
import { importExperimentJSON, statsToCSV } from "@/engine";
import { useI18n } from "@/i18n";
import { useSimStore } from "@/store/useSimStore";
import { FileDown, FileSpreadsheet, FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

/** Export JSON / CSV and import JSON — available without sign-in. */
export function DataTransfer() {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const stamp = () => {
    const s = useSimStore.getState();
    return `${fileSlug(s.experiment?.name)}-c${s.cycle}`;
  };

  const exportJson = () => {
    const data = useSimStore.getState().exportExperiment();
    downloadText(`${stamp()}.json`, JSON.stringify(data), "application/json");
  };

  const exportCsv = () => {
    const csv = statsToCSV(useSimStore.getState().getEngine().stats.history);
    downloadText(`${stamp()}-stats.csv`, csv, "text/csv;charset=utf-8");
  };

  const onFile = async (file: File) => {
    setImportError(null);
    try {
      const data = importExperimentJSON(await file.text());
      useSimStore.getState().loadExperimentData(data);
      activateExperiment(null);
      toast.success(t("exp.imported"));
    } catch {
      setImportError(t("exp.importInvalid"));
      toast.error(t("exp.importInvalid"));
    }
  };

  return (
    <section
      className="border-t border-border px-4 py-3"
      data-ocid="exp.data.section"
    >
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={exportJson}
          className={ctlButton}
          data-ocid="exp.export_json.button"
        >
          <FileDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{t("exp.exportJson")}</span>
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className={ctlButton}
          data-ocid="exp.export_csv.button"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{t("exp.exportCsv")}</span>
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={ctlButton}
          data-ocid="exp.import_json.upload_button"
        >
          <FileUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{t("exp.importJson")}</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        tabIndex={-1}
        aria-label={t("exp.importJson")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onFile(file);
        }}
        data-ocid="exp.import_json.input"
      />
      {importError && (
        <p
          role="alert"
          className="mt-2 text-xs text-destructive"
          data-ocid="exp.import_json.error_state"
        >
          {importError}
        </p>
      )}
    </section>
  );
}
