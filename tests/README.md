# Testing

## Running Tests

To run all tests:

```bash
tox -e py313-dj52
```

To run specific test files:

```bash
tox -e py313-dj52 -- tests/testapp/test_config.py -v
```

To run specific test methods:

```bash
tox -e py313-dj52 -- tests/testapp/test_config.py::ConfigFunctionsTestCase::test_expand_extensions_without_auto_dependencies -v
```

You can pass any pytest arguments after the double dash (`--`).
