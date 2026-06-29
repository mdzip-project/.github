# MDZip (.mdz)

MDZip is a portable, cross-platform format for bundling Markdown documents, images, and metadata into a single `.mdz` archive.

An `.mdz` file is a ZIP archive with a defined structure, so tools can reliably locate the entry Markdown file and its related assets.

It is designed for documentation and publishing workflows that need content portability, predictable rendering, and easy distribution across tools and platforms.

Each package can include:

- Markdown documents
- Images and other referenced assets
- Structured metadata used for indexing, validation, and tooling

MDZip is supported by a growing ecosystem of tools, including core libraries (C#/.NET and TypeScript), a CLI, an embeddable editor, a VS Code extension, and the cross-platform MDZip Studio app, all built on a public specification.

For full documentation, format details, and deeper guides, visit [mdzip.org](https://mdzip.org).

```mermaid
%%{init: {"flowchart": {"htmlLabels": false}}}%%
flowchart BT
    cli["mdzip-cli"]
    studio["mdzip-studio"]
    vscode["mdzip-vscode"]
    editor["mdzip-editor"]
    core["mdzip-core"]
    corejs["mdzip-core-js"]
    spec["mdzip-spec"]

    cli --> core
    studio --> editor
    vscode --> editor
    editor --> corejs

    core --> spec
    corejs --> spec
```

## Release status

Latest release and package status for MDZip repositories.

### Specification

| GitHub Repo | Description | Release | Package |
|---|---|---|---|
| [mdzip-spec](https://github.com/mdzip-project/mdzip-spec) | `.mdz` format specification. All other repos ultimately refer to this. | [![Latest release for mdzip-spec](https://img.shields.io/github/v/release/mdzip-project/mdzip-spec?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-spec/releases/latest) | &mdash; |

### Core libraries

| GitHub Repo | Description | Release | Package |
|---|---|---|---|
| [mdzip-core](https://github.com/mdzip-project/mdzip-core) | Platform (OS/runtime) `.mdz` core library (C#/.NET). | [![Latest release for mdzip-core](https://img.shields.io/github/v/release/mdzip-project/mdzip-core?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-core/releases/latest) | [![NuGet package version for mdzip-core](https://img.shields.io/nuget/v/mdzip-core?logo=nuget)](https://www.nuget.org/packages/mdzip-core) |
| [mdzip-core-js](https://github.com/mdzip-project/mdzip-core-js) | JavaScript `.mdz` core library (`@mdzip/core-js`, TypeScript, browser + Node.js). | [![Latest release for mdzip-core-js](https://img.shields.io/github/v/release/mdzip-project/mdzip-core-js?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-core-js/releases/latest) | [![NPM package version for @mdzip/core-js](https://img.shields.io/npm/v/@mdzip/core-js)](https://www.npmjs.com/package/@mdzip/core-js) |

### App libraries

| GitHub Repo | Description | Release | Package |
|---|---|---|---|
| [mdzip-editor](https://github.com/mdzip-project/mdzip-editor) | `@mdzip/editor`, framework-independent MDZip workspace engine and browser view. | [![Latest release for mdzip-editor](https://img.shields.io/github/v/release/mdzip-project/mdzip-editor?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-editor/releases/latest) | [![NPM package version for @mdzip/editor](https://img.shields.io/npm/v/@mdzip/editor)](https://www.npmjs.com/package/@mdzip/editor) |
| [mdzip-editor](https://github.com/mdzip-project/mdzip-editor) | `@mdzip/editor-react`, React wrapper for the MDZip workspace editor. | [![Latest release for mdzip-editor](https://img.shields.io/github/v/release/mdzip-project/mdzip-editor?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-editor/releases/latest) | [![NPM package version for @mdzip/editor-react](https://img.shields.io/npm/v/@mdzip/editor-react)](https://www.npmjs.com/package/@mdzip/editor-react) |
| [mdzip-editor](https://github.com/mdzip-project/mdzip-editor) | `@mdzip/editor-vue`, Vue wrapper for the MDZip workspace editor. | [![Latest release for mdzip-editor](https://img.shields.io/github/v/release/mdzip-project/mdzip-editor?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-editor/releases/latest) | [![NPM package version for @mdzip/editor-vue](https://img.shields.io/npm/v/@mdzip/editor-vue)](https://www.npmjs.com/package/@mdzip/editor-vue) |
| [mdzip-editor](https://github.com/mdzip-project/mdzip-editor) | `@mdzip/editor-ng`, Angular UI components for the MDZip workspace engine. | [![Latest release for mdzip-editor](https://img.shields.io/github/v/release/mdzip-project/mdzip-editor?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-editor/releases/latest) | [![NPM package version for @mdzip/editor-ng](https://img.shields.io/npm/v/@mdzip/editor-ng)](https://www.npmjs.com/package/@mdzip/editor-ng) |

### Applications & Extensions/Plugins

| GitHub Repo | Description | Release | Package |
|---|---|---|---|
| [mdzip-cli](https://github.com/mdzip-project/mdzip-cli) | Platform (OS/runtime) CLI for create/extract (C#/.NET). | [![Latest release for mdzip-cli](https://img.shields.io/github/v/release/mdzip-project/mdzip-cli?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-cli/releases/latest) | &mdash; |
| [mdzip-vscode](https://github.com/mdzip-project/mdzip-vscode) | VS Code custom editor and bundled MCP server for reading and writing `.mdz` files, including packaged images. | [![Latest release for mdzip-vscode](https://img.shields.io/github/v/release/mdzip-project/mdzip-vscode?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-vscode/releases/latest) | [![MDZip on the VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=mdzip-project.mdzip-vscode) |
| [mdzip-studio](https://github.com/mdzip-project/mdzip-studio) | Cross-platform desktop/web application for MDZip authoring and management. The Windows install adds a File Explorer shell extension with `.mdz` preview and registration. | [![Latest release for mdzip-studio](https://img.shields.io/github/v/release/mdzip-project/mdzip-studio?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-studio/releases/latest) | [![Download for Windows](https://img.shields.io/badge/Download-Windows-blue?logo=windows&logoColor=white)](https://mdzip.org/studio.html) |
