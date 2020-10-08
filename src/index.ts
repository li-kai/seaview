#!/usr/bin/env node
import ts from "typescript";
import { kebabCase } from "./stringUtils";
import { isHTMLElementTag, isSVGElementTag } from "./tagNames";

function getJsxFactory(libType: LibraryType) {
  switch (libType) {
    case LibraryType.Vue2:
      return "createElement";
    case LibraryType.Vue3:
      return "h";
    default:
      return undefined;
  }
}

function getCompileOptions(
  libType: LibraryType,
  options?: ts.CompilerOptions,
): Readonly<ts.CompilerOptions> {
  return {
    ...options,
    allowJs: true,
    noEmitOnError: true,
    esModuleInterop: true,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ES2020,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    jsx:
      libType === LibraryType.Vue2 || libType === LibraryType.Vue3
        ? ts.JsxEmit.React
        : ts.JsxEmit.Preserve,
    jsxFactory: getJsxFactory(libType),
  };
}

export enum LibraryType {
  React = "react",
  Preact = "preact",
  Vue2 = "vue2",
  Vue3 = "vue3",
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

/**
 * Check if this node is a react component
 *
 * @param {ts.Node} node node
 * @returns {boolean} true if it is, false otherwise
 */
function isReactComponent(node: ts.Node): node is ts.FunctionDeclaration {
  // todo: mark as react component if returning jsx elements
  // todo: check for function expressions as well
  if (ts.isFunctionDeclaration(node)) {
    // identify functions with UpperCamelCase names as react components
    const fnName = node.name?.text ?? "";
    if (fnName[0] === fnName[0].toUpperCase()) {
      return true;
    }
  }
  return false;
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
  const hImportSpecifier = ts.factory.createImportSpecifier(
    undefined,
    ts.factory.createIdentifier("h"),
  );

  if (libType === LibraryType.Preact) {
    const preactVisitor: ts.Visitor = (node) => {
      if (isReactImport(node, sf)) {
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
      } else if (
        ts.isJsxSelfClosingElement(node) ||
        ts.isJsxOpeningElement(node)
      ) {
        const tagName = node.tagName.getText(sf);
        const isHTMLTag = isHTMLElementTag(tagName);
        const isSVGTag = isSVGElementTag(tagName);
        // ignore non-native elements
        if (!(isHTMLTag || isSVGTag)) {
          return ts.visitEachChild(node, preactVisitor, ctx);
        }

        const jsxAttributeVisitor: ts.Visitor = (node) => {
          if (ts.isJsxAttribute(node)) {
            if (node.name.text === "onChange") {
              return ts.factory.updateJsxAttribute(
                node,
                ts.factory.createIdentifier("onInput"),
                node.initializer,
              );
            } else if (isSVGTag && tagName !== "svg") {
              const svgAttr = kebabCase(node.name.text);
              return ts.factory.updateJsxAttribute(
                node,
                ts.factory.createIdentifier(svgAttr),
                node.initializer,
              );
            }
          }
          return ts.visitEachChild(node, jsxAttributeVisitor, ctx);
        };
        return ts.visitEachChild(node, jsxAttributeVisitor, ctx);
      }

      return ts.visitEachChild(node, preactVisitor, ctx);
    };

    return preactVisitor;
  } else if (libType === LibraryType.Vue2) {
    const vueVisitor: ts.Visitor = (node) => {
      if (isReactImport(node, sf)) {
        return ts.factory.updateImportDeclaration(
          node,
          undefined,
          undefined,
          ts.factory.createImportClause(
            false,
            ts.factory.createIdentifier("Vue"),
            undefined,
          ),
          ts.factory.createStringLiteral(
            "vue",
            isSingleQuote(node.moduleSpecifier, sf),
          ),
        );
      } else if (isReactComponent(node)) {
        const componentArgs: ts.Expression[] = [];
        const componentName = node.name?.getText(sf);
        if (componentName) {
          componentArgs.push(
            ts.factory.createStringLiteral(kebabCase(componentName)),
          );
        }

        const vueRenderMethod = ts.factory.createMethodDeclaration(
          undefined,
          undefined,
          undefined,
          "render",
          undefined,
          undefined,
          [
            ts.factory.createParameterDeclaration(
              undefined,
              undefined,
              undefined,
              getJsxFactory(libType)!,
            ),
          ],
          ts.factory.createTypeReferenceNode("VNode"),
          node.body,
        );
        componentArgs.push(
          ts.factory.createObjectLiteralExpression([vueRenderMethod]),
        );

        const vueComponentExpression = ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier("Vue"),
            "component",
          ),
          undefined,
          componentArgs,
        );

        const isExportDefault = node.modifiers?.some(
          (md) => md.kind === ts.SyntaxKind.DefaultKeyword,
        );
        if (isExportDefault) {
          return ts.factory.createExportAssignment(
            undefined,
            undefined,
            undefined,
            vueComponentExpression,
          );
        }
        return vueComponentExpression;
      }

      return ts.visitEachChild(node, vueVisitor, ctx);
    };

    return vueVisitor;
  } else if (libType === LibraryType.Vue3) {
    const vueVisitor: ts.Visitor = (node) => {
      if (isReactImport(node, sf)) {
        return ts.factory.updateImportDeclaration(
          node,
          undefined,
          undefined,
          ts.factory.createImportClause(
            false,
            ts.factory.createIdentifier("Vue"),
            ts.factory.createNamedImports([
              hImportSpecifier,
              ts.factory.createImportSpecifier(
                undefined,
                ts.factory.createIdentifier("defineComponent"),
              ),
            ]),
          ),
          ts.factory.createStringLiteral(
            "vue",
            isSingleQuote(node.moduleSpecifier, sf),
          ),
        );
      } else if (isReactComponent(node)) {
        const vueBody = ts.factory.createBlock([
          ts.factory.createReturnStatement(
            ts.factory.createArrowFunction(
              undefined,
              node.typeParameters,
              node.parameters,
              node.type,
              undefined,
              node.body!,
            ),
          ),
        ]);

        const vueComponentExpression = ts.factory.createCallExpression(
          ts.factory.createIdentifier("defineComponent"),
          undefined,
          [
            ts.factory.createFunctionExpression(
              undefined,
              undefined,
              node.name,
              undefined,
              undefined,
              undefined,
              vueBody,
            ),
          ],
        );

        const isExportDefault = node.modifiers?.some(
          (md) => md.kind === ts.SyntaxKind.DefaultKeyword,
        );
        if (isExportDefault) {
          return ts.factory.createExportAssignment(
            undefined,
            undefined,
            undefined,
            vueComponentExpression,
          );
        }
        return vueComponentExpression;
      }

      return ts.visitEachChild(node, vueVisitor, ctx);
    };

    return vueVisitor;
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
  const mergedOptions = getCompileOptions(libType, compilerOptions);
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
  const mergedOptions = getCompileOptions(libType, compilerOptions);
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
