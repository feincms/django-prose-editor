# Agent Notes for django-prose-editor

This document contains information for AI agents working on this project.

## Project Structure

- **Python/Django Backend**: Django app in `django_prose_editor/`
- **JavaScript/TypeScript Frontend**: Tiptap editor extensions in `src/`
- **Tests**: Python tests in `tests/`, uses Playwright for E2E tests
- **Documentation**: ReStructuredText files in `docs/`

## Running Tests

Use `tox` to run tests:

```bash
# Run tests with Python 3.13 and Django 5.2
tox -e py313-dj52
```

Tests include both unit tests and Playwright E2E tests. The test suite will automatically install Chromium if needed.

## JavaScript Development

The project uses:
- **Tiptap** for the rich text editor
- **rslib** for building JavaScript modules
- **prek** for linting and formatting (Rust-based pre-commit alternative, runs Biome and other tools)

JavaScript source files are in `src/` and get built into `django_prose_editor/static/`.

**IMPORTANT**: After modifying JavaScript files in `src/`, you MUST rebuild with:
```bash
yarn prod
```

You might have to prepend `mise x --` for this to work.

The tests run against the compiled JavaScript in `django_prose_editor/static/`, not the source files.

## Documentation

Documentation is written in ReStructuredText (`.rst`) format in the `docs/` directory.

When modifying extensions or features:
1. Update the relevant `.rst` file in `docs/`
2. Include code examples in both Python and JavaScript
3. Document configuration options, usage patterns, and HTML output

## Code Organization

### Tiptap Extensions

- Extensions are in `src/`
- Each extension typically exports a Tiptap extension object
- Extensions can add attributes to nodes/marks using `addGlobalAttributes()`
- Menu items are added via `addMenuItems({ buttons, menu })`

### Key Patterns

**Distinguishing Nodes vs Marks:**
```javascript
const isNodeType = (editor, typeName) => {
  return !!editor.state.schema.nodes[typeName]
}
```

**Getting Applicable Items:**
- For nodes: Walk up the document tree from the selection
- For marks: Check marks at the current selection position

**Menu Items:**
- Use `active()` to determine if option should be highlighted
- Use `hidden()` to determine if option should be shown
- For marks: Hide when selection is empty or mark type not active
- For nodes: Hide when node type is not in ancestor chain

## Testing Workflow

1. Make code changes
2. **If you modified JavaScript**: Run `yarn prod` to rebuild
3. Run linting/formatting: `prek run --all-files` (or let it run on commit)
4. Run tests: `tox -e py313-dj52`
5. Verify all tests pass (47 tests expected as of 2026-06-08)
6. Update documentation if needed

## Test Structure

### E2E Test Files

- `tests/testapp/test_prose_editor_e2e.py` — general editor, formatting, tables, configurable, HTML, NodeClass, StyleLoom tests
- `tests/testapp/test_classloom_e2e.py` — ClassLoom extension tests (paragraph colors + table layout)
- `tests/testapp/e2e_utils.py` — shared `login(page, live_server)` helper imported by both e2e files

### Test Models in `tests/testapp/models.py`

- `ProseEditorModel` — bare field
- `TableProseEditorModel` — includes Table, OrderedList etc.
- `ConfigurableProseEditorModel` — BlueBold, HTML, NodeClass, TextClass, etc.
- `StyleLoomProseEditorModel` — StyleLoom with font-size and max-width
- `ClassLoomProseEditorModel` — ClassLoom with two groups:
  - `paragraphColors` (non-combinable, type `paragraph`, classes: `color-red`, `color-blue`, `color-green`)
  - `tableLayout` (combinable, type `table`, classes: `table--auto`, `table--no-borders`)

### TableView Node Attribute Fix

Tiptap's `TableView.update()` only re-renders column widths but does not sync node attribute changes (e.g. `class` set via ClassLoom) back to the `<table>` DOM element. Our `Table` extension in `src/table.js` overrides `addNodeView()` to patch `update()` so it also applies `node.attrs.class` to `tableView.table` after every update. This is worth proposing upstream to `@tiptap/extension-table`.

### ClassLoom E2E Pattern

ClassLoom dropdowns expose picker items with `data-name` attributes (e.g. `classLoom:paragraphColors:color-red`). Tests use these to find and click options without depending on visible text:

```python
def _apply_classloom_class(page, group_ident, class_name):
    page.locator(".prose-menubar__dropdown").filter(
        has=page.locator(f"[data-name='{group_ident}:default']")
    ).locator(".prose-menubar__selected").click()
    page.locator(f"[data-name='{group_ident}:{class_name}']").click()
```

## Common Tasks

### Adding Support for Both Nodes and Marks

When an extension needs to support both nodes and marks:

1. Use a single configuration object (e.g., `cssClasses`)
2. Check the schema at runtime to determine if type is node or mark
3. Handle nodes with `setNodeAttribute()` and transactions
4. Handle marks with `setMark()` and `isActive()`
5. Update menu `hidden()` logic appropriately for each type

### Configuration Options

Extensions are configured in two ways:
- **Python**: Via `ProseEditorField(extensions={...})`
- **JavaScript**: Via `Extension.configure({...})`

Keep both configuration methods documented and in sync.

## ProseMirror/Tiptap Patterns

### Modifying Mark Attributes

**Important**: Use Tiptap's `updateAttributes()` command to modify mark attributes. This preserves all other attributes automatically:

```javascript
// ✅ CORRECT - Updates only the specified attribute, preserves others
editor.chain()
  .extendMarkRange(typeName)
  .updateAttributes(typeName, { class: 'newValue' })
  .run()

// To remove an attribute, set it to null
editor.chain()
  .extendMarkRange(typeName)
  .updateAttributes(typeName, { class: null })
  .run()
```

This automatically preserves other attributes like `href` on links, `src` on images, etc. without needing to manually spread existing attributes.

### Extending Mark Range

When working with marks at a collapsed selection (cursor position), use `extendMarkRange()` to select the entire mark:

```javascript
editor.chain()
  .extendMarkRange('bold')  // Selects entire bold region
  .setMark('bold', { class: 'emphasis' })
  .run()
```

### Checking Active Marks

To check if a mark exists at the cursor position, use the resolved position's marks, not just `isActive()`:

```javascript
const { state } = editor
const { $from } = state.selection
const markType = state.schema.marks[typeName]
const marks = $from.marks()
const hasMark = marks.some(mark => mark.type === markType)
```

The `isActive()` method can be unreliable at mark boundaries or with collapsed selections.
