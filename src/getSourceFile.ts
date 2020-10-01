import program from 'commander';
import glob from 'glob';
import { getOptions } from './getOptions';
import { relative } from 'path';
import { existsSync, readFileSync } from 'fs';
import { compile } from 'gitignore-parser';

export function getSourceFile() {
  const options = getOptions();
  const { args: sourceFilesInput } = program;
  let sourceFiles = sourceFilesInput.reduce<string[]>((files, file) => {
    if (glob.hasMagic(file)) {
      files.push(...glob.sync(file));
    } else {
      files.push(file);
    }

    return files;
  }, []);

  if (sourceFiles.length > 1) {
  } else if (sourceFiles.length === 0) {
    process.exit(0);
  }

  if (options.stripEmbedComment && !options.stdout) {
    process.exit(1);
  }

  const ignoreFile = ['.embedmeignore', '.gitignore'].map(f => relative(process.cwd(), f)).find(existsSync);

  if (ignoreFile) {
    const ignore = compile(readFileSync(ignoreFile, 'utf-8'));

    const filtered = sourceFiles.filter(ignore.accepts);

    sourceFiles = filtered;

    if (sourceFiles.length === 0) {
      process.exit(0);
    }
  }

  return sourceFiles;
}
