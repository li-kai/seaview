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

  it("transforms a react component's html onChange to preact's onInput", () => {
    const comp = `
      import React from 'react';
      export default function Component(props) {
        return (<>
          <input onChange={props.onChange} />
          <svg onChange={props.onChange}></svg>
        </>);
      }
    `.trim();

    expect(transpile(comp, LibraryType.Preact).outputText)
      .toMatchInlineSnapshot(`
      "import { h } from 'preact';
      export default function Component(props) {
          return (<>
                <input onInput={props.onChange}/>
                <svg onInput={props.onChange}></svg>
              </>);
      }
      "
    `);
  });

  it("does not transform a react component's non-html onChange to preact's onInput", () => {
    const comp = `
      import React from 'react';
      export default function Component(props) {
        return (<>
          <Input onChange={props.onChange} />
          <Svg onChange={props.onChange}></Svg>
        </>);
      }
    `.trim();

    expect(transpile(comp, LibraryType.Preact).outputText)
      .toMatchInlineSnapshot(`
      "import { h } from 'preact';
      export default function Component(props) {
          return (<>
                <Input onChange={props.onChange}/>
                <Svg onChange={props.onChange}></Svg>
              </>);
      }
      "
    `);
  });
});
