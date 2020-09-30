type FilenameFromCommentReader = (line: string) => string | null;

export enum SupportedFileType {
  PLAIN_TEXT = 'txt',
  TYPESCRIPT = 'ts',
  JAVASCRIPT = 'js',
  REASON = 're',
  SCSS = 'scss',
  RUST = 'rust',
  JAVA = 'java',
  CPP = 'cpp',
  C = 'c',
  HTML = 'html',
  XML = 'xml',
  MARKDOWN = 'md',
  YAML = 'yaml',
  JSON = 'json',
  JSON_5 = 'json5',
  PYTHON = 'py',
  BASH = 'bash',
  SHELL = 'sh',
  GOLANG = 'go',
  OBJECTIVE_C = 'objectivec',
  PHP = 'php',
  C_SHARP = 'cs',
  SWIFT = 'swift',
  RUBY = 'rb',
  KOTLIN = 'kotlin',
  SCALA = 'scala',
  CRYSTAL = 'cr',
  PLANT_UML = 'puml',
  MERMAID = 'mermaid',
  CMAKE = 'cmake',
  PROTOBUF = 'proto',
  SQL = 'sql',
  HASKELL = 'hs',
  ARDUINO = 'ino',
  JSX = 'jsx',
  TSX = 'tsx',
}

export enum CommentFamily {
  NONE, // some languages do not support comments, e.g. JSON
  C,
  XML,
  HASH,
  SINGLE_QUOTE,
  DOUBLE_PERCENT,
  DOUBLE_HYPHENS,
}

const languageMap: Record<CommentFamily, SupportedFileType[]> = {
  [CommentFamily.NONE]: [SupportedFileType.JSON],
  [CommentFamily.C]: [
    SupportedFileType.PLAIN_TEXT, // this is a lie, but we gotta pick something
    SupportedFileType.C,
    SupportedFileType.TYPESCRIPT,
    SupportedFileType.REASON,
    SupportedFileType.JAVASCRIPT,
    SupportedFileType.RUST,
    SupportedFileType.CPP,
    SupportedFileType.JAVA,
    SupportedFileType.GOLANG,
    SupportedFileType.OBJECTIVE_C,
    SupportedFileType.SCSS,
    SupportedFileType.PHP,
    SupportedFileType.C_SHARP,
    SupportedFileType.SWIFT,
    SupportedFileType.KOTLIN,
    SupportedFileType.SCALA,
    SupportedFileType.JSON_5,
    SupportedFileType.PROTOBUF,
    SupportedFileType.ARDUINO,
    SupportedFileType.JSX,
    SupportedFileType.TSX,
  ],
  [CommentFamily.XML]: [SupportedFileType.HTML, SupportedFileType.MARKDOWN, SupportedFileType.XML],
  [CommentFamily.HASH]: [
    SupportedFileType.PYTHON,
    SupportedFileType.BASH,
    SupportedFileType.SHELL,
    SupportedFileType.YAML,
    SupportedFileType.RUBY,
    SupportedFileType.CRYSTAL,
    SupportedFileType.CMAKE,
  ],
  [CommentFamily.SINGLE_QUOTE]: [SupportedFileType.PLANT_UML],
  [CommentFamily.DOUBLE_PERCENT]: [SupportedFileType.MERMAID],
  [CommentFamily.DOUBLE_HYPHENS]: [SupportedFileType.SQL, SupportedFileType.HASKELL],
};

const leadingSymbol = (symbol: string): FilenameFromCommentReader => line => {
  const regex = new RegExp(`${symbol}\\s?(\\S*?$)`);

  const match = line.match(regex);
  if (!match) {
    return null;
  }

  return match[1];
};

export const filetypeCommentReaders: Record<CommentFamily, FilenameFromCommentReader> = {
  [CommentFamily.NONE]: _ => null,
  [CommentFamily.C]: leadingSymbol('//'),
  [CommentFamily.XML]: line => {
    const match = line.match(/<!--\s*?(\S*?)\s*?-->/);
    if (!match) {
      return null;
    }

    return match[1];
  },
  [CommentFamily.HASH]: leadingSymbol('#'),
  [CommentFamily.SINGLE_QUOTE]: leadingSymbol(`'`),
  [CommentFamily.DOUBLE_PERCENT]: leadingSymbol('%%'),
  [CommentFamily.DOUBLE_HYPHENS]: leadingSymbol('--'),
};

export function lookupLanguageCommentFamily(fileType: SupportedFileType): CommentFamily | null {
  return Object.values(CommentFamily)
    .filter(x => typeof x === 'number')
    .find((commentFamily: CommentFamily) => languageMap[commentFamily].includes(fileType));
}
