import { writeFile } from 'fs/promises';
import type { AuditReport } from '../types/index.js';

export async function generateJSONReport(
  report: AuditReport,
  outputPath: string
): Promise<void> {
  await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8');
}
