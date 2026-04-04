#!/usr/bin/env python3
"""
Auto-filter following lists and merge into contacts.json.
Processes all JSON files in raw/ directory.
Run from repo root: python scripts/filter_following.py
"""

import json
import os
import glob
import re
import sys

RAW_DIR = 'raw'
CONTACTS_PATH = 'public/data/contacts.json'

MIN_FOLLOWERS = 5000
MAX_FOLLOWERS_HIGH_PROFILE = 500_000

# Must have at least one builder keyword in bio
BUILDER_KEYWORDS = [
    'founder', 'co-founder', 'cofound', 'ceo', 'cto', 'coo', 'cso',
    'engineer', 'developer', 'dev ', 'builder', 'building', 'protocol',
    'started', 'launched', 'created', 'built ', 'core dev', 'core contributor',
    'architect', 'scientist', 'researcher', 'head of', 'vp of', 'vp,',
    'principal', 'product manager', 'pm @', 'pm,', 'technical lead',
]

# Exclude if bio contains any of these
EXCLUDE_KEYWORDS = [
    # VC / investor
    'managing partner', 'general partner', 'venture capital', 'investment fund',
    '@paradigm', '@a16z', '@multicoin', '@pantera', '@framework', '@syncracy',
    '@dragonfly', '@polychain', 'fund manager', 'lp ', ' lp,', 'angel investor',
    'investing in', 'portfolio companies',
    # Trading / market maker
    'market maker', 'market making', 'quant trader', 'trading firm',
    'prop trading', 'hft', 'high frequency', 'market microstructure',
    # Marketing / community / KOL
    'community manager', 'head of community', 'kol ', '\u2022 kol', 'biggest kol',
    'ambassador @', '★ ambassador', 'influencer', 'content creator',
    'growth strategist', 'growth hacker', 'marketing officer', 'chief marketing',
    '/cmo', 'cmo @', 'cmo of', 'social media manager',
    'brand strategist', 'pr manager', 'public relations', 'comms @',
    # Media / analyst
    'journalist', 'crypto analyst', 'columnist', 'newsletter',
    # Exchanges (major)
    'ceo of binance', 'founder of binance', 'ceo of coinbase', 'founder of coinbase',
]

# Org / project account signals (not an individual person)
ORG_SIGNALS = [
    'we are building', 'we build', 'join our', 'join us at',
    'our mission', 'built by the team', 'mint live', 'apply now',
    'a defi-centric team', 'the leading', 'the first ', 'official account',
    'backed by tier', 'community-built', 'community-led',
    'education and community', 'on a mission to',
]

# High-profile projects to exclude (founders too well-known for warm intro)
HIGH_PROFILE_EXCLUDE = [
    'ethereum', 'solana', 'polygon', 'near protocol', 'avalanche', 'cardano',
    'uniswap', 'aave', 'makerdao', 'compound finance', 'curve finance',
    'chainlink', 'binance', 'coinbase', 'ftx',
]


WEB3_KEYWORDS = [
    'crypto', 'web3', 'web 3', 'blockchain', 'defi', 'nft', 'dao',
    'ethereum', 'solana', 'bitcoin', 'layer 2', 'l2', 'layer2',
    'protocol', 'onchain', 'on-chain', 'on chain', 'token', 'wallet',
    'dapp', 'decentralized', 'decentralised', 'smart contract',
    'zk', 'zero knowledge', 'rollup', 'consensus', 'validator',
    'staking', 'yield', 'liquidity', 'dex', 'cex', 'perp',
    'cosmos', 'polkadot', 'avalanche', 'aptos', 'sui', 'monad',
    'solidity', 'rust', 'move ', 'foundry', 'hardhat',
    'paradigm', 'a16z crypto', 'multicoin', 'binance', 'coinbase',
    'sequoia crypto', 'dragonfly', 'polychain',
]


def is_builder(bio: str) -> bool:
    b = bio.lower()
    return any(k in b for k in BUILDER_KEYWORDS)


def is_web3(bio: str) -> bool:
    b = bio.lower()
    return any(k in b for k in WEB3_KEYWORDS)


def should_exclude(bio: str) -> tuple[bool, str]:
    b = bio.lower()
    for k in EXCLUDE_KEYWORDS:
        if k in b:
            return True, f'bio contains excluded keyword: "{k}"'
    for k in ORG_SIGNALS:
        if k in b:
            return True, f'org account signal: "{k}"'
    return False, ''


def is_high_profile(bio: str, followers: int) -> bool:
    if followers > MAX_FOLLOWERS_HIGH_PROFILE:
        return True
    b = bio.lower()
    return any(k in b for k in HIGH_PROFILE_EXCLUDE)


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
    if 'engineer' in b or 'developer' in b or 'dev ' in b:
        return 'Founder / Builder'
    if 'builder' in b or 'building' in b:
        return 'Founder / Builder'
    return 'Founder / Builder'


def process_raw_file(raw_path: str, existing_handles: set) -> list:
    with open(raw_path, encoding='utf-8') as f:
        raw = json.load(f)

    # Support wrapped format {source_founder, source_company, following:[...]}
    # or plain array [{handle, name, followers, bio, x_url}]
    if isinstance(raw, dict):
        source_founder = raw.get('source_founder', 'Unknown')
        source_company = raw.get('source_company', 'Unknown')
        following = raw.get('following', [])
    else:
        following = raw
        # Try to infer from filename: raw/following-{founder}-{company}-*.json
        base = os.path.basename(raw_path).replace('.json', '')
        parts = base.split('-')
        source_founder = parts[1] if len(parts) > 1 else 'Unknown'
        source_company = parts[2] if len(parts) > 2 else 'Unknown'

    added = []
    skipped_reasons = {}

    for person in following:
        handle = (person.get('handle') or person.get('username') or person.get('screen_name') or '').strip()
        if not handle:
            continue

        handle_lower = handle.lower()
        if handle_lower in existing_handles:
            skipped_reasons[handle] = 'already in contacts'
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

        # Filter: inactive (no tweet in 30 days) — only if data is available
        if last_tweet_at is not None:
            from datetime import datetime, timezone, timedelta
            cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
            if last_tweet_at < cutoff:
                skipped_reasons[handle] = f'inactive (last tweet {last_tweet_at[:10]})'
                continue

        # Filter: followers
        if followers < MIN_FOLLOWERS:
            skipped_reasons[handle] = f'<{MIN_FOLLOWERS} followers ({followers})'
            continue

        # Filter: high-profile
        if is_high_profile(bio, followers):
            skipped_reasons[handle] = f'high-profile (>{MAX_FOLLOWERS_HIGH_PROFILE} followers or major protocol founder)'
            continue

        # Filter: must be builder
        if not is_builder(bio):
            skipped_reasons[handle] = 'no builder/founder signal in bio'
            continue

        # Filter: exclude signals
        excl, reason = should_exclude(bio)
        if excl:
            skipped_reasons[handle] = reason
            continue

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
            'include': True,
            'status': 'Auto-filtered',
        }
        added.append(entry)
        existing_handles.add(handle_lower)

    print(f'  {os.path.basename(raw_path)}: {len(added)} added, {len(skipped_reasons)} skipped')
    return added


def main():
    # Load existing contacts
    with open(CONTACTS_PATH, encoding='utf-8') as f:
        contacts = json.load(f)

    existing_handles = {(c.get('x_handle') or '').lower() for c in contacts if c.get('x_handle')}
    print(f'Existing contacts: {len(contacts)} ({len(existing_handles)} with handles)')

    # Find all raw files
    raw_files = sorted(glob.glob(os.path.join(RAW_DIR, '*.json')))
    if not raw_files:
        print('No raw files found in raw/')
        return

    print(f'Processing {len(raw_files)} raw file(s)...')

    total_added = 0
    for raw_path in raw_files:
        new_entries = process_raw_file(raw_path, existing_handles)
        contacts.extend(new_entries)
        total_added += len(new_entries)

    print(f'\nTotal added: {total_added}')
    print(f'New contacts.json size: {len(contacts)}')

    with open(CONTACTS_PATH, 'w', encoding='utf-8') as f:
        json.dump(contacts, f, indent=2, ensure_ascii=False)
    print('Saved contacts.json')


if __name__ == '__main__':
    main()
