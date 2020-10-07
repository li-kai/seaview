import { transpile } from "./index";

describe("transpile", () => {
  it("transforms a simple react component to react component", () => {
    const simpleComponent = `
      import React from 'react';
      export default function Component() {
        return <div>hello world</div>;
      }
    `.trim();

    expect(transpile(simpleComponent).outputText).toMatchInlineSnapshot(`
      "import React from 'react';
      export default function Component() {
          return <div>hello world</div>;
      }
      "
    `);
  });
});
