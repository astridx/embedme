import { getSourceFile } from './getSourceFile';
import { getTargetFileContent } from './getTargetFileContent';
import { getHelp } from './getHelp';
import { getOptions } from './getOptions';
import { relative, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

async function go() {
  try {
    getHelp();
    const options = getOptions();

    const sourceFiles = getSourceFile();

    sourceFiles.forEach(async (source, i) => {
      if (i > 0) {
        console.log(`Source---` + source);
      }

      const resolvedPath = resolve(source);
      console.log(`ResolvedPath---` + resolvedPath);

      if (!existsSync(source)) {
        console.log(`  File ${relative(process.cwd(), resolvedPath)} does not exist.`);
        process.exit(1);
      }

      const sourceText = readFileSync(source, 'utf-8');

      const outText = await getTargetFileContent(source, sourceText, options);
      console.log(outText);

      if (options.verify) {
        if (sourceText !== outText) {
          console.log(`Diff detected, exiting 1`);
          process.exit(1);
        }
      } else if (options.stdout) {
        process.stdout.write(outText);
      } else if (!options.dryRun) {
        if (sourceText !== outText) {
          console.log(`  Writing ${relative(process.cwd(), resolvedPath)} with embedded changes.`);
          writeFileSync(source, outText);
        } else {
          console.log(`  No changes to write for ${relative(process.cwd(), resolvedPath)}`);
        }
      }
    });
  } catch (e) {
    console.error(e); //
  }
}

go();
