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
5. Verify all tests pass (35 tests expected as of 2025-11-04)
6. Update documentation if needed

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

**Important**: Mark attributes cannot be modified in place in ProseMirror. You must use the unsetMark/setMark pattern:

```javascript
// ❌ WRONG - This doesn't work
tr.setMarkAttribute(from, to, markType, 'class', 'newValue')

// ✅ CORRECT - Unset and reapply with new attributes
const currentMark = markType.isInSet($pos.marks())
const newAttrs = { ...currentMark.attrs, class: 'newValue' }
editor.chain()
  .extendMarkRange(typeName)
  .unsetMark(typeName)
  .setMark(typeName, newAttrs)
  .run()
```

Always preserve existing attributes when modifying marks to avoid losing data like `href` on links, `src` on images, etc.

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
