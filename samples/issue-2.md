<!-- SAMPLE written by the IssueBridge team for demos. It is a realistic but fictional issue, not copied from a real repository. -->
Title: CLI crashes with a stack trace when --output directory does not exist

Description:
Running `datatool export --format csv --output ./reports/2026` fails with `FileNotFoundError: [Errno 2] No such file or directory` if the `reports` folder has not been created yet. Expected behaviour: create the directory (including parents) automatically, or print a clear error message such as "Output directory does not exist" and exit with code 2.

Environment: Python 3.11, Ubuntu 22.04, datatool 0.8.3

Notes from maintainer: the export logic is in `export.py`; we use `argparse` and `pathlib`. Please add a unit test in `tests/test_export.py`.
