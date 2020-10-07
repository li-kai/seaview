import ts from 'typescript';

function nodeVisitor(ctx: ts.TransformationContext, sf: ts.SourceFile) {
  const visitor: ts.Visitor = (node) => {
    return ts.visitEachChild(node, visitor, ctx);
  };

  return visitor;
}

export function transform(): ts.TransformerFactory<ts.SourceFile> {
  return (ctx) => (sf) => ts.visitNode(sf, nodeVisitor(ctx, sf));
}

function compile(fileNames: string[], options: ts.CompilerOptions): void {
  let program = ts.createProgram(fileNames, options);
  let emitResult = program.emit(
    undefined,
    (fileName, content) => {
      ts.sys.writeFile(fileName, `/* @generated */${ts.sys.newLine}${content}`);
    },
    undefined,
    undefined,
    {
      before: [transform()],
    }
  );

  let allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  // ts.findConfigFile()
  // ts.getParsedCommandLineOfConfigFile()

  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start!
      );
      let message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n'
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
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      );
    } else {
      console.log(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      );
    }
  });

  let exitCode = emitResult.emitSkipped ? 1 : 0;
  console.log(`Process exiting with code '${exitCode}'.`);
  process.exit(exitCode);
}

compile(process.argv.slice(2), {
  allowJs: true,
  noEmitOnError: true,
  esModuleInterop: true,
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ES2020,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  jsx: ts.JsxEmit.Preserve,
});
