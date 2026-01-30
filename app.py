"""Flask application for Nipah Outbreak Dashboard"""

from flask import Flask, render_template, jsonify, request
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import atexit

from data_collector import DataCollector
from data_models import OutbreakData
import config

app = Flask(__name__)
app.config.from_object(config)

# Initialize data collector
data_collector = DataCollector()
outbreak_data = OutbreakData()

# Background scheduler for automatic updates
scheduler = BackgroundScheduler()
scheduler.add_job(
    func=data_collector.collect_all_sources,
    trigger="interval",
    minutes=config.UPDATE_INTERVAL,
    id='data_collection_job',
    name='Collect outbreak data from sources',
    replace_existing=True
)
scheduler.start()

# Shut down the scheduler when exiting the app
atexit.register(lambda: scheduler.shutdown())


@app.route('/')
def index():
    """Render the main dashboard"""
    return render_template('index.html')


@app.route('/api/data')
def get_data():
    """API endpoint to get all outbreak data"""
    try:
        data = outbreak_data.get_all_data()
        return jsonify({
            'success': True,
            'data': data,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/summary')
def get_summary():
    """API endpoint to get summary statistics"""
    try:
        summary = outbreak_data.get_summary()
        return jsonify({
            'success': True,
            'summary': summary
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/region/<region>')
def get_region(region):
    """API endpoint to get data for specific region"""
    try:
        region_data = outbreak_data.get_region_data(region)
        if region_data:
            return jsonify({
                'success': True,
                'region': region,
                'data': region_data
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Region not found'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/update', methods=['POST'])
def manual_update():
    """API endpoint for manual data updates"""
    try:
        data = request.get_json()

        region = data.get('region')
        infected = data.get('infected', 0)
        quarantined = data.get('quarantined', 0)
        deaths = data.get('deaths', 0)
        recovered = data.get('recovered', 0)
        districts = data.get('districts', [])
        status = data.get('status', 'monitoring')

        if not region:
            return jsonify({
                'success': False,
                'error': 'Region is required'
            }), 400

        data_collector.manual_update(
            region=region,
            infected=infected,
            quarantined=quarantined,
            deaths=deaths,
            recovered=recovered,
            districts=districts,
            status=status
        )

        return jsonify({
            'success': True,
            'message': f'Successfully updated data for {region}'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/refresh', methods=['POST'])
def refresh_data():
    """API endpoint to manually trigger data collection"""
    try:
        data_collector.collect_all_sources()
        return jsonify({
            'success': True,
            'message': 'Data refresh completed',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/timeline')
def get_timeline():
    """API endpoint to get outbreak timeline"""
    try:
        data = outbreak_data.get_all_data()
        return jsonify({
            'success': True,
            'timeline': data.get('timeline', [])
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/sources')
def get_sources():
    """API endpoint to get data sources information"""
    try:
        data = outbreak_data.get_all_data()
        return jsonify({
            'success': True,
            'sources': data.get('sources', [])
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/daily-statistics')
def get_daily_statistics():
    """API endpoint to get daily cumulative statistics"""
    try:
        daily_stats = outbreak_data.get_daily_statistics()
        return jsonify({
            'success': True,
            'daily_statistics': daily_stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'scheduler_running': scheduler.running
    })


if __name__ == '__main__':
    print("=" * 60)
    print("Nipah Outbreak Dashboard Starting...")
    print("=" * 60)
    print(f"Dashboard will be available at: http://{config.HOST}:{config.PORT}")
    print(f"Auto-refresh interval: {config.UPDATE_INTERVAL} minutes")
    print(f"Monitoring regions: {', '.join(config.MONITORED_STATES)}")
    print("=" * 60)

    # Initial data collection
    data_collector.collect_all_sources()

    # Start Flask app
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG
    )
