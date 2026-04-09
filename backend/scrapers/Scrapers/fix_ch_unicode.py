"""
Fix Unicode/encoding issues in ch_enrichment_scraper_v3.py
===========================================================
Run this script ONCE from the same folder as ch_enrichment_scraper_v3.py.

It will:
  1. Back up the original to ch_enrichment_scraper_v3.py.bak
  2. Replace all non-ASCII symbols that crash Windows cp1252 logging
  3. Add sys.stdout.reconfigure(encoding='utf-8') if missing
  4. Add 'import sys' if missing
  5. Write the fixed file back

Usage:
  cd backend/scrapers/Scrapers
  python fix_ch_unicode.py
"""

import os
import shutil

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(SCRIPT_DIR, 'ch_enrichment_scraper_v3.py')
BACKUP = TARGET + '.bak'

# Unicode replacements: (char, replacement, label)
REPLACEMENTS = [
    ('\u2713', '[OK]',   'U+2713 check mark'),
    ('\u2714', '[OK]',   'U+2714 heavy check mark'),
    ('\u2717', '[FAIL]', 'U+2717 ballot x'),
    ('\u2718', '[FAIL]', 'U+2718 heavy ballot x'),
    ('\u2014', '--',     'U+2014 em dash'),
    ('\u2013', '-',      'U+2013 en dash'),
]

RECONFIGURE_BLOCK = (
    "\nif sys.platform == 'win32':\n"
    "    sys.stdout.reconfigure(encoding='utf-8', errors='replace')\n"
)


def main():
    # --- Check target exists ---
    if not os.path.isfile(TARGET):
        print(f'ERROR: {TARGET} not found.')
        print('Run this script from the same folder as ch_enrichment_scraper_v3.py')
        raise SystemExit(1)

    # --- Read with UTF-8 ---
    with open(TARGET, 'r', encoding='utf-8') as f:
        content = f.read()

    print(f'Read {len(content):,} characters from ch_enrichment_scraper_v3.py')

    # --- Create backup ---
    shutil.copy2(TARGET, BACKUP)
    print(f'Backup created: ch_enrichment_scraper_v3.py.bak')

    # --- Step 1: Replace Unicode symbols ---
    total_replacements = 0
    for char, replacement, label in REPLACEMENTS:
        count = content.count(char)
        if count > 0:
            content = content.replace(char, replacement)
            print(f'  Replaced {count}x {label} -> {replacement}')
            total_replacements += count
        else:
            print(f'  {label}: none found')

    # --- Step 2: Check/add import sys ---
    added_import_sys = False
    if 'import sys' not in content:
        # Find the first import line and add import sys after it
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('import ') or line.startswith('from '):
                lines.insert(i + 1, 'import sys')
                added_import_sys = True
                break
        content = '\n'.join(lines)
        print('  Added: import sys')
    else:
        print('  import sys: already present')

    # --- Step 3: Check/add sys.stdout.reconfigure ---
    added_reconfigure = False
    if 'sys.stdout.reconfigure' not in content:
        # Find the logging setup line and insert after it
        anchor_patterns = [
            'log = logging.getLogger',
            'logging.basicConfig',
        ]
        inserted = False
        lines = content.split('\n')
        for pattern in anchor_patterns:
            for i, line in enumerate(lines):
                if pattern in line:
                    # Find end of the basicConfig block (may span multiple lines)
                    insert_at = i + 1
                    if 'basicConfig' in line and ')' not in line:
                        # Multi-line basicConfig - find the closing paren
                        for j in range(i + 1, len(lines)):
                            if ')' in lines[j]:
                                insert_at = j + 1
                                break
                    # If the next anchor (getLogger) comes after basicConfig,
                    # prefer inserting after getLogger
                    if pattern == 'logging.basicConfig':
                        for j in range(insert_at, min(insert_at + 5, len(lines))):
                            if 'log = logging.getLogger' in lines[j]:
                                insert_at = j + 1
                                break
                    lines.insert(insert_at, '')
                    lines.insert(insert_at + 1, "# Force UTF-8 on Windows")
                    lines.insert(insert_at + 2, "if sys.platform == 'win32':")
                    lines.insert(insert_at + 3, "    sys.stdout.reconfigure(encoding='utf-8', errors='replace')")
                    inserted = True
                    added_reconfigure = True
                    break
            if inserted:
                break
        content = '\n'.join(lines)
        if inserted:
            print('  Added: sys.stdout.reconfigure(encoding=utf-8, errors=replace)')
        else:
            print('  WARNING: Could not find logging setup line to insert reconfigure')
    else:
        print('  sys.stdout.reconfigure: already present')

    # --- Step 4: Write fixed file ---
    with open(TARGET, 'w', encoding='utf-8') as f:
        f.write(content)

    # --- Summary ---
    print('')
    print('=' * 60)
    print('SUMMARY')
    print('=' * 60)
    print(f'  Unicode symbols replaced: {total_replacements}')
    print(f'  sys.stdout.reconfigure:   {"ADDED" if added_reconfigure else "already present"}')
    print(f'  import sys:               {"ADDED" if added_import_sys else "already present"}')
    print(f'  Backup at:                ch_enrichment_scraper_v3.py.bak')
    print('')
    print('DONE -- ch_enrichment_scraper_v3.py is now cp1252-safe')


if __name__ == '__main__':
    main()
