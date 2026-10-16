// Demo samples (fictional, written by the team; see /samples in the repo root).
export const SAMPLES = [
  {
    label: 'README typo',
    text: `Title: Typo and broken link in the installation section of the README

Description:
In the "Installation" section of README.md, the command says \`pip instal mytool\` (missing an "l"). Also, the link labelled "Troubleshooting guide" points to \`docs/troubleshoot.md\`, but the file in the repo is named \`docs/troubleshooting.md\`, so the link gives a 404.

Steps to reproduce:
1. Open README.md on GitHub
2. Scroll to "Installation"
3. Click "Troubleshooting guide"

Expected: correct command and a working link.`,
  },
  {
    label: 'CLI crash',
    text: `Title: CLI crashes with a stack trace when --output directory does not exist

Description:
Running \`datatool export --format csv --output ./reports/2026\` fails with \`FileNotFoundError: [Errno 2] No such file or directory\` if the \`reports\` folder has not been created yet. Expected behaviour: create the directory (including parents) automatically, or print a clear error message such as "Output directory does not exist" and exit with code 2.

Environment: Python 3.11, Ubuntu 22.04, datatool 0.8.3

Notes from maintainer: the export logic is in \`export.py\`; we use \`argparse\` and \`pathlib\`. Please add a unit test in \`tests/test_export.py\`.`,
  },
  {
    label: 'Vague issue',
    text: `Title: Performance is bad sometimes

Description:
The app feels slow lately. Some users on the forum say it lags. Maybe it's the database or maybe the frontend, not sure. We should look into it and make it faster before the next release.`,
  },
];
