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
  if (options.stripEmbedComment && !options.stdout) {
    console.error(
      `If you use the --strip-embed-comment flag, you must use the --stdout flag and redirect the result to your destination file, otherwise your source file(s) will be rewritten and comment source is lost.`,
    );
    process.exit(1);
  }

  if (options.verify) {
    console.log(`Verifying...`);
  } else if (options.dryRun) {
    console.log(`Doing a dry run...`);
  } else if (options.stdout) {
    //console.log(`Outputting to stdout...`);
  } else {
    console.log(`Embedding...`);
  }
  return options;
}
