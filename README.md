# List Table Editor

A Visual Studio Code extension for editing `list-table` directives used in Sphinx and MyST Markdown documentation.

## Why

Sphinx supports two kinds of tables: [grid tables](https://tables-with-sphinx.readthedocs.io/en/latest/grid-table.html) and [list tables](https://sublime-and-sphinx-guide.readthedocs.io/en/latest/tables.html). Grid tables are difficult to edit, often require specialized editors such as Emacs and tend to produce heavy merge conflicts in a docs-as-code workflow. List tables are easier to maintain in version control but they are cumbersome to write by hand.

**List Table Editor** removes this friction by providing a small helper for creating and editing list tables directly from VS Code.

## Features

- Insert a ready-to-fill `list-table` directive at the cursor.
- Open an interactive editor for an existing list table. The extension shows the table in a grid (powered by Tabulator) and saves the result back as a `list-table`.
- Works with Markdown/MyST files compiled by Sphinx.
- Built for teams using the docs-as-code approach where clean diffs and conflict-free tables matter.

## Installation

1. Download the latest `.vsix` from [GitHub Releases](https://github.com/artyompetrov/list-table-editor/releases) and install it with `code --install-extension <file>.vsix`.
2. Alternatively, clone this repository and run `npm run package` to build the extension from source, then install the generated `.vsix` with `code --install-extension <file>.vsix`.

## Usage

- **Insert List Table**: Adds a skeleton `:::{list-table}` block with minimal parameters.
- **Open List Table Editor**: Opens the interactive table editor for the table under the cursor.

![List Table Editor](img/image%201.png)

![Editing table](img/image%202.png)

![Saving table](img/image%203.png)

![Resulting directive](img/image%204.png)

## Example `list-table`

```
:::{list-table}
:header-rows: 1
:stub-columns: 0

* - Header 1
  - Header 2

* - Cell 1
  - Cell 2

:::
```

