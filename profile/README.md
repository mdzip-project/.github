# MDZip (.mdz)

MDZip is a portable, cross-platform format for bundling Markdown documents, images, and metadata into a single `.mdz` archive.

An `.mdz` file is a ZIP archive with a defined structure, so tools can reliably locate the entry Markdown file and its related assets.

It is designed for documentation and publishing workflows that need content portability, predictable rendering, and easy distribution across tools and platforms.

Each package can include:

- Markdown documents
- Images and other referenced assets
- Structured metadata used for indexing, validation, and tooling

MDZip is supported by a growing ecosystem of tools, including a CLI, core libraries, a browser-focused viewer, and a public specification.

For full documentation, format details, and deeper guides, visit [mdzip.org](https://mdzip.org).

```mermaid
flowchart BT
    cli["mdzip-cli (Win/Mac/Linux)
    <!--<br/> <a href="https://github.com/kylemwhite/mdz-cli/releases/latest" target="_blank" rel="noopener" class="no-ext-icon">
            <img src="https://img.shields.io/github/v/release/kylemwhite/mdz-cli?display_name=tag" alt="Latest release for mdz-cli">
          </a> -->
    "]
    viewer["mdzip-viewer
    <!--<br/> <a href="https://www.npmjs.com/package/mdz-viewer" target="_blank" rel="noopener" class="no-ext-icon">
        <img src="https://img.shields.io/npm/v/mdz-viewer" alt="NPM package version for mdz-viewer">
    </a> -->
    "]

    core["mdzip-core (C#/.NET)
    <!--<br/> <a href="https://github.com/kylemwhite/mdz-core/pkgs/nuget/mdz-core" target="_blank" rel="noopener" class="no-ext-icon">
        <img src="https://img.shields.io/badge/GitHub%20Packages-mdz--core-0969da?logo=github" alt="GitHub Packages listing for mdz-core">
    </a> -->
    "]
    corejs["mdzip-core-js (TS/JS)
    <!--<br/> <a href="https://www.npmjs.com/package/mdz-core-js" target="_blank" rel="noopener" class="no-ext-icon">
      <img src="https://img.shields.io/npm/v/mdz-core-js" alt="NPM package version for mdz-core-js">
    </a> -->
    "]

    spec["mdzip-spec
    <!-- <a href="https://github.com/mdzip-project/mdzip-spec/releases/latest" target="_blank" rel="noopener" >
      <img src="https://img.shields.io/github/v/release/mdzip-project/mdzip-spec?display_name=tag" alt="Latest release for MDZip-spec">
    </a> -->
    "]

    cli --> core
    viewer --> corejs

    core --> spec
    corejs --> spec
```

## Release status

Latest release and package status for core MDZip repositories.

<div class="table-scroll">
  <table class="spec-table table-wide">
    <thead>
      <tr>
        <th>Repository</th>
        <th>Description</th>
        <th>GitHub</th>
        <th>Package</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td colspan="4" class="table-section">Spec</td>
      </tr>
      <tr>
        <td><a href="https://github.com/mdzip-project/mdzip-spec" target="_blank" rel="noopener">MDZip-spec</a></td>
        <td><code>.mdz</code> format specification (Markdown).</td>
        <td>
          <a href="https://github.com/mdzip-project/mdzip-spec/releases/latest" target="_blank" rel="noopener" class="no-ext-icon">
            <img src="https://img.shields.io/github/v/release/mdzip-project/mdzip-spec?display_name=tag" alt="Latest release for MDZip-spec">
          </a>
        </td>
        <td>&mdash;</td>
      </tr>
      <tr>
        <td colspan="4" class="table-section">Core libraries for creating and extracting <code>.mdz</code> files. Based on <a href="https://github.com/mdzip-project/mdzip-spec" target="_blank" rel="noopener">MDZip-spec</a></td>
      </tr>
      <tr>
        <td><a href="https://github.com/kylemwhite/mdz-core" target="_blank" rel="noopener">mdz-core</a></td>
        <td>Platform (OS/runtime) <code>.mdz</code> core library (C#/.NET).</td>
        <td>
          <a href="https://github.com/kylemwhite/mdz-core/releases/latest" target="_blank" rel="noopener" class="no-ext-icon">
            <img src="https://img.shields.io/github/v/release/kylemwhite/mdz-core?display_name=tag" alt="Latest release for mdz-core">
          </a>
        </td>
        <td>
          <a href="https://github.com/kylemwhite/mdz-core/pkgs/nuget/mdz-core" target="_blank" rel="noopener" class="no-ext-icon">
            <img src="https://img.shields.io/badge/GitHub%20Packages-mdz--core-0969da?logo=github" alt="GitHub Packages listing for mdz-core">
          </a>
        </td>
      </tr>
      <tr>
        <td><a href="https://github.com/kylemwhite/mdz-core-js" target="_blank" rel="noopener">mdz-core-js</a></td>
        <td>JavaScript <code>.mdz</code> core library (TypeScript, browser + Node.js).</td>
        <td>
          <a href="https://github.com/kylemwhite/mdz-core-js/releases/latest" target="_blank" rel="noopener" class="no-ext-icon">
            <img src="https://img.shields.io/github/v/release/kylemwhite/mdz-core-js?display_name=tag" alt="Latest release for mdz-core-js">
          </a>
        </td>
        <td>
          <a href="https://www.npmjs.com/package/mdz-core-js" target="_blank" rel="noopener" class="no-ext-icon">
            <img src="https://img.shields.io/npm/v/mdz-core-js" alt="NPM package version for mdz-core-js">
          </a>
        </td>
      </tr>
      <tr>
        <td colspan="4" class="table-section">App library</td>
      </tr>
      <tr>
        <td><a href="https://github.com/kylemwhite/mdz-cli" target="_blank" rel="noopener">mdz-cli</a></td>
        <td>Platform (OS/runtime) CLI for create/extract (C#/.NET). Uses <a href="https://github.com/kylemwhite/mdz-core" target="_blank" rel="noopener">mdz-core</a></td>
        <td>
          <a href="https://github.com/kylemwhite/mdz-cli/releases/latest" target="_blank" rel="noopener" class="no-ext-icon">
            <img src="https://img.shields.io/github/v/release/kylemwhite/mdz-cli?display_name=tag" alt="Latest release for mdz-cli">
          </a>
        </td>
        <td>&mdash;</td>
      </tr>
      <tr>
        <td><a href="https://github.com/kylemwhite/mdz-viewer" target="_blank" rel="noopener">mdz-viewer</a></td>
        <td>Web (browser) <code>.mdz</code> viewer library (TypeScript). Uses <a href="https://github.com/kylemwhite/mdz-core-js" target="_blank" rel="noopener">mdz-core-js</a></td>
        <td>
          <a href="https://github.com/kylemwhite/mdz-viewer/releases/latest" target="_blank" rel="noopener" class="no-ext-icon">
            <img src="https://img.shields.io/github/v/release/kylemwhite/mdz-viewer?display_name=tag" alt="Latest release for mdz-viewer">
          </a>
        </td>
        <td>
          <a href="https://www.npmjs.com/package/mdz-viewer" target="_blank" rel="noopener" class="no-ext-icon">
            <img src="https://img.shields.io/npm/v/mdz-viewer" alt="NPM package version for mdz-viewer">
          </a>
        </td>
      </tr>
    </tbody>
  </table>
</div>