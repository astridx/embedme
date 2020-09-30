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
    console.log(`More than one file matched your input, results will be concatenated in stdout`);
  } else if (sourceFiles.length === 0) {
    console.log(`No files matched your input`);
    process.exit(0);
  }

  if (options.stripEmbedComment && !options.stdout) {
    console.log(
      `If you use the --strip-embed-comment flag, you must use the --stdout flag and redirect the result to your destination file, otherwise your source file(s) will be rewritten and comment source is lost.`,
    );
    process.exit(1);
  }

  if (options.verify) {
    console.log(`Verifying...`);
  } else if (options.dryRun) {
    console.log(`Doing a dry run...`);
  } else if (options.stdout) {
    console.log(`Outputting to stdout...`);
  } else {
    console.log(`Embedding...`);
  }

  const ignoreFile = ['.embedmeignore', '.gitignore'].map(f => relative(process.cwd(), f)).find(existsSync);

  if (ignoreFile) {
    const ignore = compile(readFileSync(ignoreFile, 'utf-8'));

    const filtered = sourceFiles.filter(ignore.accepts);

    console.log(`Skipped ${sourceFiles.length - filtered.length} files ignored in '${ignoreFile}'`);

    sourceFiles = filtered;

    if (sourceFiles.length === 0) {
      console.log(`All matching files were ignored in '${ignoreFile}'`);
      process.exit(0);
    }
  }

  return sourceFiles;
}
