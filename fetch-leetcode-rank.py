#!/usr/bin/env python3
"""
Script to fetch LeetCode profile rank data.
This script fetches the ranking from a LeetCode profile page.
"""

import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: Required packages not installed. Run: pip install requests beautifulsoup4")
    sys.exit(1)

LEETCODE_USERNAME = "umeshg17"
LEETCODE_URL = f"https://leetcode.com/u/{LEETCODE_USERNAME}/"
DATA_FILE = "leetcode-rank-data.json"


def fetch_leetcode_rank():
    """Fetch LeetCode ranking from profile page."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        # Try using LeetCode GraphQL API first
        graphql_url = "https://leetcode.com/graphql/"
        query = """
        query getUserProfile($username: String!) {
            matchedUser(username: $username) {
                username
                profile {
                    ranking
                }
                submitStats {
                    acSubmissionNum {
                        difficulty
                        count
                    }
                }
            }
        }
        """
        
        variables = {"username": LEETCODE_USERNAME}
        payload = {
            "query": query,
            "variables": variables
        }
        
        response = requests.post(graphql_url, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "data" in data and data["data"] and data["data"].get("matchedUser"):
                ranking = data["data"]["matchedUser"]["profile"].get("ranking")
                if ranking:
                    return int(ranking)
        
        # Fallback: Try scraping the profile page
        print("GraphQL API failed, trying web scraping...")
        response = requests.get(LEETCODE_URL, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Look for ranking in various possible locations
        # LeetCode might embed data in script tags
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string:
                # Look for ranking pattern
                match = re.search(r'"ranking":\s*(\d+)', script.string)
                if match:
                    return int(match.group(1))
                
                # Alternative pattern
                match = re.search(r'ranking["\']?\s*:\s*(\d+)', script.string)
                if match:
                    return int(match.group(1))
        
        # Try finding in text content
        page_text = response.text
        match = re.search(r'Ranking[:\s]+(\d+)', page_text, re.IGNORECASE)
        if match:
            return int(match.group(1))
        
        print("Warning: Could not find ranking on profile page")
        return None
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None


def load_existing_data():
    """Load existing rank data from JSON file."""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            print(f"Warning: {DATA_FILE} is corrupted, starting fresh")
    return {"data": []}


def save_rank_data(ranking):
    """Save new rank data point. Stores all ranks throughout the day."""
    data = load_existing_data()
    
    today = datetime.now().strftime("%Y-%m-%d")
    timestamp = datetime.now().isoformat()
    
    # Always add a new entry (don't check for existing entries)
    # This allows tracking all rank changes throughout the day
    data["data"].append({
        "date": today,
        "rank": ranking,
        "timestamp": timestamp
    })
    
    print(f"Saved rank for {today}: {ranking} at {timestamp}")
    
    # Sort by date, then by timestamp
    data["data"].sort(key=lambda x: (x["date"], x["timestamp"]))
    
    # Save to file
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    
    return data


def main():
    """Main function."""
    print(f"Fetching LeetCode rank for {LEETCODE_USERNAME}...")
    ranking = fetch_leetcode_rank()
    
    if ranking is None:
        print("Warning: Failed to fetch ranking. This might be due to:")
        print("  - LeetCode API changes")
        print("  - Network issues")
        print("  - Profile privacy settings")
        print("  - Rate limiting")
        print("\nThe script will exit without updating data.")
        sys.exit(1)
    
    print(f"Current rank: {ranking:,}")
    data = save_rank_data(ranking)
    print(f"Data saved to {DATA_FILE}")
    print(f"Total data points: {len(data['data'])}")


if __name__ == "__main__":
    main()

