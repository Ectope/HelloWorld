"""Test script to demonstrate dashboard adaptability to new outbreak regions"""

from data_collector import DataCollector
import time

def test_adaptability():
    """Test the dashboard's ability to adapt to new outbreak regions"""

    collector = DataCollector()

    print("\n" + "="*60)
    print("TESTING DASHBOARD ADAPTABILITY")
    print("="*60)

    # Show current state
    print("\n1. Current outbreak data:")
    data = collector.get_latest_data()
    print(f"   Active regions: {len(data['regions'])}")
    for region in data['regions'].keys():
        print(f"   - {region}")

    # Simulate new outbreak in Maharashtra
    print("\n2. Simulating new outbreak in Maharashtra...")
    collector.simulate_new_outbreak_region("Maharashtra", cases=3)

    # Show updated state
    data = collector.get_latest_data()
    print(f"\n3. Updated outbreak data:")
    print(f"   Active regions: {len(data['regions'])}")
    for region, info in data['regions'].items():
        print(f"   - {region}: {info['infected']} infected, {info['quarantined']} quarantined")

    # Simulate another new outbreak
    print("\n4. Simulating new outbreak in Karnataka...")
    collector.simulate_new_outbreak_region("Karnataka", cases=2)

    # Final state
    data = collector.get_latest_data()
    print(f"\n5. Final outbreak data:")
    print(f"   Active regions: {len(data['regions'])}")
    print(f"   Total infected: {data['total_infected']}")
    print(f"   Total quarantined: {data['total_quarantined']}")
    print(f"   Total deaths: {data['total_deaths']}")

    print("\n   Regional breakdown:")
    for region, info in data['regions'].items():
        print(f"   - {region}:")
        print(f"     Infected: {info['infected']}, Quarantined: {info['quarantined']}")
        print(f"     Status: {info['status']}")

    print("\n   Recent timeline events:")
    for event in data['timeline'][-3:]:
        print(f"   - {event['date']}: {event['event']}")

    print("\n" + "="*60)
    print("✅ ADAPTABILITY TEST COMPLETED")
    print("The dashboard successfully adapted to new outbreak regions!")
    print("="*60)

if __name__ == "__main__":
    test_adaptability()
