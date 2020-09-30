import program from 'commander';
const pkg = require('../package.json');

export function getHelp() {
  program
    .version(pkg.version)
    .arguments('[...files]')
    .option('--verify', `Verify that running embedme would result in no changes. Useful for CI`)
    .option('--dry-run', `Run embedme as usual, but don't write`)
    .option(
      '--source-root [directory]',
      `Directory your source files live in in order to shorten the comment line in code fence`,
    )
    .option('--silent', `No console output`)
    .option('--stdout', `Output resulting file to stdout (don't rewrite original)`)
    .option('--strip-embed-comment', `Remove the comments from the code fence. *Must* be run with --stdout flag`)
    .parse(process.argv);
}
