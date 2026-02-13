
from app import create_app
from app.routes.admin import sales_report
from flask import Flask, request
import json

app = create_app()

def test_report():
    with app.test_request_context('/admin/reports/sales?period=0'):
        # Mocking authentication (skipping decorator logic if possible, or using app context)
        # Since sales_report is decorated, we might need to bypass or mock jwt.
        # Easier: copy the logic or run a real request if we had a token.
        
        # Let's just run the logic directly inside a context
        from app.models.sales import SalesTransaction
        from app.models.branch import Branch
        from app.extensions import db
        import datetime
        from datetime import timedelta
        
        # Logic from admin.py
        start_date = datetime.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = datetime.datetime.now()
        
        print(f"Test Start Date: {start_date}")
        print(f"Test End Date: {end_date}")
        
        query = db.session.query(SalesTransaction).filter(
            SalesTransaction.transaction_date >= start_date,
            SalesTransaction.transaction_date <= end_date,
            SalesTransaction.status == "completed"
        )
        
        results = query.all()
        print(f"\nFound {len(results)} transactions for Today.")
        for t in results:
            print(f" - ID: {t.transaction_id}, Date: {t.transaction_date}, Amount: {t.total_amount}")

if __name__ == "__main__":
    test_report()
