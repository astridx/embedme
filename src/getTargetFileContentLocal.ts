import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { EmbedmeOptions } from './getOptions';

export function getTargetFileContentLocal({
  options,
  inputFilePath,
  filename,
}: {
  options: EmbedmeOptions;
  inputFilePath: string;
  filename: string;
}) {
  const relativePath = options.sourceRoot
    ? resolve(process.cwd(), options.sourceRoot, filename)
    : resolve(inputFilePath, '..', filename);

  if (!existsSync(relativePath)) {
    return '';
  }

  const file = readFileSync(relativePath, 'utf8');
  return file;
}
