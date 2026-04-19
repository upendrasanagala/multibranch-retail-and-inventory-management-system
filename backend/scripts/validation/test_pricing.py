import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from app import create_app
from app.utils.ai_engine import get_pricing_recommendations

app = create_app()
with app.app_context():
    recs = get_pricing_recommendations()
    print(f"Total Recommendations: {len(recs)}")
    for r in recs:
        print(f"Product: {r['product']}, Type: {r['type']}, Margin: {r['reason']}")
