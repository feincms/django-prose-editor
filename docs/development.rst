Development
===========

For the best development experience:

1. Install django-prose-editor in editable mode in your project:

   .. code-block:: shell

       pip install -e /path/to/django-prose-editor

2. Run ``yarn && yarn dev`` in the django-prose-editor directory to watch for
   asset changes.

When using ``yarn dev``:

- The watcher will rebuild files automatically when you make changes.
- Development mode provides faster builds for iteration.

Both development and production builds:

- Always generate minified CSS and JavaScript for optimal performance
- Always include source maps to help identify exactly where in the source code
  an error occurs
- Source maps are included in the distributed package to aid in debugging

The build process ensures consistent output whether you're developing or
building for production, with source maps always available for debugging
purposes.

Browser Testing with Playwright
-------------------------------

This project uses tox to describe environments and Playwright for browser-based
testing of the prose editor. Browser tests are run as a part of the normal tests
so just use tox as you normally would.

Code Style and Linting
----------------------

This project uses pre-commit hooks to enforce coding style guidelines. We use
Ruff for Python linting and formatting, Biome for JavaScript/TypeScript linting
and formatting and a few other hooks.

To set up pre-commit using uv:

.. code-block:: shell

    uv tool install pre-commit
    pre-commit install

Pre-commit will automatically check your code for style issues when you commit
changes.
