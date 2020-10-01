import { getTargetFileContentRemote } from './getTargetFileContentRemote';
import { getTargetFileContentLocal } from './getTargetFileContentLocal';
import { EmbedmeOptions } from './getOptions';
import { SupportedFileType, CommentFamily, lookupLanguageCommentFamily, filetypeCommentReaders } from './getParams';

export async function getTargetFileContent(inputFilePath: string, sourceText: string, options: EmbedmeOptions) {
  const codeFenceFinder: RegExp = /([ \t]*?)```([\s\S]*?)^[ \t]*?```/gm;

  const lineEnding = detectLineEnding(sourceText);

  const docPartials = [];

  let previousEnd = 0;

  let result: RegExpExecArray | null;
  while ((result = codeFenceFinder.exec(sourceText)) !== null) {
    const [codeFence, leadingSpaces] = result;
    const start = sourceText.substring(previousEnd, result.index);

    const extensionMatch = codeFence.match(/```(.*)/);

    const codeExtension = extensionMatch ? extensionMatch[1] : null;
    const splitFence = codeFence.split(lineEnding);
    const firstLine = splitFence.length >= 3 ? splitFence[1] : null;

    const startLineNumber = (() => {
      if (options.dryRun || options.stdout || options.verify) {
        return getLineNumber(sourceText.substring(0, result.index), result.index, lineEnding);
      }
      const startingLineNumber = docPartials.join('').split(lineEnding).length - 1;
      return (
        startingLineNumber + getLineNumber(sourceText.substring(previousEnd, result.index), result.index, lineEnding)
      );
    })();

    const commentInsertion = start.match(/<!--\s*?embedme[ ]+?(\S+?)\s*?-->/);

    const replacement: string = await getReplacement({
      inputFilePath,
      options,
      substr: codeFence,
      leadingSpaces,
      lineEnding,
      codeExtension: codeExtension as SupportedFileType,
      firstLine: firstLine || '',
      startLineNumber,
      ignoreNext: /<!--\s*?embedme[ -]ignore-next\s*?-->/g.test(start),
      commentEmbedOverrideFilepath: commentInsertion ? commentInsertion[1] : undefined,
    });

    docPartials.push(start, replacement);
    previousEnd = codeFenceFinder.lastIndex;
  }

  return [...docPartials].join('') + sourceText.substring(previousEnd);
}

async function getReplacement({
  inputFilePath,
  options,
  substr,
  leadingSpaces,
  lineEnding,
  codeExtension,
  firstLine,
  startLineNumber,
  ignoreNext,
  commentEmbedOverrideFilepath,
}: {
  inputFilePath: string;
  options: EmbedmeOptions;
  substr: string;
  leadingSpaces: string;
  lineEnding: string;
  codeExtension: SupportedFileType;
  firstLine: string;
  startLineNumber: number;
  ignoreNext: boolean;
  commentEmbedOverrideFilepath?: string;
}) {
  console.log('LineNumber: ' + startLineNumber);

  if (ignoreNext) {
    console.log(`"Ignore next" comment detected, skipping code block...`);
    return substr;
  }

  let commentedFilename: string | null;
  if (commentEmbedOverrideFilepath) {
    commentedFilename = commentEmbedOverrideFilepath;
  } else {
    if (!codeExtension) {
      console.log(`No code extension detected, skipping code block...`);
      return substr;
    }

    if (!firstLine) {
      console.log(`Code block is empty & no preceding embedme comment, skipping...`);
      return substr;
    }

    const supportedFileTypes: SupportedFileType[] = Object.values(SupportedFileType).filter(x => typeof x === 'string');

    if (supportedFileTypes.indexOf(codeExtension) < 0) {
      console.log(
        `Unsupported file extension [${codeExtension}], supported extensions are ${supportedFileTypes.join(
          ', ',
        )}, skipping code block`,
      );
      return substr;
    }

    const languageFamily: CommentFamily | null = lookupLanguageCommentFamily(codeExtension);

    if (languageFamily == null) {
      console.log(
        `File extension ${codeExtension} marked as supported, but comment family could not be determined. Please report this issue.`,
      );
      return substr;
    }

    commentedFilename = filetypeCommentReaders[languageFamily](firstLine);
  }

  if (!commentedFilename) {
    console.log(`No comment detected in first line for block with extension ${codeExtension}`);
    return substr;
  }

  const matches = commentedFilename.match(/\s?(\S+?)((#L(\d+)-L(\d+))|$)/m);

  if (!matches) {
    console.log(`No file found in embed line`);
    return substr;
  }

  const [, filename, , lineNumbering, startLine, endLine] = matches;
  if (filename.includes('#')) {
    console.log(`Incorrectly formatted line numbering string ${filename}, Expecting Github formatting e.g. #L10-L20`);
    return substr;
  }

  let TargetFileContent = '';

  if (filename.startsWith('http')) {
    TargetFileContent = await getTargetFileContentRemote(filename);
  } else {
    TargetFileContent = getTargetFileContentLocal({ options, inputFilePath, filename });
  }

  if (TargetFileContent === '') {
    return substr;
  }

  const file = TargetFileContent;

  let lines = file.split(lineEnding);
  if (lineNumbering) {
    lines = lines.slice(+startLine - 1, +endLine);
  }

  const minimumLeadingSpaces = lines.reduce((minSpaces: number, line: string) => {
    if (minSpaces === 0) {
      return 0;
    }

    if (line.length === 0) {
      return Infinity; //empty lines shouldn't count
    }

    const leadingSpaces = line.match(/^[\s]+/m);

    if (!leadingSpaces) {
      return 0;
    }

    return Math.min(minSpaces, leadingSpaces[0].length);
  }, Infinity);

  lines = lines.map(line => line.slice(minimumLeadingSpaces));

  const outputCode = lines.join(lineEnding);

  if (/```/.test(outputCode)) {
    console.log(
      `Output snippet for file ${filename} contains a code fence. Refusing to embed as that would break the document`,
    );
    return substr;
  }

  let replacement =
    !!commentEmbedOverrideFilepath || options.stripEmbedComment
      ? `\`\`\`${codeExtension}${lineEnding}${outputCode}${lineEnding}\`\`\``
      : `\`\`\`${codeExtension}${lineEnding}${firstLine.trim()}${lineEnding}${lineEnding}${outputCode}${lineEnding}\`\`\``;

  if (leadingSpaces.length) {
    replacement = replacement
      .split(lineEnding)
      .map(line => leadingSpaces + line)
      .join(lineEnding);
  }

  if (replacement === substr) {
    console.log(`No changes required, already up to date`);
    return substr;
  }

  if (replacement.slice(0, -3).trimRight() === substr.slice(0, -3).trimRight()) {
    console.log(`Changes are trailing whitespace only, ignoring`);
    return substr;
  }

  console.error(
    `Embedded ${lines.length + ' lines'}${
      options.stripEmbedComment ? ' without comment line' : ''
    } from file ${commentedFilename}`,
  );

  //console.log(`Embedded ${lines.length + ' lines'}${options.stripEmbedComment} from file ${commentedFilename}`);

  return replacement;
}

function getLineNumber(text: string, index: number, lineEnding: string): number {
  return text.substring(0, index).split(lineEnding).length;
}

function detectLineEnding(sourceText: string): string {
  let rexp = new RegExp(/\r\n/);

  return rexp.test(sourceText) ? '\r\n' : '\n';
}
