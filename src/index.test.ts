import { transpile, LibraryType } from "./index";

describe("transpile", () => {
  it("transforms a simple react component to react component", () => {
    const simpleComponent = `
      import React from 'react';
      export default function Component() {
        return <div>hello world</div>;
      }
    `.trim();

    expect(transpile(simpleComponent, LibraryType.React).outputText)
      .toMatchInlineSnapshot(`
      "import React from 'react';
      export default function Component() {
          return <div>hello world</div>;
      }
      "
    `);
  });

  it("transforms a simple react component to preact component", () => {
    const simpleComponent = `
      import React from 'react';
      export default function Component() {
        return <div>hello world</div>;
      }
    `.trim();

    expect(transpile(simpleComponent, LibraryType.Preact).outputText)
      .toMatchInlineSnapshot(`
      "import { h } from 'preact';
      export default function Component() {
          return <div>hello world</div>;
      }
      "
    `);
  });
});
