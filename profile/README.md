# MDZip

**Markdown, images, and metadata in one portable file.**

MDZip bundles one or more Markdown documents and their assets into a single `.mdz` file. Share a document with its images, move it between tools, or distribute a collection of linked pages without keeping a folder of files together.

An `.mdz` file is a ZIP archive with a structure defined by an open specification. The Markdown stays readable, and the archive can be inspected with ordinary ZIP tools.

[Visit MDZip.org](https://mdzip.org) · [Read the Specification](https://github.com/mdzip-project/mdzip-spec/blob/main/SPEC.md)

## Start here

| What you want to do | Where to go |
|---|---|
| Write and manage documents in a desktop app | [MDZip Studio](https://mdzip.org/studio.html) |
| Work with `.mdz` files in VS Code | [VS Code extension](https://marketplace.visualstudio.com/items?itemName=mdzip-project.mdzip-vscode) |
| Create and extract archives from the command line | [`mdz` CLI](https://github.com/mdzip-project/mdzip-cli) |
| Add MDZip support to your software | [JavaScript / TypeScript](https://github.com/mdzip-project/mdzip-core-js) or [C# / .NET](https://github.com/mdzip-project/mdzip-core) core libraries |
| Embed a Markdown and MDZip editor | [Editor packages](https://github.com/mdzip-project/mdzip-editor) for JavaScript, Angular, React, and Vue |
| Implement or understand the file format | [Format specification and examples](https://github.com/mdzip-project/mdzip-spec) |

## Repositories and releases

Explore the source, find a release, or open the published package. Each repository documents its own installation and usage.

### Specification

| Repository | Description | Release | Package |
|---|---|---|---|
| [mdzip-spec](https://github.com/mdzip-project/mdzip-spec) | `.mdz` format specification. All other repos ultimately refer to this. | [![Latest release for mdzip-spec](https://img.shields.io/github/v/release/mdzip-project/mdzip-spec?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-spec/releases/latest) | &mdash; |

### Core libraries

| Repository | Description | Release | Package |
|---|---|---|---|
| [mdzip-core](https://github.com/mdzip-project/mdzip-core) | C# / .NET library for working with `.mdz` archives (`MDZip.Core`). | [![Latest release for mdzip-core](https://img.shields.io/github/v/release/mdzip-project/mdzip-core?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-core/releases/latest) | [![NuGet package version for MDZip.Core](https://img.shields.io/nuget/v/MDZip.Core?logo=nuget)](https://www.nuget.org/packages/MDZip.Core) |
| [mdzip-core-js](https://github.com/mdzip-project/mdzip-core-js) | JavaScript `.mdz` core library (`@mdzip/core-js`, TypeScript, browser + Node.js). | [![Latest release for mdzip-core-js](https://img.shields.io/github/v/release/mdzip-project/mdzip-core-js?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-core-js/releases/latest) | [![NPM package version for @mdzip/core-js](https://img.shields.io/npm/v/@mdzip/core-js)](https://www.npmjs.com/package/@mdzip/core-js) |

### Editor packages

| Repository | Description | Release | Package |
|---|---|---|---|
| [mdzip-editor](https://github.com/mdzip-project/mdzip-editor) | `@mdzip/editor`, framework-independent MDZip workspace engine and browser view. | [![Latest release for mdzip-editor](https://img.shields.io/github/v/release/mdzip-project/mdzip-editor?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-editor/releases/latest) | [![NPM package version for @mdzip/editor](https://img.shields.io/npm/v/@mdzip/editor)](https://www.npmjs.com/package/@mdzip/editor) |
| [mdzip-editor](https://github.com/mdzip-project/mdzip-editor) | `@mdzip/editor-react`, React wrapper for the MDZip workspace editor. | [![Latest release for mdzip-editor](https://img.shields.io/github/v/release/mdzip-project/mdzip-editor?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-editor/releases/latest) | [![NPM package version for @mdzip/editor-react](https://img.shields.io/npm/v/@mdzip/editor-react)](https://www.npmjs.com/package/@mdzip/editor-react) |
| [mdzip-editor](https://github.com/mdzip-project/mdzip-editor) | `@mdzip/editor-vue`, Vue wrapper for the MDZip workspace editor. | [![Latest release for mdzip-editor](https://img.shields.io/github/v/release/mdzip-project/mdzip-editor?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-editor/releases/latest) | [![NPM package version for @mdzip/editor-vue](https://img.shields.io/npm/v/@mdzip/editor-vue)](https://www.npmjs.com/package/@mdzip/editor-vue) |
| [mdzip-editor](https://github.com/mdzip-project/mdzip-editor) | `@mdzip/editor-ng`, Angular UI components for the MDZip workspace engine. | [![Latest release for mdzip-editor](https://img.shields.io/github/v/release/mdzip-project/mdzip-editor?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-editor/releases/latest) | [![NPM package version for @mdzip/editor-ng](https://img.shields.io/npm/v/@mdzip/editor-ng)](https://www.npmjs.com/package/@mdzip/editor-ng) |

### Applications and extensions

| Repository | Description | Release | Package |
|---|---|---|---|
| [mdzip-cli](https://github.com/mdzip-project/mdzip-cli) | `mdz` CLI for creating and extracting `.mdz` archives (C# / .NET). | [![Latest release for mdzip-cli](https://img.shields.io/github/v/release/mdzip-project/mdzip-cli?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-cli/releases/latest) | &mdash; |
| [mdzip-vscode](https://github.com/mdzip-project/mdzip-vscode) | VS Code custom editor and bundled MCP server for reading and writing `.mdz` files, including packaged images. | [![Latest release for mdzip-vscode](https://img.shields.io/github/v/release/mdzip-project/mdzip-vscode?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-vscode/releases/latest) | [![MDZip on the VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=mdzip-project.mdzip-vscode) |
| [mdzip-studio](https://github.com/mdzip-project/mdzip-studio) | Cross-platform desktop/web application for MDZip authoring and management. The Windows install adds a File Explorer shell extension with `.mdz` preview and registration. | [![Latest release for mdzip-studio](https://img.shields.io/github/v/release/mdzip-project/mdzip-studio?logo=github&logoColor=white&label=release)](https://github.com/mdzip-project/mdzip-studio/releases/latest) | [![Download for Windows](https://img.shields.io/badge/Download-Windows-blue?logo=windows&logoColor=white)](https://mdzip.org/studio.html) |

## Contribute

Report a bug or propose a feature in the repository for the tool or library you use. For format questions and proposals, use the [specification repository](https://github.com/mdzip-project/mdzip-spec).

Working across repositories? This `.github` repository holds the [workspace manifest](https://github.com/mdzip-project/.github/blob/main/docs/workspace.md), [hub architecture](https://github.com/mdzip-project/.github/blob/main/docs/hub-architecture.md), and [agent instructions](https://github.com/mdzip-project/.github/blob/main/AGENTS.md). Cross-repository work is tracked through linked issues in the repositories that own the changes.
