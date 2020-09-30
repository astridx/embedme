import program from 'commander';

export interface EmbedmeOptions {
  sourceRoot: string;
  dryRun: boolean;
  verify: boolean;
  silent: boolean;
  stdout: boolean;
  stripEmbedComment: boolean;
}
const options: EmbedmeOptions = (program as unknown) as EmbedmeOptions;
export function getOptions() {
  if (options.verify) {
    console.log(`Verifying...`);
  } else if (options.dryRun) {
    console.log(`Doing a dry run...`);
  } else if (options.stdout) {
    console.log(`Outputting to stdout...`);
  } else {
    console.log(`Embedding...`);
  }
  return options;
}
