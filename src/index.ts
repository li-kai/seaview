#!/usr/bin/env node
import ts from "typescript";

const DEFAULT_COMPILE_OPTIONS: Readonly<ts.CompilerOptions> = {
  allowJs: true,
  noEmitOnError: true,
  esModuleInterop: true,
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ES2020,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  jsx: ts.JsxEmit.Preserve,
};

export enum LibraryType {
  React = "react",
  Preact = "preact",
}

const REACT_REGEX = /['"]react['"]/;
const SINGLE_QUOTE_REGEX = /'/;

/**
 * Check if this node is a import react node
 *
 * @param {ts.Node} node node
 * @param {ts.SourceFile} sf source file to get text from
 * @returns {boolean} true if it is, false otherwise
 */
function isReactImport(
  node: ts.Node,
  sf: ts.SourceFile,
): node is ts.ImportDeclaration {
  return (
    ts.isImportDeclaration(node) &&
    REACT_REGEX.test(node.moduleSpecifier.getText(sf))
  );
}

function isSingleQuote(node: ts.Node, sf: ts.SourceFile): boolean {
  return (
    ts.isStringLiteralLike(node) && SINGLE_QUOTE_REGEX.test(node.getText(sf))
  );
}

function nodeVisitor(
  ctx: ts.TransformationContext,
  sf: ts.SourceFile,
  libType: LibraryType,
) {
  if (libType === LibraryType.Preact) {
    const preactVisitor: ts.Visitor = (node) => {
      if (isReactImport(node, sf)) {
        const hImportSpecifier = ts.factory.createImportSpecifier(
          undefined,
          ts.factory.createIdentifier("h"),
        );
        return ts.factory.updateImportDeclaration(
          node,
          undefined,
          undefined,
          ts.factory.createImportClause(
            false,
            undefined,
            ts.factory.createNamedImports([hImportSpecifier]),
          ),
          ts.factory.createStringLiteral(
            "preact",
            isSingleQuote(node.moduleSpecifier, sf),
          ),
        );
      }
      return ts.visitEachChild(node, preactVisitor, ctx);
    };

    return preactVisitor;
  }

  const visitor: ts.Visitor = (node) => {
    return ts.visitEachChild(node, visitor, ctx);
  };

  return visitor;
}

export function transform(
  libType: LibraryType,
): ts.TransformerFactory<ts.SourceFile> {
  return (ctx) => (sf) => ts.visitNode(sf, nodeVisitor(ctx, sf, libType));
}

export function transpile(
  input: string,
  libType: LibraryType,
  compilerOptions?: ts.CompilerOptions,
): ts.TranspileOutput {
  const mergedOptions = { ...compilerOptions, ...DEFAULT_COMPILE_OPTIONS };
  let emitResult = ts.transpileModule(input, {
    compilerOptions: mergedOptions,
    transformers: {
      before: [transform(libType)],
    },
  });
  return emitResult;
}

function compile(
  fileNames: string[],
  libType: LibraryType,
  compilerOptions?: ts.CompilerOptions,
): void {
  const mergedOptions = { ...compilerOptions, ...DEFAULT_COMPILE_OPTIONS };
  let program = ts.createProgram(fileNames, mergedOptions);
  let emitResult = program.emit(
    undefined,
    (fileName, content) => {
      ts.sys.writeFile(fileName, `/* @generated */${ts.sys.newLine}${content}`);
    },
    undefined,
    undefined,
    {
      before: [transform(libType)],
    },
  );

  let allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  // ts.findConfigFile()
  // ts.getParsedCommandLineOfConfigFile()

  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start!,
      );
      let message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n",
      );

      let logMethod;
      switch (diagnostic.category) {
        case ts.DiagnosticCategory.Error:
          logMethod = console.error;
          break;
        case ts.DiagnosticCategory.Warning:
          logMethod = console.warn;
          break;
        default:
          logMethod = console.log;
      }

      logMethod(
        `${diagnostic.file.fileName} (${line + 1},${
          character + 1
        }): ${message}`,
      );
    } else {
      console.log(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      );
    }
  });

  let exitCode = emitResult.emitSkipped ? 1 : 0;
  console.log(`Process exiting with code '${exitCode}'.`);
  process.exit(exitCode);
}

// This ensures that this section of code only runs in cli mode
// https://stackoverflow.com/a/6398335
if (require.main === module) {
  // TODO: pass compile options via flags
  // TODO: help output
  compile(process.argv.slice(3), process.argv[2] as LibraryType);
}
