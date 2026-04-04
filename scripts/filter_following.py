#!/usr/bin/env python3
"""
Auto-filter following lists and merge into contacts.json.
Step 1: Keyword pre-filter (fast, free)
Step 2: Claude AI judgment for remaining candidates
Processes all JSON files in raw/ directory.
Run from repo root: python scripts/filter_following.py
"""

import json
import os
import glob
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

RAW_DIR = 'raw'
CONTACTS_PATH = 'public/data/contacts.json'

MIN_FOLLOWERS = 5000
MAX_FOLLOWERS_HIGH_PROFILE = 500_000

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

# ── Pre-filter: hard excludes (never pass to Claude) ──────────────────────────

EXCLUDE_KEYWORDS = [
    'managing partner', 'general partner', 'venture capital', 'investment fund',
    '@paradigm', '@a16z', '@multicoin', '@pantera', '@framework', '@syncracy',
    '@dragonfly', '@polychain', 'fund manager', 'angel investor',
    'investing in', 'portfolio companies',
    'market maker', 'market making', 'quant trader', 'trading firm',
    'prop trading', 'hft', 'high frequency',
    'community manager', 'head of community', 'biggest kol',
    'ambassador @', 'influencer', 'content creator',
    'growth strategist', 'growth hacker', 'chief marketing officer',
    '/cmo', 'cmo @', 'cmo of', 'social media manager',
    'brand strategist', 'pr manager', 'public relations',
    'journalist', 'columnist',
    'ceo of binance', 'founder of binance', 'ceo of coinbase', 'founder of coinbase',
]

ORG_SIGNALS = [
    'we are building', 'we build', 'join our', 'join us at',
    'our mission', 'built by the team', 'mint live', 'apply now',
    'a defi-centric team', 'community-built', 'community-led',
    'official account', 'on a mission to',
]

HIGH_PROFILE_PROJECTS = [
    'uniswap', 'aave', 'makerdao', 'compound finance', 'curve finance',
    'chainlink', 'binance', 'coinbase', 'ftx',
]

# Must have at least one of these to even reach Claude
BUILDER_KEYWORDS = [
    'founder', 'co-founder', 'cofound', 'ceo', 'cto', 'coo',
    'engineer', 'developer', 'builder', 'building', 'protocol',
    'architect', 'scientist', 'researcher', 'head of', 'technical lead',
]


def hard_exclude(bio: str, followers: int) -> tuple[bool, str]:
    b = bio.lower()
    if followers > MAX_FOLLOWERS_HIGH_PROFILE:
        return True, f'too high-profile ({followers:,} followers)'
    for k in HIGH_PROFILE_PROJECTS:
        if k in b:
            return True, f'high-profile project: {k}'
    for k in EXCLUDE_KEYWORDS:
        if k in b:
            return True, f'excluded keyword: "{k}"'
    for k in ORG_SIGNALS:
        if k in b:
            return True, f'org account signal: "{k}"'
    if not any(k in b for k in BUILDER_KEYWORDS):
        return True, 'no builder/founder signal in bio'
    return False, ''


# ── Claude judgment ───────────────────────────────────────────────────────────

CLAUDE_SYSTEM = "Filter X accounts for crypto/Web3 founder warm intros. INCLUDE: individual founder/CEO/CTO of a crypto/Web3 project. EXCLUDE: VC/investor, trader, KOL, marketer, org account, non-crypto domain, insufficient info. Respond JSON only: {\"include\":true/false,\"reason\":\"<10 words\"}"


def ask_claude(handle: str, name: str, bio: str, followers: int) -> tuple[bool, str]:
    if not ANTHROPIC_API_KEY:
        return True, 'No API key — passed keyword filter'

    prompt = f"@{handle} | {name} | {bio} | {followers:,} followers"

    payload = json.dumps({
        'model': 'claude-haiku-4-5-20251001',
        'max_tokens': 100,
        'system': CLAUDE_SYSTEM,
        'messages': [{'role': 'user', 'content': prompt}],
    }).encode()

    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages',
        data=payload,
        headers={
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
    )

    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read())
                text = result['content'][0]['text'].strip()
                # Parse JSON from response
                parsed = json.loads(text)
                return parsed.get('include', False), parsed.get('reason', '')
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(10 * (attempt + 1))
                continue
            body = e.read().decode()
            print(f'    Claude API error {e.code}: {body[:200]}')
            return True, f'API error {e.code} — passed keyword filter'
        except Exception as ex:
            print(f'    Claude error: {ex}')
            return True, f'API error — passed keyword filter'

    return True, 'Rate limited — passed keyword filter'


def infer_role(bio: str) -> str:
    b = bio.lower()
    if 'ceo' in b and ('founder' in b or 'co-founder' in b or 'cofound' in b):
        return 'Founder / CEO'
    if 'cto' in b and ('founder' in b or 'co-founder' in b):
        return 'Co-Founder / CTO'
    if 'co-founder' in b or 'cofound' in b:
        return 'Co-Founder'
    if 'founder' in b:
        return 'Founder'
    if 'ceo' in b:
        return 'CEO'
    if 'cto' in b:
        return 'CTO'
    if 'engineer' in b or 'developer' in b:
        return 'Founder / Builder'
    if 'builder' in b or 'building' in b:
        return 'Founder / Builder'
    return 'Founder / Builder'


def process_raw_file(raw_path: str, existing_handles: set) -> list:
    with open(raw_path, encoding='utf-8') as f:
        raw = json.load(f)

    if isinstance(raw, dict):
        source_founder = raw.get('source_founder', 'Unknown')
        source_company = raw.get('source_company', 'Unknown')
        following = raw.get('following', [])
    else:
        following = raw
        base = os.path.basename(raw_path).replace('.json', '')
        parts = base.split('-')
        source_founder = parts[1] if len(parts) > 1 else 'Unknown'
        source_company = parts[2] if len(parts) > 2 else 'Unknown'

    added = []
    skipped = 0
    claude_calls = 0
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    for person in following:
        handle = (person.get('handle') or person.get('username') or person.get('screen_name') or '').strip()
        if not handle:
            continue

        handle_lower = handle.lower()
        if handle_lower in existing_handles:
            skipped += 1
            continue

        followers = (
            person.get('followers') or
            person.get('followers_count') or
            person.get('normal_followers_count') or
            person.get('public_metrics', {}).get('followers_count') or 0
        )
        name = person.get('name') or handle
        bio = (person.get('bio') or person.get('description') or '').strip()
        x_url = person.get('x_url') or f'https://x.com/{handle}'
        last_tweet_at = person.get('last_tweet_at') or None

        # Hard filters (no API call needed)
        if last_tweet_at and last_tweet_at < cutoff:
            skipped += 1
            continue
        if followers < MIN_FOLLOWERS:
            skipped += 1
            continue
        excl, reason = hard_exclude(bio, followers)
        if excl:
            skipped += 1
            continue

        # Claude judgment
        include, reason = ask_claude(handle, name, bio, followers)
        claude_calls += 1
        print(f'  Claude @{handle}: {"✓" if include else "✗"} — {reason}')

        role = infer_role(bio)
        notes = f'{bio} — {followers:,} followers' if bio else f'{followers:,} followers'

        entry = {
            'source_founder': source_founder,
            'source_company': source_company,
            'contact_name': name,
            'x_handle': handle,
            'x_url': x_url,
            'role': role,
            'project': '',
            'notes': notes,
            'include': include,
            'status': 'AI-filtered' if include else f'Excluded — {reason}',
        }
        added.append(entry)
        if include:
            existing_handles.add(handle_lower)

    included = sum(1 for e in added if e['include'])
    print(f'  {os.path.basename(raw_path)}: {included} included, {len(added)-included} excluded by Claude, {skipped} pre-filtered ({claude_calls} Claude calls)')
    return added


def main():
    with open(CONTACTS_PATH, encoding='utf-8') as f:
        contacts = json.load(f)

    existing_handles = {(c.get('x_handle') or '').lower() for c in contacts if c.get('x_handle')}
    print(f'Existing contacts: {len(contacts)}')

    # Only process newly added files if RAW_FILES env var is set
    raw_files_env = os.environ.get('RAW_FILES', '').strip()
    if raw_files_env:
        raw_files = [f.strip() for f in raw_files_env.split() if f.strip().endswith('.json') and os.path.exists(f.strip())]
        print(f'Processing {len(raw_files)} new file(s) from this push...')
    else:
        raw_files = sorted(glob.glob(os.path.join(RAW_DIR, '*.json')))
        print(f'Processing all {len(raw_files)} raw file(s)...')

    if not raw_files:
        print('No raw files to process')
        return

    print(f'Processing {len(raw_files)} raw file(s)...')
    if ANTHROPIC_API_KEY:
        print('Claude API: enabled (claude-haiku-4-5)')
    else:
        print('Claude API: disabled (no ANTHROPIC_API_KEY)')

    total_added = 0
    for raw_path in raw_files:
        new_entries = process_raw_file(raw_path, existing_handles)
        contacts.extend(new_entries)
        total_added += len(new_entries)

    print(f'\nTotal new entries: {total_added}')
    print(f'New contacts.json size: {len(contacts)}')

    with open(CONTACTS_PATH, 'w', encoding='utf-8') as f:
        json.dump(contacts, f, indent=2, ensure_ascii=False)
    print('Saved contacts.json')


if __name__ == '__main__':
    main()
