import React from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { ExportFormat } from "@/utils";

interface ExportFormatModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (format: ExportFormat) => void | Promise<void>;
  title: string;
  description: string;
  isLoading?: boolean;
}

export const ExportFormatModal: React.FC<ExportFormatModalProps> = ({
  open,
  onClose,
  onSelect,
  title,
  description,
  isLoading = false,
}) => {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => void onSelect("pdf")}
            disabled={isLoading}
            className="flex flex-col items-start gap-2 rounded-md border border-border px-4 py-4 text-right transition-colors hover:bg-muted disabled:opacity-60"
          >
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <FileText size={16} />
              PDF
            </div>
            <span className="text-sm text-muted-foreground">קובץ קריא ונוח לשיתוף והדפסה</span>
          </button>
          <button
            onClick={() => void onSelect("excel")}
            disabled={isLoading}
            className="flex flex-col items-start gap-2 rounded-md border border-border px-4 py-4 text-right transition-colors hover:bg-muted disabled:opacity-60"
          >
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <FileSpreadsheet size={16} />
              Excel
            </div>
            <span className="text-sm text-muted-foreground">קובץ XLSX לעבודה ב-Excel</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
