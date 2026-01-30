"""Data models for Nipah outbreak tracking"""

from datetime import datetime
from typing import Dict, List, Optional
import json
import os
from config import DATA_FILE, DATA_DIR


class OutbreakData:
    """Model for storing and managing outbreak data"""

    def __init__(self):
        self.data = {
            'last_updated': None,
            'total_infected': 0,
            'total_quarantined': 0,
            'total_deaths': 0,
            'total_recovered': 0,
            'regions': {},
            'timeline': [],
            'sources': [],
            'daily_statistics': []  # New field for cumulative tracking
        }
        self.load_data()

    def load_data(self):
        """Load data from JSON file"""
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'r') as f:
                    self.data = json.load(f)
            except Exception as e:
                print(f"Error loading data: {e}")
                self.initialize_data()
        else:
            self.initialize_data()

    def initialize_data(self):
        """Initialize data with current known outbreak information"""
        # Based on January 2026 research
        self.data = {
            'last_updated': datetime.now().isoformat(),
            'total_infected': 9,  # 5 West Bengal + 4 Kerala
            'total_quarantined': 190,  # Contact tracing in West Bengal
            'total_deaths': 2,  # Kerala 2025 outbreak
            'total_recovered': 0,
            'regions': {
                'West Bengal': {
                    'infected': 5,
                    'quarantined': 190,
                    'deaths': 0,
                    'recovered': 0,
                    'status': 'critical',
                    'districts': ['North 24 Parganas'],
                    'last_updated': '2026-01-23'
                },
                'Kerala': {
                    'infected': 4,
                    'quarantined': 0,
                    'deaths': 2,
                    'recovered': 0,
                    'status': 'contained',
                    'districts': [],
                    'last_updated': '2025-07-12'
                }
            },
            'timeline': [
                {
                    'date': '2026-01-11',
                    'event': 'First cases detected in West Bengal',
                    'region': 'West Bengal',
                    'cases': 2
                },
                {
                    'date': '2026-01-23',
                    'event': 'Total 5 cases confirmed in West Bengal',
                    'region': 'West Bengal',
                    'cases': 5
                }
            ],
            'sources': [
                {
                    'name': 'WHO',
                    'url': 'https://www.who.int/emergencies/disease-outbreak-news/item/2025-DON577',
                    'last_checked': datetime.now().isoformat()
                },
                {
                    'name': 'Outbreak News Today',
                    'url': 'https://outbreaknewstoday.substack.com',
                    'last_checked': datetime.now().isoformat()
                }
            ],
            'daily_statistics': [
                {
                    'date': '2026-01-11',
                    'infected': 2,
                    'quarantined': 40,
                    'deaths': 0,
                    'recovered': 0
                },
                {
                    'date': '2026-01-23',
                    'infected': 9,
                    'quarantined': 190,
                    'deaths': 2,
                    'recovered': 0
                }
            ]
        }
        self.save_data()

    def save_data(self):
        """Save data to JSON file"""
        os.makedirs(DATA_DIR, exist_ok=True)
        try:
            with open(DATA_FILE, 'w') as f:
                json.dump(self.data, f, indent=2)
        except Exception as e:
            print(f"Error saving data: {e}")

    def update_region(self, region: str, infected: int, quarantined: int,
                     deaths: int = 0, recovered: int = 0,
                     districts: List[str] = None, status: str = 'monitoring'):
        """Update or add region data"""
        if region not in self.data['regions']:
            self.data['regions'][region] = {}

        self.data['regions'][region].update({
            'infected': infected,
            'quarantined': quarantined,
            'deaths': deaths,
            'recovered': recovered,
            'status': status,
            'districts': districts or [],
            'last_updated': datetime.now().isoformat()
        })

        # Recalculate totals
        self.recalculate_totals()
        self.data['last_updated'] = datetime.now().isoformat()
        self.save_data()

    def add_timeline_event(self, event: str, region: str, cases: int):
        """Add event to timeline"""
        self.data['timeline'].append({
            'date': datetime.now().isoformat(),
            'event': event,
            'region': region,
            'cases': cases
        })
        self.save_data()

    def recalculate_totals(self):
        """Recalculate total statistics from regional data"""
        self.data['total_infected'] = sum(
            r.get('infected', 0) for r in self.data['regions'].values()
        )
        self.data['total_quarantined'] = sum(
            r.get('quarantined', 0) for r in self.data['regions'].values()
        )
        self.data['total_deaths'] = sum(
            r.get('deaths', 0) for r in self.data['regions'].values()
        )
        self.data['total_recovered'] = sum(
            r.get('recovered', 0) for r in self.data['regions'].values()
        )

        # Record daily snapshot
        self.record_daily_snapshot()

    def record_daily_snapshot(self):
        """Record a daily snapshot of current statistics"""
        # Ensure daily_statistics exists (backward compatibility)
        if 'daily_statistics' not in self.data:
            self.data['daily_statistics'] = []

        today = datetime.now().strftime('%Y-%m-%d')

        # Check if we already have a snapshot for today
        existing_index = None
        for i, snapshot in enumerate(self.data['daily_statistics']):
            if snapshot['date'].startswith(today):
                existing_index = i
                break

        snapshot = {
            'date': datetime.now().isoformat(),
            'infected': self.data['total_infected'],
            'quarantined': self.data['total_quarantined'],
            'deaths': self.data['total_deaths'],
            'recovered': self.data['total_recovered']
        }

        if existing_index is not None:
            # Update today's snapshot
            self.data['daily_statistics'][existing_index] = snapshot
        else:
            # Add new snapshot
            self.data['daily_statistics'].append(snapshot)

        # Keep only last 90 days
        if len(self.data['daily_statistics']) > 90:
            self.data['daily_statistics'] = self.data['daily_statistics'][-90:]

    def get_all_data(self) -> Dict:
        """Get all outbreak data"""
        return self.data

    def get_region_data(self, region: str) -> Optional[Dict]:
        """Get data for specific region"""
        return self.data['regions'].get(region)

    def get_summary(self) -> Dict:
        """Get summary statistics"""
        return {
            'total_infected': self.data['total_infected'],
            'total_quarantined': self.data['total_quarantined'],
            'total_deaths': self.data['total_deaths'],
            'total_recovered': self.data['total_recovered'],
            'active_regions': len(self.data['regions']),
            'last_updated': self.data['last_updated']
        }

    def get_daily_statistics(self) -> List[Dict]:
        """Get daily statistics for cumulative curve chart"""
        # Ensure daily_statistics exists (backward compatibility)
        if 'daily_statistics' not in self.data:
            return []

        return self.data.get('daily_statistics', [])
