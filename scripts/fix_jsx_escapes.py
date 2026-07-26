#!/usr/bin/env python3
"""
Fix invalid escape sequences in JSX text content and JSX attribute values.
"""
import re
import sys
from pathlib import Path

def fix_jsx_backslash_apostrophe(filepath: str) -> bool:
    path = Path(filepath)
    content = path.read_text(encoding='utf-8')
    original = content
    
    # Pattern A: JSX attribute values with double quotes
    # e.g. label="Recherche d\'images..."
    content = re.sub(
        r'(=")((?:[^"\\]|\\.)*)(")',
        lambda m: m.group(1) + m.group(2).replace("\\'", "'") + m.group(3),
        content,
    )
    
    # Pattern B: JSX text content
    result_lines = []
    for line in content.split('\n'):
        if '>' in line and '\\\'' in line:
            gt_pos = line.rfind('>')
            if gt_pos >= 0:
                before = line[:gt_pos + 1]
                after = line[gt_pos + 1:]
                sq_pos = after.find("'")
                bs_pos = after.find("\\'")
                if bs_pos >= 0 and (sq_pos < 0 or bs_pos < sq_pos):
                    after = after.replace("\\'", "'")
                    line = before + after
        result_lines.append(line)
    
    content = '\n'.join(result_lines)
    
    if content != original:
        path.write_text(content, encoding='utf-8')
        return True
    return False

if __name__ == '__main__':
    files = sys.argv[1:]
    for f in files:
        if fix_jsx_backslash_apostrophe(f):
            print(f"FIXED: {f}")
        else:
            print(f"NO CHANGE: {f}")
