"""Data collection module for Nipah outbreak information"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Dict, List, Optional
import re
from data_models import OutbreakData
from config import DATA_SOURCES


class DataCollector:
    """Collects outbreak data from reliable sources"""

    def __init__(self):
        self.outbreak_data = OutbreakData()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

    def collect_all_sources(self):
        """Collect data from all configured sources"""
        print(f"[{datetime.now()}] Starting data collection...")

        try:
            # WHO data collection
            self.collect_who_data()

            # Outbreak News Today data collection
            self.collect_outbreak_news()

            # Update last checked time for sources
            for source in self.outbreak_data.data['sources']:
                source['last_checked'] = datetime.now().isoformat()

            self.outbreak_data.save_data()
            print(f"[{datetime.now()}] Data collection completed successfully")

        except Exception as e:
            print(f"Error during data collection: {e}")

    def collect_who_data(self):
        """Collect data from WHO Disease Outbreak News"""
        try:
            print("Collecting data from WHO...")
            # Note: In a production environment, this would parse WHO's official pages
            # For now, we'll use the data we already have from research
            # Real implementation would use requests + BeautifulSoup to parse WHO pages

            # Placeholder for actual web scraping
            # In production, you would:
            # 1. Fetch the WHO disease outbreak news page
            # 2. Search for Nipah-related announcements
            # 3. Parse case numbers and regional information
            # 4. Update the outbreak data accordingly

            print("WHO data collection completed (using initialized data)")

        except Exception as e:
            print(f"Error collecting WHO data: {e}")

    def collect_outbreak_news(self):
        """Collect data from Outbreak News Today"""
        try:
            print("Collecting data from Outbreak News Today...")
            # Note: Similar to WHO, this would parse outbreak news in production
            # For demonstration, we're using pre-researched data

            print("Outbreak News data collection completed (using initialized data)")

        except Exception as e:
            print(f"Error collecting Outbreak News data: {e}")

    def parse_case_numbers(self, text: str) -> Dict[str, int]:
        """Extract case numbers from text using regex"""
        result = {
            'infected': 0,
            'quarantined': 0,
            'deaths': 0,
            'recovered': 0
        }

        # Look for patterns like "5 cases", "190 quarantined", etc.
        infected_match = re.search(r'(\d+)\s+case[s]?', text, re.IGNORECASE)
        if infected_match:
            result['infected'] = int(infected_match.group(1))

        quarantine_match = re.search(r'(\d+)\s+(?:quarantined|contacts?)', text, re.IGNORECASE)
        if quarantine_match:
            result['quarantined'] = int(quarantine_match.group(1))

        deaths_match = re.search(r'(\d+)\s+deaths?', text, re.IGNORECASE)
        if deaths_match:
            result['deaths'] = int(deaths_match.group(1))

        recovered_match = re.search(r'(\d+)\s+recovered', text, re.IGNORECASE)
        if recovered_match:
            result['recovered'] = int(recovered_match.group(1))

        return result

    def manual_update(self, region: str, infected: int, quarantined: int,
                     deaths: int = 0, recovered: int = 0,
                     districts: List[str] = None, status: str = 'monitoring'):
        """Manually update data for a region"""
        print(f"Manually updating data for {region}...")

        self.outbreak_data.update_region(
            region=region,
            infected=infected,
            quarantined=quarantined,
            deaths=deaths,
            recovered=recovered,
            districts=districts,
            status=status
        )

        # Add timeline event if there's a change
        if infected > 0:
            self.outbreak_data.add_timeline_event(
                event=f"Update: {infected} infected, {quarantined} quarantined in {region}",
                region=region,
                cases=infected
            )

        print(f"Successfully updated {region} data")

    def get_latest_data(self) -> Dict:
        """Get the latest outbreak data"""
        return self.outbreak_data.get_all_data()

    def simulate_new_outbreak_region(self, region: str, cases: int = 1):
        """Simulate detection of outbreak in a new region (for testing adaptability)"""
        print(f"⚠️  New outbreak detected in {region}!")

        self.outbreak_data.update_region(
            region=region,
            infected=cases,
            quarantined=cases * 20,  # Estimate 20 contacts per case
            deaths=0,
            recovered=0,
            status='investigating'
        )

        self.outbreak_data.add_timeline_event(
            event=f"New outbreak detected in {region}",
            region=region,
            cases=cases
        )

        print(f"Dashboard updated with {region} data")


if __name__ == "__main__":
    # Test the data collector
    collector = DataCollector()
    collector.collect_all_sources()

    # Print summary
    data = collector.get_latest_data()
    print("\n=== Nipah Outbreak Summary ===")
    print(f"Total Infected: {data['total_infected']}")
    print(f"Total Quarantined: {data['total_quarantined']}")
    print(f"Total Deaths: {data['total_deaths']}")
    print(f"\nActive Regions: {len(data['regions'])}")
    for region, info in data['regions'].items():
        print(f"  - {region}: {info['infected']} cases")
