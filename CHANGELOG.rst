Change log
==========

Next version
~~~~~~~~~~~~

- Fixed the prose editor textarea widget to not use the HTML5 ``required``
  attribute. Thanks to @undefined-landmark for the report and the help testing
  the fix!
- Raised the misleading low limits for columns and rows when inserting a new
  table.
- Started exposing the ``prosemirror-tables`` exports.
- Added polish translations. Thanks @kgunia!
- Updated Tiptap.
- Added Django 6.0 and Python 3.14 to the CI list.


0.22 (2025-11-17)
~~~~~~~~~~~~~~~~~

- Also apply the "actually empty" behavior in the frontend code. ProseMirror
  always produces at least one empty block-level element (for example
  ``<p></p>``). We prefer the editor to produce an empty string in this case
  instead. This may be a visible behavior change if you're only using the
  frontend code and not the backend code; the backend code already applied the
  same transformation since django-prose-editor 0.4.


0.21 (2025-11-12)
~~~~~~~~~~~~~~~~~

- Modified our ``OrderedList`` extension to also set a ``data-type`` attribute
  on the ``<ol>`` element with one of the CSS values for the
  ``list-style-type`` property. This is necessary because Chromium-based
  browsers cannot case sensitively match the ``type`` attribute.


0.20 (2025-11-04)
~~~~~~~~~~~~~~~~~

- Extended the ``NodeClass`` extension to support marks (bold, italic, links,
  etc.) in addition to nodes. CSS classes can now be applied to marks by
  including them in the ``cssClasses`` configuration alongside nodes.
- Refactored the ``NodeClass`` and ``Link`` extensions to use Tiptap's
  ``updateAttributes()`` command instead of the unsetMark/setMark pattern,
  which automatically preserves other mark attributes.


0.19 (2025-10-29)
~~~~~~~~~~~~~~~~~

- Updated the documentation to provide working examples by including the
  necessary dependencies. Thanks @benopotamus and @j4lib!
- Updated the sanitization documentation to correctly say which HTML tags and
  attributes are actually allowlisted by which extensions.
- Updated the Tiptap dependency and pre-commit hooks.
- Fixed the table style overrides to work better in dark mode.
- Refactored the node class extension to use a single function to walk the
  ancestor list.
- Changed the CSS overrides so that paragraphs in table header cells inherit
  the font weight.
- Added a description to the HTML extension's textarea which explains that the
  HTML is restricted by the editor schema.
- Added an easier way to define the menu structure without having to go to the
  low level menu creator function and copy pasting the default menu groups.


0.18 (2025-08-27)
~~~~~~~~~~~~~~~~~

- **Backwards incompatible**: Removed the automatic dependency management of
  some extensions. For example, adding ``BulletList`` would automatically add
  the ``ListItem`` extension. This didn't work nicely when replacing the
  ``ListItem`` extension with a hypothetical ``ExtendedListItem`` extension
  because then the configuration would contain several list item nodes. The
  config resolver tries detecting invalid configurations and warns if it
  suspects missing extensions, but that's not completely watertight. The
  warnings will be removed after a few releases.
- Added a ``NodeClass`` extension for applying CSS classes to nodes.


0.17 (2025-08-25)
~~~~~~~~~~~~~~~~~

- Updated Tiptap to 3.0.7. Also updated all ProseMirror packages and added
  explicit ProseMirror dependencies to package.json.
- Changed the ``.prose-editor-fullscreen`` class to
  ``.prose-editor.fullscreen`` to match ``.prose-editor.disabled``.
- Bumped the ``[sanitized]`` extra's nh3 dependency to 0.3 and started taking
  advantage of the reusable ``Cleaner`` object. This allows us to initialize
  the cleaner once only.
- **Rewritten menu system**: The Menu extension now uses an ``items`` creator
  function instead of the deprecated ``addItems`` function. This provides more
  flexibility for custom menu layouts. Added ``createMenuFromGroups`` helper
  for converting simple group configurations. Extensions now receive
  ``{ editor, buttons, menu }`` parameters in ``addMenuItems`` method.
- Added menu configuration documentation as a new chapter.
- Updated custom extensions documentation to use the new menu API with
  ``menu.defineItem()`` instead of the deprecated ``addItems`` approach.
- Added ``TextClass`` extension for applying CSS classes to text sections.
  This provides a clean, semantic alternative to inline styles, allowing
  arbitrary CSS classes on ``<span>`` tags with automatic menu integration
  and sanitization support.
- Separated dialog styles into their own CSS file (``dialog.css``).
- Separated menu styles into their own CSS file (``menu.css``).
- Updated pre-commit hooks and biome configuration.
- Fixed import ordering and added missing imports in Python files to address
  linting issues.
- Removed custom HorizontalRule extension in favor of Tiptap's default
  implementation, which now includes proper insertion validation.
- Exported Tiptap's ``Placeholder`` extension. Note that you need to add the
  CSS to actually display the placeholder yourself, see the `Placeholder docs
  <https://tiptap.dev/docs/editor/extensions/functionality/placeholder>`__.
- Modified the ``HTML`` extension to preserve whitespace inside ``pre``
  elements during prettification. Also, changed the extension to only run
  prettification on demand.
- Added a maximum width to prose editor dialog elements.


0.16 (2025-07-11)
~~~~~~~~~~~~~~~~~

- Provide the expected context to ``addMenuItems`` so that accessing ``this``
  actually does the right thing.
- Updated Tiptap to 3.0.0-beta.29.
- Changed the contents of ``static`` to all be bundled instead of having a
  mixture of hand-edited and generated assets.
- Change the widget implementation and add more easily reusable ``forms.Media``
  objects and helpers.


0.15 (2025-07-04)
~~~~~~~~~~~~~~~~~

- Dropped the JavaScript-based sticky menubar behavior, the menubar uses
  ``position: sticky``. Also dropped the ``sticky`` option from the ``Menu``
  again. Override the behavior with CSS instead.
- Extensions can now register menu items using the ``addMenuItems`` method,
  which provides a cleaner API for menu integration.


0.14 (2025-07-02)
~~~~~~~~~~~~~~~~~

- Updated the pre-commit hooks.
- Updated the Tiptap dependency.
- Actually started dispatching the documented ``prose-editor:ready`` event when
  using the default preset.
- Made the ``Menu`` extension more reusable, introduced the ``defaultItems``,
  ``sticky`` and ``cssClass`` options. Started passing a ``buttons`` helper
  into menu item creation functions which automatically uses the correct
  ``cssClass`` prefix when creating menu button DOM elements.


0.13 (2025-06-25)
~~~~~~~~~~~~~~~~~

- Switched from `esbuild <https://esbuild.github.io/>`__ to
  `rslib <https://lib.rsbuild.dev/>`__. Bundles are smaller and I'm a heavy
  user of rspack anyway.
- Updated Tiptap to 3.0.0-beta.16, which allows us to remove our custom code to
  check whether we can insert figures or horizontal rules at the current
  selection.
- Fixed the alignment of small contents in prose menubar buttons.


0.12 (2025-05-12)
~~~~~~~~~~~~~~~~~

- Updated the Tiptap version to the 3.0 beta to avoid problems with extensions
  sharing storage over multiple editor instances.
- Fixed the menu to not run commands on click when the command is disabled.
- Changed the ``addLink`` command to not do anything if the selection is empty
  or if the selection isn't inside a link mark currently.
- Fixed the title attribute functionality of link marks. Titles have been
  inadvertently broken since 0.10 because I missed the fact that the Tiptap
  link extension doesn't define the attribute in the schema.
- Changed the ordered list menu button to disable itself when an ordered list
  cannot be inserted.
- Updated the figure menu button to actually check whether figures can be
  inserted or not. Same for the horizontal rule menu button.
- Added styles to selected nodes so that e.g. selected horizontal rules are
  shown as such.
- Started including source maps again.
- Convert textareas to use autogrow.
- Changed the prose editor dialog to use ``div.prose-editor-dialog-field``
  elements to wrap inputs and their labels instead of paragraphs.
- Allowed callable default values in the ``updateAttrsDialog``.


0.11 (2025-04-16)
~~~~~~~~~~~~~~~~~

- Added a new way of configuring the ``ProseEditorField`` by using the
  ``extensions`` argument. This allows specifying Tiptap extensions to use and
  also optionally allows configuring them. nh3 sanitization rules are
  automatically derived from the extension configuration when using
  sanitization. A system check warning is emitted if you're using this
  mechanism but haven't opted into sanitization.
- Using the ``ProseEditorField`` without the ``extensions`` parameter has been
  deprecated, and a system check warning has been added for automatically
  detecting this.
- Added support for specifying editor extensions using the
  ``DJANGO_PROSE_EDITOR_EXTENSIONS`` setting, which allows transparently adding
  JavaScript modules to the editor without having to write your own preset.
  Writing presets is and will be supported for even more advanced use cases,
  but the extensions mechanism hopefully covers 99% of all use cases.
- Switched the JavaScript to use ES modules and importmaps. If you've been
  using 0.10 you have to update your code to use ES modules (``<script
  type="module">``) instead of deferred scripts. Sorry for the churn. Also
  check the import locations, ProseMirror functions have been moved into the
  ``pm.*`` namespace.
- Fixed a bug where the link mark wasn't applied correctly. The buggy 0.10.0
  package has been yanked.
- Applied the ``--prose-editor-background`` and ``--prose-editor-foreground``
  CSS variables to the ProseMirror editing area.
- Fixed the django-content-editor support tweak where an empty label would make
  the editor move to the left border.
- Updated Tiptap to the 3.0.0 pre-release. This was the easiest way to ensure
  that extensions all get their unique storage per editor instance instead of
  (unexpectedly!) shared storage without resorting to hacks.
- Added Django 5.2.
- Modified the ``HTML`` extension to prettify the HTML code somewhat.
- Added a new ``Fullscreen`` extension.
- Changed the ``updateAttrsDialog`` to insert the dialog element into the
  parent element of the ``EditorView`` DOM element instead of searching for an
  element with a ``prose-editor`` class. This makes the function more reusable
  for even more exotic customizations of the editor.
- Added a "open in new window" checkbox to the link dialog. This can optionally
  be disabled by configuring the extension when using a custom preset using
  ``Link.configure({ enableTarget: false })``. Also removed ``nofollow`` and
  ``noreferrer`` from the ``rel`` attribute of links since they do not make
  sense in a CMS context. Thanks to @yoshson for getting this started!
- Added integration testing using playwright.
- Pruned the CI matrix a bit, stopped running tests using Python 3.11 and
  Django 5.0. Python 3.10 and Django 4.2 are still tested so we should be safe.
- Added list style overrides to hopefully make lists usable with the Grappelli
  admin skin.
- Disallowed overriding the ``default`` and the ``configurable`` editor preset.
- Hide the menubar when the editor is disabled.
- Removed min and max width from the ``.prose-editor`` DIV.
- Added an optional ``sanitize`` argument to the ``ProseEditorFormField`` which
  allows form-level sanitization of HTML.
- The ``sanitize`` argument can also be a list of functions receiving and
  returning HTML. The list is processed in reverse (the first function is
  called last). If the ``create_sanitizer`` function is included, it's
  automatically used to build a sanitizer for the configured editor extensions.


0.10 (2024-12-17)
~~~~~~~~~~~~~~~~~

- Changed the editor foundation to use `Tiptap <https://tiptap.dev/>`__ and
  bundled many of the available extensions. Tiptap uses ProseMirror under the
  hood, but offers an extension framework which I'd have to reinvent and
  there's really no point to do that. The change should be backwards compatible
  if you only used the Python-level integration. The JavaScript integration has
  changed a lot, ``DjangoProseEditor.createEditor`` doesn't exist anymore.
- Introduced support for presets. See the "Customization" heading in the
  README.
- Introduced hidden menu buttons; it's now possible to show and hide buttons
  depending upon the editor selection.
- Fixed a misbehavior where the ``ProseEditorFormField`` would override a
  manually defined ``ProseEditorWidget``.
- Added a dependency on `django-js-asset
  <https://pypi.org/project/django-js-asset/>`__ for our JavaScript and JSON
  shipping needs.
- Changed the way editor dialogs are built from unsafe ``innerHTML``
  manipulation to proper DOM manipulation.
- Updated the pre-commit hooks.
- Updated the bundled material icons font.
- Made the ESBuild watch mode report build successes again.


0.9 (2024-10-30)
~~~~~~~~~~~~~~~~

- Updated the ProseMirror dependencies.
- Added Python 3.13 to the CI matrix.
- Disable interactions and the menubar on the editor when the textarea is
  ``disabled``.


0.8 (2024-08-26)
~~~~~~~~~~~~~~~~

- Made the link button only active when the cursor is inside a link.
- Added docs on read the docs.
- Updated the ProseMirror dependencies.
- Added extremely hacky german translations for the dialogs.
- Added Django 5.1 to the CI matrix.
- Allowed specifying the heading levels for the menu. The schema itself supports
  all heading levels (1-6) as before.


0.7 (2024-08-02)
~~~~~~~~~~~~~~~~

- Added the ``django-prose-editor[sanitize]`` extra which automatically
  installs the ``nh3`` dependency. Thanks @plenaerts!
- Properly restored the textarea element when destroying the editor.
- Added more unittesting.
- Supported using the ``ProseEditorFormField`` with widget instances, not just
  with widget classes.
- Documented the CSS custom properties. Thanks @carltongibson!
- Converted the block type dropdown back to a button group.
- Changed the CSS so that block type buttons look active instead of disabled
  when in a block of the respective type.
- Stopped showing the 'remove link' button as active when inside a link -- it's
  not active, just enabled.
- Improved the styles of the dialog a bit.


0.6 (2024-07-26)
~~~~~~~~~~~~~~~~

- Added support for highlighting soft hyphens.
- Updated all dependencies.
- Moved the Django administration interface CSS overrides into their own file,
  and only load them if necessary so that using the editor outside the admin
  requires using  less ``!important`` overrides.


0.5 (2024-07-08)
~~~~~~~~~~~~~~~~

- Updated all dependencies.
- Stopped putting anything into the global scope in ``init.js``.
- Added support for showing typographic characters.
- Changed the editor initialization to make the initial ``textarea`` a child of
  the ``.prose-editor`` div, and changed the CSS to ``display: none
  !important;`` so that the ``textarea`` is only shown in exceptional
  circumstances, when people really really want it.


0.4 (2024-05-26)
~~~~~~~~~~~~~~~~

- Allowed installing the package in Python 3.10 environments too.
- Tweaked the cleaning methods of ``ProseEditorField`` and
  ``SanitizedProseEditorField`` to produce empty strings when no content is
  entered. Previously they would produce an empty paragraph (``<p></p>``) since
  our ProseMirror schema says that there exists always one or more block nodes.
- Stopped setting a black color on the ``.ProseMirror`` class by default.
- Dropped the dependency on ``admin/js/jquery.init.js``. We're using our own
  DOM-ready handler and therefore can still access ``django.jQuery`` to hook up
  the inline events handler if running inside the Django admin.
- Moved the paragraph formats into a popover.


0.3 (2024-04-09)
~~~~~~~~~~~~~~~~

- Made the editor usable in dark mode.
- Changed the cancel buttons in dialogs to not validate the form.
- Switched the ``SanitizedProseEditorField`` from html-sanitizer (which at the
  moment uses the problematic lxml HTML cleaner under the hood) with `nh3
  <https://nh3.readthedocs.io/en/latest/>`__. html-sanitizer is still a good
  choice but since we build on ProseMirror we only require a sanitizer, we
  don't have to clean up strange HTML.
- Added customization options to the fields and widgets.


0.2 (2024-03-12)
~~~~~~~~~~~~~~~~

- Extended the README.
- Fixed the initialization in Django admin inlines.
- Added a server-side sanitization callback to the ``ProseEditorField``, and
  added ``django_prose_editor.sanitized.SanitizedProseEditorField`` which
  automatically does the right thing.
- Automatically added a ``get_*_excerpt`` model method to models using the
  ``ProseEditorField`` as a convenience.
- Cleaned up the styles.
- Added a maximum width to the editor.
- Started hiding labels for prose editor fields in the Django admin if the
  label is an empty string. This looks better to me.
- Added a shortcut for adding links.
- Added a button for editing the raw HTML. This is sometimes useful.
- Stopped generating source maps unless in dev mode. I like source maps a lot
  in general, but the files are really big in this case.
- Added a button to the menu to insert horizontal rules.
- Added material icons for the format bar.
- Added client side validation to dialogs.
- Upgraded esbuild.


0.1 (2024-03-11)
~~~~~~~~~~~~~~~~

- Initial public release.
