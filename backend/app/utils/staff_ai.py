import pandas as pd
from datetime import datetime, timedelta
from app.extensions import db
from app.models.sales import SalesTransaction, TransactionItem
from app.models.user import User
from sqlalchemy import func

def get_staff_performance_metrics(branch_id=None):
    """
    Calculates AI-driven performance scores for staff members.
    """
    # 1. Fetch sales data for the last 30 days
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    query = db.session.query(
        SalesTransaction.staff_id,
        SalesTransaction.transaction_id,
        SalesTransaction.total_amount,
        TransactionItem.quantity
    ).join(TransactionItem).filter(
        SalesTransaction.transaction_date >= thirty_days_ago,
        SalesTransaction.status == "completed"
    )
    
    if branch_id:
        query = query.filter(SalesTransaction.branch_id == branch_id)
        
    data = query.all()
    if not data:
        return []
        
    df = pd.DataFrame(data, columns=['user_id', 'txn_id', 'amount', 'qty'])
    
    # 2. Aggregate metrics per user
    # Note: We must be careful not to double count transaction-level fields (revenue, txn_count) 
    # since the join with TransactionItem repeats them for each item.
    stats = df.groupby('user_id').apply(lambda x: pd.Series({
        'total_revenue': float(x.drop_duplicates('txn_id')['amount'].sum()),
        'total_items': int(x['qty'].sum()),
        'txn_count': int(x['txn_id'].nunique())
    }), include_groups=False).reset_index()
    
    # 3. Calculate Scores (Normalized 1-10)
    # Value Score: Based on Revenue
    max_rev = stats['total_revenue'].max() if not stats.empty else 1
    stats['value_score'] = (stats['total_revenue'] / max_rev * 10).round(1)
    
    # Efficiency Score: Items per transaction
    stats['avg_items'] = stats['total_items'] / stats['txn_count']
    max_efficiency = stats['avg_items'].max() if not stats.empty else 1
    stats['efficiency_score'] = (stats['avg_items'] / max_efficiency * 10).round(1)
    
    # 4. Map to User Details
    output = []
    for _, row in stats.iterrows():
        user_id = int(row['user_id'])
        user = User.query.get(user_id)
        if user:
            output.append({
                "user_id": user.user_id,
                "name": f"{user.first_name} {user.last_name}",
                "metrics": {
                    "revenue": float(row['total_revenue']),
                    "transactions": int(row['txn_count']),
                    "avg_items": float(row['avg_items'].round(2))
                },
                "scores": {
                    "value": float(row['value_score']),
                    "efficiency": float(row['efficiency_score']),
                    "overall": float(((row['value_score'] + row['efficiency_score']) / 2).round(1))
                },
                "insight": generate_staff_insight(row['value_score'], row['efficiency_score'])
            })
            
    return sorted(output, key=lambda x: x['scores']['overall'], reverse=True)

def generate_staff_insight(value, efficiency):
    if value > 8 and efficiency > 8:
        return "Top Performer: High volume and high basket size."
    if value > 8:
        return "High Volume: Excellent at processing many transactions."
    if efficiency > 8:
        return "Upseller: Consistently adds more items per sale."
    if value < 4:
        return "Needs Support: Low transaction volume recently."
    return "Steady: Consistent performance across metrics."
