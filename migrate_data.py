"""Migration script to add daily statistics to existing outbreak data"""

import json
from datetime import datetime
from data_models import OutbreakData

def migrate_data():
    """Add daily statistics field and populate with historical data"""

    od = OutbreakData()

    # Ensure daily_statistics exists
    if 'daily_statistics' not in od.data:
        od.data['daily_statistics'] = []

    # Add historical data points based on the timeline
    # We'll create snapshots for key dates

    historical_data = [
        {
            'date': '2026-01-11T00:00:00',
            'infected': 2,
            'quarantined': 40,
            'deaths': 0,
            'recovered': 0
        },
        {
            'date': '2026-01-15T00:00:00',
            'infected': 3,
            'quarantined': 60,
            'deaths': 0,
            'recovered': 0
        },
        {
            'date': '2026-01-20T00:00:00',
            'infected': 5,
            'quarantined': 100,
            'deaths': 1,
            'recovered': 0
        },
        {
            'date': '2026-01-23T00:00:00',
            'infected': 9,
            'quarantined': 190,
            'deaths': 2,
            'recovered': 0
        },
        {
            'date': '2026-01-24T00:00:00',
            'infected': 14,
            'quarantined': 290,
            'deaths': 2,
            'recovered': 0
        }
    ]

    od.data['daily_statistics'] = historical_data
    od.save_data()

    print("✅ Migration completed successfully!")
    print(f"Added {len(historical_data)} daily statistics entries")
    print("\nDaily statistics:")
    for stat in historical_data:
        print(f"  {stat['date']}: {stat['infected']} infected, {stat['quarantined']} quarantined, {stat['deaths']} deaths")

if __name__ == "__main__":
    migrate_data()
