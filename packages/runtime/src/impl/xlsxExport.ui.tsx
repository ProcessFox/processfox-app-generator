import { BinaryDownloads } from '../ui/BinaryDownloads.js';
import type { NodeUiProps } from '../ui/types.js';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function XlsxExportUi({ result }: NodeUiProps) {
  return <BinaryDownloads result={result} mime={XLSX_MIME} />;
}
