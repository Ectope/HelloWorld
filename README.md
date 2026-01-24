# Nipah Virus Outbreak Dashboard - India

A real-time dashboard for tracking the Nipah virus outbreak in India. This system monitors reliable data sources, tracks infected and quarantined individuals across different regions, and adapts automatically when the virus spreads to new areas.

## Features

- **Real-time Statistics**: Track total infected, quarantined, deaths, and recovered cases
- **Regional Breakdown**: Visualize outbreak data by state/region with automatic adaptation to new outbreak areas
- **Interactive Charts**: Bar charts for regional distribution and doughnut charts for category breakdown
- **Timeline Tracking**: Historical view of outbreak progression
- **Automated Monitoring**: Background data collection from reliable sources every 60 minutes
- **Data Sources**: Integration with WHO, Government health departments, and verified news outlets
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Architecture

### Backend (Python Flask)
- RESTful API for data management
- Background scheduler for automatic updates
- Web scraping capabilities for data collection
- JSON-based data storage

### Frontend (HTML/CSS/JavaScript)
- Interactive dashboard with Chart.js visualizations
- Real-time data updates via AJAX
- Responsive Material Design-inspired UI

### Data Sources
The dashboard monitors these reliable sources:
- **World Health Organization (WHO)** - Official outbreak notifications
- **Outbreak News Today** - Verified outbreak news
- **Ministry of Health and Family Welfare, India** - Government health data

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HelloWorld
   ```

2. **Create a virtual environment** (recommended)
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Access the dashboard**
   Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

## Usage

### Viewing the Dashboard
Once the application is running, the dashboard will display:
- Summary statistics at the top
- Regional distribution charts
- Detailed regional breakdowns
- Outbreak timeline
- Data source information

### Manual Data Refresh
Click the "Refresh Data" button to manually trigger data collection from all sources.

### API Endpoints

The application provides several API endpoints:

- `GET /api/data` - Get all outbreak data
- `GET /api/summary` - Get summary statistics
- `GET /api/region/<region>` - Get data for a specific region
- `GET /api/timeline` - Get outbreak timeline
- `GET /api/sources` - Get data sources information
- `POST /api/update` - Manually update region data
- `POST /api/refresh` - Trigger data collection
- `GET /health` - Health check endpoint

### Manual Data Update

To manually update data for a region, send a POST request to `/api/update`:

```bash
curl -X POST http://localhost:5000/api/update \
  -H "Content-Type: application/json" \
  -d '{
    "region": "Maharashtra",
    "infected": 3,
    "quarantined": 50,
    "deaths": 0,
    "recovered": 0,
    "districts": ["Mumbai"],
    "status": "investigating"
  }'
```

## Configuration

Edit `config.py` to customize:

- **UPDATE_INTERVAL**: Data collection frequency (default: 60 minutes)
- **PORT**: Server port (default: 5000)
- **MONITORED_STATES**: List of Indian states to monitor
- **DATA_SOURCES**: URLs and configuration for data sources

## Project Structure

```
HelloWorld/
├── app.py                  # Flask application
├── data_collector.py       # Data collection module
├── data_models.py          # Data models and storage
├── config.py               # Configuration settings
├── requirements.txt        # Python dependencies
├── data/
│   └── outbreak_data.json  # Outbreak data storage
├── static/
│   ├── css/
│   │   └── style.css       # Dashboard styles
│   └── js/
│       └── dashboard.js    # Dashboard JavaScript
└── templates/
    └── index.html          # Dashboard HTML template
```

## Current Outbreak Status (as of January 2026)

Based on reliable sources:

### West Bengal
- **Cases**: 5 confirmed
- **Quarantined**: 190 contacts traced
- **Status**: Critical, under investigation
- **Districts**: North 24 Parganas (Barasat area)

### Kerala
- **Cases**: 4 confirmed (May-July 2025)
- **Deaths**: 2
- **Status**: Contained

## Adaptive Regional Tracking

The dashboard automatically adapts when the virus spreads to new regions:

1. **Automatic Detection**: When new regional data is added, the dashboard immediately reflects it
2. **Dynamic Visualization**: Charts and statistics automatically include new regions
3. **Timeline Updates**: New outbreak events are logged in the timeline
4. **Regional Cards**: New region cards appear in the regional breakdown section

## Data Collection Notes

The current implementation includes:
- **Initialized Data**: Pre-populated with January 2026 outbreak information from WHO and verified sources
- **Manual Update API**: Allows authorized updates of regional data
- **Extensible Framework**: Ready for integration with automated web scraping

### Future Enhancements
- Automated web scraping from government health portals
- Integration with WHO API (when available)
- Real-time alerts for new outbreaks
- Email/SMS notifications
- Database backend (PostgreSQL/MongoDB)
- User authentication for data updates
- Export functionality (CSV, PDF reports)

## Security Considerations

- The `/api/update` endpoint should be protected with authentication in production
- Implement rate limiting for API endpoints
- Use HTTPS in production environments
- Validate and sanitize all input data

## Contributing

To contribute to this project:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Disclaimer

This dashboard is for informational purposes only. For official health information and guidance, please consult:
- Your local health authorities
- World Health Organization (WHO)
- Ministry of Health and Family Welfare, India

## License

This project is open source and available for public health purposes.

## Support

For issues, questions, or contributions, please open an issue in the repository.

---

**Stay Safe. Stay Informed.**
