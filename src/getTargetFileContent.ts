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
    const commentInsertion = start.match(/<!--\s*?embedme[ ]+?(\S+?)\s*?-->/);

    const replacement: string = await getReplacement({
      inputFilePath,
      options,
      substr: codeFence,
      leadingSpaces,
      lineEnding,
      codeExtension: codeExtension as SupportedFileType,
      firstLine: firstLine || '',
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
  ignoreNext: boolean;
  commentEmbedOverrideFilepath?: string;
}) {
  if (ignoreNext) {
    return substr;
  }

  let commentedFilename: string | null;
  if (commentEmbedOverrideFilepath) {
    commentedFilename = commentEmbedOverrideFilepath;
  } else {
    if (!codeExtension) {
      return substr;
    }

    if (!firstLine) {
      return substr;
    }

    const supportedFileTypes: SupportedFileType[] = Object.values(SupportedFileType).filter(x => typeof x === 'string');

    if (supportedFileTypes.indexOf(codeExtension) < 0) {
      return substr;
    }

    const languageFamily: CommentFamily | null = lookupLanguageCommentFamily(codeExtension);

    if (languageFamily == null) {
      return substr;
    }

    commentedFilename = filetypeCommentReaders[languageFamily](firstLine);
  }

  if (!commentedFilename) {
    return substr;
  }

  const matches = commentedFilename.match(/\s?(\S+?)((#L(\d+)-L(\d+))|$)/m);

  if (!matches) {
    return substr;
  }

  const [, filename, , lineNumbering, startLine, endLine] = matches;
  if (filename.includes('#')) {
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
    return substr;
  }

  if (replacement.slice(0, -3).trimRight() === substr.slice(0, -3).trimRight()) {
    return substr;
  }

  return replacement;
}

function detectLineEnding(sourceText: string): string {
  let rexp = new RegExp(/\r\n/);

  return rexp.test(sourceText) ? '\r\n' : '\n';
}
