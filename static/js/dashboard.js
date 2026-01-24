// Nipah Outbreak Dashboard JavaScript

let regionalChart = null;
let categoryChart = null;
let autoRefreshInterval = null;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initializing...');
    loadDashboardData();

    // Set up refresh button
    document.getElementById('refreshBtn').addEventListener('click', function() {
        this.disabled = true;
        this.textContent = 'Refreshing...';
        refreshData();
    });

    // Auto-refresh every 5 minutes
    autoRefreshInterval = setInterval(loadDashboardData, 5 * 60 * 1000);
});

// Load all dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch('/api/data');
        const result = await response.json();

        if (result.success) {
            updateDashboard(result.data);
        } else {
            showError('Failed to load data: ' + result.error);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to connect to server');
    }
}

// Update all dashboard components
function updateDashboard(data) {
    updateStats(data);
    updateCharts(data);
    updateRegionalDetails(data);
    updateTimeline(data);
    updateSources(data);
    updateLastUpdated(data.last_updated);
}

// Update statistics cards
function updateStats(data) {
    document.getElementById('totalInfected').textContent = data.total_infected || 0;
    document.getElementById('totalQuarantined').textContent = data.total_quarantined || 0;
    document.getElementById('totalDeaths').textContent = data.total_deaths || 0;
    document.getElementById('totalRecovered').textContent = data.total_recovered || 0;
}

// Update charts
function updateCharts(data) {
    updateRegionalChart(data);
    updateCategoryChart(data);
}

// Regional distribution chart
function updateRegionalChart(data) {
    const ctx = document.getElementById('regionalChart').getContext('2d');

    const regions = Object.keys(data.regions);
    const infected = regions.map(r => data.regions[r].infected);
    const quarantined = regions.map(r => data.regions[r].quarantined);

    if (regionalChart) {
        regionalChart.destroy();
    }

    regionalChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: regions,
            datasets: [
                {
                    label: 'Infected',
                    data: infected,
                    backgroundColor: 'rgba(255, 107, 107, 0.7)',
                    borderColor: 'rgba(255, 107, 107, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Quarantined',
                    data: quarantined,
                    backgroundColor: 'rgba(255, 165, 2, 0.7)',
                    borderColor: 'rgba(255, 165, 2, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: false
                }
            }
        }
    });
}

// Category breakdown chart
function updateCategoryChart(data) {
    const ctx = document.getElementById('categoryChart').getContext('2d');

    if (categoryChart) {
        categoryChart.destroy();
    }

    const total = data.total_infected + data.total_quarantined + data.total_deaths + data.total_recovered;

    if (total === 0) {
        return;
    }

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Infected', 'Quarantined', 'Deaths', 'Recovered'],
            datasets: [{
                data: [
                    data.total_infected,
                    data.total_quarantined,
                    data.total_deaths,
                    data.total_recovered
                ],
                backgroundColor: [
                    'rgba(255, 107, 107, 0.8)',
                    'rgba(255, 165, 2, 0.8)',
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(78, 205, 196, 0.8)'
                ],
                borderColor: [
                    'rgba(255, 107, 107, 1)',
                    'rgba(255, 165, 2, 1)',
                    'rgba(102, 126, 234, 1)',
                    'rgba(78, 205, 196, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        }
    });
}

// Update regional details
function updateRegionalDetails(data) {
    const regionList = document.getElementById('regionList');

    if (!data.regions || Object.keys(data.regions).length === 0) {
        regionList.innerHTML = '<p class="loading">No regional data available</p>';
        return;
    }

    let html = '';
    for (const [region, info] of Object.entries(data.regions)) {
        const statusClass = `status-${info.status}`;
        const districts = info.districts && info.districts.length > 0
            ? info.districts.join(', ')
            : 'Not specified';

        html += `
            <div class="region-card">
                <h3>${region}</h3>
                <span class="region-status ${statusClass}">${info.status.toUpperCase()}</span>
                <div class="region-info">
                    <div class="info-item">
                        <div class="info-label">Infected</div>
                        <div class="info-value">${info.infected}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Quarantined</div>
                        <div class="info-value">${info.quarantined}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Deaths</div>
                        <div class="info-value">${info.deaths}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Recovered</div>
                        <div class="info-value">${info.recovered}</div>
                    </div>
                </div>
                <p style="margin-top: 15px; color: #666; font-size: 0.9em;">
                    <strong>Districts:</strong> ${districts}
                </p>
                <p style="margin-top: 5px; color: #999; font-size: 0.85em;">
                    Updated: ${formatDate(info.last_updated)}
                </p>
            </div>
        `;
    }

    regionList.innerHTML = html;
}

// Update timeline
function updateTimeline(data) {
    const timeline = document.getElementById('timeline');

    if (!data.timeline || data.timeline.length === 0) {
        timeline.innerHTML = '<p class="loading">No timeline data available</p>';
        return;
    }

    let html = '';
    // Sort timeline by date (newest first)
    const sortedTimeline = [...data.timeline].sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    );

    for (const event of sortedTimeline) {
        html += `
            <div class="timeline-item">
                <div class="timeline-date">${formatDate(event.date)}</div>
                <div class="timeline-event">${event.event}</div>
                <div class="timeline-region">📍 ${event.region} - ${event.cases} case(s)</div>
            </div>
        `;
    }

    timeline.innerHTML = html;
}

// Update sources
function updateSources(data) {
    const sources = document.getElementById('sources');

    if (!data.sources || data.sources.length === 0) {
        sources.innerHTML = '<p class="loading">No source information available</p>';
        return;
    }

    let html = '';
    for (const source of data.sources) {
        html += `
            <div class="source-item">
                <div class="source-name">${source.name}</div>
                <div class="source-link">
                    <a href="${source.url}" target="_blank" rel="noopener noreferrer">
                        ${source.url}
                    </a>
                </div>
                <div class="source-checked">
                    Last checked: ${formatDate(source.last_checked)}
                </div>
            </div>
        `;
    }

    sources.innerHTML = html;
}

// Update last updated timestamp
function updateLastUpdated(timestamp) {
    const element = document.getElementById('lastUpdated');
    if (timestamp) {
        element.textContent = formatDate(timestamp);
    } else {
        element.textContent = 'Unknown';
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Refresh data from server
async function refreshData() {
    try {
        const response = await fetch('/api/refresh', {
            method: 'POST'
        });
        const result = await response.json();

        if (result.success) {
            showSuccess('Data refreshed successfully');
            await loadDashboardData();
        } else {
            showError('Refresh failed: ' + result.error);
        }
    } catch (error) {
        console.error('Error refreshing data:', error);
        showError('Failed to refresh data');
    } finally {
        const btn = document.getElementById('refreshBtn');
        btn.disabled = false;
        btn.textContent = 'Refresh Data';
    }
}

// Show error message
function showError(message) {
    const banner = document.getElementById('alertBanner');
    const messageEl = document.getElementById('alertMessage');

    banner.style.background = '#ff6b6b';
    messageEl.textContent = '❌ ' + message;
    banner.style.display = 'block';

    setTimeout(() => {
        banner.style.display = 'none';
    }, 5000);
}

// Show success message
function showSuccess(message) {
    const banner = document.getElementById('alertBanner');
    const messageEl = document.getElementById('alertMessage');

    banner.style.background = '#51cf66';
    messageEl.textContent = '✅ ' + message;
    banner.style.display = 'block';

    setTimeout(() => {
        banner.style.display = 'none';
    }, 3000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    if (regionalChart) {
        regionalChart.destroy();
    }
    if (categoryChart) {
        categoryChart.destroy();
    }
});
