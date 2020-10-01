import { getSourceFile } from './getSourceFile';
import { getTargetFileContent } from './getTargetFileContent';
import { getHelp } from './getHelp';
import { getOptions } from './getOptions';
import { existsSync, readFileSync, writeFileSync } from 'fs';

async function go() {
  try {
    getHelp();
    const options = getOptions();

    const sourceFiles = getSourceFile();

    sourceFiles.forEach(async source => {
      if (!existsSync(source)) {
        process.exit(1);
      }

      const sourceText = readFileSync(source, 'utf-8');

      const outText = await getTargetFileContent(source, sourceText, options);

      if (options.verify) {
        if (sourceText !== outText) {
          process.exit(1);
        }
      } else if (options.stdout) {
        process.stdout.write(outText);
      } else if (!options.dryRun) {
        if (sourceText !== outText) {
          writeFileSync(source, outText);
        } else {
        }
      }
    });
  } catch (e) {
    console.error(e); //
  }
}

go();
