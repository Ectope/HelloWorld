"""Configuration for Nipah Outbreak Dashboard"""

import os

# Application settings
DEBUG = True
HOST = '0.0.0.0'
PORT = 5000

# Data sources - Reliable sources for Nipah outbreak information
DATA_SOURCES = {
    'who': {
        'name': 'World Health Organization',
        'url': 'https://www.who.int/emergencies/disease-outbreak-news',
        'type': 'official'
    },
    'outbreak_news': {
        'name': 'Outbreak News Today',
        'url': 'https://outbreaknewstoday.substack.com',
        'type': 'news'
    },
    'india_mohfw': {
        'name': 'Ministry of Health and Family Welfare, India',
        'url': 'https://www.mohfw.gov.in/',
        'type': 'official'
    }
}

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DATA_FILE = os.path.join(DATA_DIR, 'outbreak_data.json')

# Update interval (in minutes)
UPDATE_INTERVAL = 60

# Indian states to monitor
MONITORED_STATES = [
    'West Bengal',
    'Kerala',
    'Karnataka',
    'Tamil Nadu',
    'Assam',
    'Bihar',
    'Maharashtra',
    'All India'
]
