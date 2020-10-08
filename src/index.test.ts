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

  describe(LibraryType.Preact, () => {
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

    it("transforms react svg attributes to kebab-case in preact", () => {
      const comp = `
      import React from 'react';
      export default function Component(props) {
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <circle fill="none" strokeWidth="2" strokeLinejoin="round" cx="24" cy="24" r="20" />
          </svg>
        );
      }
    `.trim();

      expect(transpile(comp, LibraryType.Preact).outputText)
        .toMatchInlineSnapshot(`
              "import { h } from 'preact';
              export default function Component(props) {
                  return (<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 48 48\\">
                          <circle fill=\\"none\\" stroke-width=\\"2\\" stroke-linejoin=\\"round\\" cx=\\"24\\" cy=\\"24\\" r=\\"20\\"/>
                        </svg>);
              }
              "
          `);
    });

    it("does not transform non-svg react attributes to kebab-case in preact", () => {
      const comp = `
      import React from 'react';
      export default function Component(props) {
        return (
          <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <Circle fill="none" strokeWidth="2" strokeLinejoin="round" cx="24" cy="24" r="20" />
          </Svg>
        );
      }
    `.trim();

      expect(transpile(comp, LibraryType.Preact).outputText)
        .toMatchInlineSnapshot(`
              "import { h } from 'preact';
              export default function Component(props) {
                  return (<Svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 48 48\\">
                          <Circle fill=\\"none\\" strokeWidth=\\"2\\" strokeLinejoin=\\"round\\" cx=\\"24\\" cy=\\"24\\" r=\\"20\\"/>
                        </Svg>);
              }
              "
          `);
    });
  });

  describe(LibraryType.Vue2, () => {
    it("transforms a simple react component to vue component", () => {
      const simpleComponent = `
      import React from 'react';
      export default function Component() {
        return <div>hello world</div>;
      }
    `.trim();

      expect(transpile(simpleComponent, LibraryType.Vue2).outputText)
        .toMatchInlineSnapshot(`
        "import Vue from 'vue';
        export default Vue.component(\\"component\\", { render(createElement) {
                return createElement(\\"div\\", null, \\"hello world\\");
            } });
        "
      `);
    });
  });

  describe(LibraryType.Vue3, () => {
    it("transforms a simple react component to vue component", () => {
      const simpleComponent = `
        import React from 'react';
        export default function Component() {
          return <div>hello world</div>;
        }
      `.trim();

      expect(transpile(simpleComponent, LibraryType.Vue3).outputText)
        .toMatchInlineSnapshot(`
        "import Vue, { h, defineComponent } from 'vue';
        export default defineComponent(function Component() { return () => {
            return h(\\"div\\", null, \\"hello world\\");
        }; });
        "
      `);
    });
  });
});
