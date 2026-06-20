import { BinaryDownloads } from '../ui/BinaryDownloads.js';
import type { NodeUiProps } from '../ui/types.js';

export function CsvExportUi({ result }: NodeUiProps) {
  return <BinaryDownloads result={result} mime="text/csv;charset=utf-8" />;
}
