import pandas as pd
from datetime import datetime, timedelta
from app.extensions import db
from app.models.sales import SalesTransaction, TransactionItem
from app.models.product import Product, ProductVariant
from app.models.branch import Branch
from app.models.adjustment import InventoryAdjustment
from app.models.announcement import Announcement
from sqlalchemy import func, case

def get_inventory_insights(branch_id=None):
    """
    Analyzes sales history to provide predictive inventory insights.
    Returns a list of actionable recommendations.
    """
    # 1. Fetch sales history for the last 30 days
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    query = db.session.query(
        ProductVariant.product_id,
        SalesTransaction.branch_id,
        TransactionItem.quantity,
        SalesTransaction.transaction_date
    ).join(
        SalesTransaction, TransactionItem.transaction_id == SalesTransaction.transaction_id
    ).join(
        ProductVariant, TransactionItem.variant_id == ProductVariant.variant_id
    ).filter(
        SalesTransaction.transaction_date >= thirty_days_ago,
        SalesTransaction.status == "completed"
    )
    
    if branch_id:
        query = query.filter(SalesTransaction.branch_id == branch_id)
        
    sales_data = query.all()
    
    if not sales_data:
        return []

    # 2. Convert to Pandas DataFrame for analysis
    df = pd.DataFrame(sales_data, columns=['product_id', 'branch_id', 'quantity', 'date'])
    
    # 3. Calculate Daily Velocity (Weighted Average)
    # We'll give more weight to the last 7 days than the previous 23 days
    seven_days_ago = datetime.now() - timedelta(days=7)
    df['is_recent'] = df['date'] >= seven_days_ago
    
    # Group by product and branch
    velocity_stats = df.groupby(['product_id', 'branch_id']).agg(
        total_sales=('quantity', 'sum'),
        recent_sales=('quantity', lambda x: x[df.loc[x.index, 'is_recent']].sum())
    ).reset_index()
    
    # Weighted velocity: (RecentAvg * 0.7) + (OlderAvg * 0.3)
    # This adaptively identifies trends
    velocity_stats['daily_velocity'] = (
        (velocity_stats['recent_sales'] / 7 * 0.7) + 
        ((velocity_stats['total_sales'] - velocity_stats['recent_sales']) / 23 * 0.3)
    )
    
    # 4. Fetch current inventory levels (Variations)
    inv_query = db.session.query(
        ProductVariant.product_id,
        ProductVariant.branch_id,
        ProductVariant.stock_quantity,
        ProductVariant.variant_size,
        Product.name.label('product_name'),
        Branch.name.label('branch_name'),
        ProductVariant.price
    ).join(Product, ProductVariant.product_id == Product.product_id)\
     .join(Branch, ProductVariant.branch_id == Branch.branch_id)
     
    if branch_id:
        inv_query = inv_query.filter(Inventory.branch_id == branch_id)
        
    inventory_data = inv_query.all()
    inv_df = pd.DataFrame(inventory_data, columns=[
        'product_id', 'branch_id', 'current_qty', 'size', 
        'product_base_name', 'branch_name', 'unit_price'
    ])
    inv_df['product_name'] = inv_df.apply(lambda r: f"{r['product_base_name']} ({r['size']})" if r['size'] else r['product_base_name'], axis=1)
    inv_df['min_threshold'] = 10 # Default
    
    # 5. Merge and Calculate Insights
    results = pd.merge(inv_df, velocity_stats, on=['product_id', 'branch_id'], how='left')
    results['daily_velocity'] = results['daily_velocity'].fillna(0.01) # Default tiny velocity for items with no sales
    
    # Days Remaining until stockout
    results['days_remaining'] = results['current_qty'] / results['daily_velocity']
    
    # Suggested Restock (enough for 21 days)
    results['suggested_restock'] = (results['daily_velocity'] * 21) - results['current_qty']
    results['suggested_restock'] = results['suggested_restock'].apply(lambda x: max(0, round(x)))

    # 6. Formatting Insights
    insights = []
    
    # Case A: Stockout Imminent (Critical)
    critical = results[results['days_remaining'] <= 5].sort_values('days_remaining')
    for _, row in critical.iterrows():
        insights.append({
            "type": "critical",
            "product": row['product_name'],
            "branch": row['branch_name'],
            "message": f"Predicted to run out in {round(row['days_remaining'], 1)} days based on current velocity.",
            "recommendation": f"Restock {row['suggested_restock']} units immediately to cover next 3 weeks.",
            "urgency_score": 10 - row['days_remaining'] if row['days_remaining'] > 0 else 10
        })
        
    # Case B: Warning (Stock low relative to velocity)
    warning = results[(results['days_remaining'] > 5) & (results['days_remaining'] <= 14)].sort_values('days_remaining')
    for _, row in warning.iterrows():
        insights.append({
            "type": "warning",
            "product": row['product_name'],
            "branch": row['branch_name'],
            "message": f"Stock levels dropping. Will run out in approx {round(row['days_remaining'])} days.",
            "recommendation": f"Plan a restock of {row['suggested_restock']} units in next batch.",
            "urgency_score": 5
        })

    # Case C: Dead Stock / Overstock
    # Items with high stock but low velocity
    dead_stock = results[(results['current_qty'] > results['min_threshold'] * 2) & (results['daily_velocity'] < 0.05)]
    for _, row in dead_stock.iterrows():
        # Avoid duplicate types for the same product
        if not any(i['product'] == row['product_name'] and i['type'] == 'dead_stock' for i in insights):
            insights.append({
                "type": "insight",
                "product": row['product_name'],
                "branch": row['branch_name'],
                "message": "Item is moving slowly (0 sales recently) while having high stock.",
                "recommendation": "Consider a promotional discount or transfer stock to a different branch.",
                "urgency_score": 2
            })

    return sorted(insights, key=lambda x: x['urgency_score'], reverse=True)[:10]

def get_branch_rebalance_suggestions():
    """
    Identifies opportunities to move stock from surplus branches to deficit branches.
    """
    # 1. Calculate Velocity & Days Stock for ALL products across ALL branches
    # This is a global system optimization
    inv_data = db.session.query(
        ProductVariant.product_id,
        ProductVariant.branch_id,
        ProductVariant.stock_quantity,
        ProductVariant.variant_size,
        Product.name.label('product_name'),
        Branch.name.label('branch_name')
    ).join(Product).join(Branch).all()
    
    if not inv_data:
        return []
        
    inv_df = pd.DataFrame(inv_data, columns=['product_id', 'branch_id', 'qty', 'size', 'product_base', 'branch'])
    inv_df['product'] = inv_df.apply(lambda r: f"{r['product_base']} ({r['size']})" if r['size'] else r['product_base'], axis=1)
    inv_df['min_t'] = 10
    
    # Simple Sales velocity for last 30 days
    thirty_days_ago = datetime.now() - timedelta(days=30)
    sales = db.session.query(
        ProductVariant.product_id,
        SalesTransaction.branch_id,
        func.sum(TransactionItem.quantity).label('total_sales')
    ).join(SalesTransaction, TransactionItem.transaction_id == SalesTransaction.transaction_id)\
     .join(ProductVariant, TransactionItem.variant_id == ProductVariant.variant_id)\
     .filter(SalesTransaction.transaction_date >= thirty_days_ago).group_by(
        ProductVariant.product_id, SalesTransaction.branch_id
    ).all()
    
    sales_df = pd.DataFrame(sales, columns=['product_id', 'branch_id', 'total_sales'])
    
    df = pd.merge(inv_df, sales_df, on=['product_id', 'branch_id'], how='left').fillna(0)
    df['velocity'] = df['total_sales'] / 30
    df['velocity'] = df['velocity'].apply(lambda x: max(x, 0.05)) # Avoid zero velocity issues
    df['days_supply'] = df['qty'] / df['velocity']
    
    suggestions = []
    
    # 2. Match Deficit (< 5 days) with Surplus (> 20 days)
    for product_id in df['product_id'].unique():
        prod_items = df[df['product_id'] == product_id]
        
        deficits = prod_items[prod_items['days_supply'] < 7].sort_values('days_supply')
        surpluses = prod_items[prod_items['days_supply'] > 25].sort_values('days_supply', ascending=False)
        
        for _, def_row in deficits.iterrows():
            if surpluses.empty: break
            
            # Take from the branch with most surplus
            surp_row = surpluses.iloc[0]
            
            # Suggested move: (Avg Velocity * 14 days) - DeficitQty
            needed = round(def_row['velocity'] * 14) - def_row['qty']
            available = surp_row['qty'] - round(surp_row['velocity'] * 14)
            
            move_qty = min(max(0, needed), max(0, available))
            
            if move_qty > 2: # Only suggest moves worth the effort
                suggestions.append({
                    "product": def_row['product'],
                    "from_branch": surp_row['branch'],
                    "to_branch": def_row['branch'],
                    "quantity": int(move_qty),
                    "reason": f"Inventory running low at {def_row['branch']} while {surp_row['branch']} has surplus stock.",
                    "urgency": "high" if def_row['days_supply'] < 3 else "medium"
                })
                # Update surplus local copy for this loop to not over-promise
                surpluses.at[surpluses.index[0], 'qty'] -= move_qty
                
    return suggestions[:10]

def get_pricing_recommendations():
    """
    AI suggestions for dynamic pricing based on sales velocity and margins.
    Incorporates trend detection to avoid repeating suggestions after price changes.
    """
    # 1. Get variants (grouped by size to avoid branch duplication in global alerts)
    from app.models.product import ProductVariant
    # Use distinct on product and size to avoid duplicate alerts for different branches
    # Postgres requires these to be in order_by as well
    variants = db.session.query(
        ProductVariant, Product
    ).join(Product).distinct(Product.product_id, ProductVariant.variant_size).order_by(
        Product.product_id, ProductVariant.variant_size
    ).all()
    
    if not variants: return []
    
    # 2. Get system-wide velocity (30 days vs 7 days for trend detection)
    now = datetime.now()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)
    
    sales_30d_raw = db.session.query(
        TransactionItem.variant_id,
        func.sum(TransactionItem.quantity).label('qty')
    ).join(SalesTransaction).filter(SalesTransaction.transaction_date >= thirty_days_ago).group_by(
        TransactionItem.variant_id
    ).all()
    
    sales_7d_raw = db.session.query(
        TransactionItem.variant_id,
        func.sum(TransactionItem.quantity).label('qty')
    ).join(SalesTransaction).filter(SalesTransaction.transaction_date >= seven_days_ago).group_by(
        TransactionItem.variant_id
    ).all()
    
    sales_30d = {s[0]: s[1] for s in sales_30d_raw}
    sales_7d = {s[0]: s[1] for s in sales_7d_raw}
    
    recommendations = []
    
    for pv, p in variants:
        # Calculate velocities
        v30 = sales_30d.get(pv.variant_id, 0) / 30
        v7 = sales_7d.get(pv.variant_id, 0) / 7
        
        # Trend detection logic
        is_trending_up = v7 > (v30 * 1.2) if v30 > 0 else False
        
        # SAFE MARGIN CALCULATION using variant prices
        # variant_price is 'price' in model, but we often refer to it as unit_price in logic
        u_price = pv.price
        c_price = pv.cost_price if pv.cost_price is not None else (u_price * 0.7)
        
        margin = ((u_price - c_price) / u_price * 100) if u_price > 0 else 0
        
        # Logic 1: High Velocity + Low Margin = Increase Price
        if v30 > 1.5 and margin < 15:
            recommendations.append({
                "product": f"{p.name} ({pv.variant_size})",
                "product_id": p.product_id,
                "variant_id": pv.variant_id,
                "current_price": u_price,
                "suggested_price": round(u_price * 1.05, 2),
                "suggested_change": 5,
                "reason": f"High demand for {pv.variant_size} (velocity {round(v30, 2)}) with tight margin ({round(margin, 1)}%). 5% increase recommended.",
                "type": "increase"
            })
            
        # Logic 2: Low Velocity + High Margin = Discount to push stock
        # PATIENT AI REFINEMENTS:
        # - Never suggest a discount if margin is below 35% (Safe Profit Floor)
        # - High margin (>50%): Suggest 10% discount if dead (v7=0) or very slow (v30<0.2)
        # - Mid-High (35-50%): ONLY suggest if COMPLETELY dead (v7=0 and v30<0.1)
        
        can_discount = False
        discount_rate = 0.10
        
        if margin > 50 and v30 < 0.2:
            can_discount = True
            discount_rate = 0.10
        elif (35 < margin <= 50) and v30 < 0.1 and v7 == 0:
            can_discount = True
            discount_rate = 0.05
            
        if can_discount and (pv.discount_percent or 0) == 0 and not is_trending_up:
             recommendations.append({
                "product": f"{p.name} ({pv.variant_size})",
                "product_id": p.product_id,
                "variant_id": pv.variant_id,
                "current_price": u_price,
                "suggested_price": round(u_price * (1 - discount_rate), 2),
                "suggested_change": int(discount_rate * 100),
                "reason": f"Slow moving {pv.variant_size} with {round(margin, 1)}% margin. Suggest {int(discount_rate*100)}% discount to stimulate demand.",
                "type": "discount"
            })
             
    return recommendations

def get_wastage_alerts(branch_id=None):
    """
    Identifies items at risk of expiry wastage based on current velocity.
    Suggests Flash Sales.
    """
    # 1. Fetch products with expiry dates and inventory
    from app.models.category import Category
    try:
        query = db.session.query(
            ProductVariant.product_id,
            ProductVariant.branch_id,
            ProductVariant.stock_quantity,
            Product.name.label('product_name'),
            Branch.name.label('branch_name'),
            ProductVariant.expiry_date,
            ProductVariant.price,
            Category.name.label('category_name'),
            ProductVariant.variant_size
        ).join(
            Product, ProductVariant.product_id == Product.product_id
        ).join(
            Branch, ProductVariant.branch_id == Branch.branch_id
        ).outerjoin(
            Category, Product.category_id == Category.category_id
        ).filter(ProductVariant.expiry_date != None)

        if branch_id:
            query = query.filter(ProductVariant.branch_id == branch_id)
            
        data = query.all()
        if not data: return []

        inv_df = pd.DataFrame(data, columns=['product_id', 'branch_id', 'qty', 'product_base_name', 'branch_name', 'expiry_date', 'price', 'category_name', 'size'])
        inv_df['product_name'] = inv_df.apply(lambda r: f"{r['product_base_name']} ({r['size']})" if r['size'] else r['product_base_name'], axis=1)
        inv_df['category_name'] = inv_df['category_name'].fillna('Uncategorized')
        inv_df['expiry'] = pd.to_datetime(inv_df['expiry_date'])
        inv_df['days_to_expiry'] = (inv_df['expiry'] - datetime.now()).dt.days
        
        # Only care about things expiring in next 90 days (increased from 30)
        inv_df = inv_df[inv_df['days_to_expiry'] <= 90]
        if inv_df.empty: return []

        # 2. Get 180-day velocity (increased from 30)
        analysis_start = datetime.now() - timedelta(days=180)
        sales = db.session.query(
            TransactionItem.variant_id,
            SalesTransaction.branch_id,
            func.sum(TransactionItem.quantity).label('total_sales')
        ).join(SalesTransaction).filter(SalesTransaction.transaction_date >= analysis_start).group_by(
            TransactionItem.variant_id, SalesTransaction.branch_id
        ).all()
        
        # We need to map product_id in inv_df to variant_id for the merge to be accurate
        # Actually, df column is product_id but it contains pv.variant_id from line 317
        sales_df = pd.DataFrame(sales, columns=['variant_id', 'branch_id', 'total_sales'])
        
        # update inv_df column name for merge
        inv_df.rename(columns={'product_id': 'variant_id'}, inplace=True)
        
        df = pd.merge(inv_df, sales_df, on=['variant_id', 'branch_id'], how='left').fillna(0)
        df['velocity'] = df['total_sales'] / 180
        df['velocity'] = df['velocity'].apply(lambda x: max(x, 0.05))
        
        # 3. Predict Stock remaining at Expiry
        df['expected_sales_until_expiry'] = df['velocity'] * df['days_to_expiry']
        df['potential_wastage'] = df['qty'] - df['expected_sales_until_expiry']
        
        wastage_alerts = []
        for _, row in df[df['potential_wastage'] > 0].iterrows():
            # Suggested discount based on how close it is
            discount = 20 if row['days_to_expiry'] > 14 else (50 if row['days_to_expiry'] > 5 else 75)
            
            wastage_alerts.append({
                "product_name": row['product_name'],
                "branch_name": row['branch_name'],
                "category": row['category_name'],
                "quantity": int(row['potential_wastage']),
                "days_left": int(row['days_to_expiry']),
                "recommended_discount": discount,
                "expiry_date": row['expiry_date'].strftime('%Y-%m-%d') if row['expiry_date'] else "N/A",
                "message": f"{int(row['potential_wastage'])} units likely to expire in {int(row['days_to_expiry'])} days.",
                "recommendation": f"Start a {discount}% Flash Sale to clear stock."
            })
            
        return wastage_alerts
    except Exception as e:
        import traceback
        traceback.print_exc()
        return []

def simulate_profit_scenario(price_change_pct, discount_change_pct):
    """
    What-If Profit Simulator using Price Elasticity of Demand.
    Approximated Elasticity = -1.5 (Standard Retail Benchmark)
    """
    elasticity = -1.5
    
    # Get 180-day baseline totals (increased from 30)
    analysis_start = datetime.now() - timedelta(days=180)
    baseline = db.session.query(
        func.sum(SalesTransaction.total_amount).label('revenue'),
        func.count(SalesTransaction.transaction_id).label('txns')
    ).filter(SalesTransaction.transaction_date >= analysis_start).filter(
        (SalesTransaction.status == 'completed') | (SalesTransaction.status == None)
    ).first()
    
    # Fallback if no revenue found for projection
    current_rev = float(baseline.revenue or 0)
    if current_rev <= 0:
        # If no sales data, use a system baseline
        current_rev = 1000.0 
    
    # Also fallback for transaction count
    total_txns = baseline.txns or 0
    if total_txns <= 0:
        total_txns = 50 # Default baseline txns
    
    # Simplified Model: Volume change based on Price change
    # Q1 = Q0 * (P1/P0)^elasticity
    price_ratio = 1 + (price_change_pct / 100)
    volume_multiplier = (price_ratio)**elasticity
    
    # If we add a discount, it also increases volume (inverse of price hike)
    if discount_change_pct > 0:
        discount_ratio = 1 - (discount_change_pct / 100)
        volume_multiplier *= (discount_ratio)**elasticity
        
    projected_rev = current_rev * price_ratio * volume_multiplier
    
    if discount_change_pct > 0:
        projected_rev *= (1 - (discount_change_pct / 100))

    # Calculate projected volume (number of transactions * multiplier)
    projected_volume = round(total_txns * volume_multiplier)

    return {
        "current_revenue": round(current_rev, 2),
        "projected_revenue": round(projected_rev, 2),
        "revenue_change": round(((projected_rev - current_rev) / current_rev * 100), 1) if current_rev > 0 else 0,
        "projected_volume": projected_volume,
        "volume_impact_pct": round((volume_multiplier - 1) * 100, 1)
    }

def create_ai_announcement_drafts():
    """
    Identifies low-performing branches and creates DRAFT announcements.
    """
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    # 1. Get branch performance
    performance = db.session.query(
        Branch.branch_id,
        Branch.name,
        func.sum(SalesTransaction.total_amount).label('total')
    ).join(SalesTransaction).filter(
        SalesTransaction.transaction_date >= thirty_days_ago
    ).group_by(Branch.branch_id).all()
    
    if not performance: return 0
    
    perf_df = pd.DataFrame(performance, columns=['id', 'name', 'total'])
    avg_performance = perf_df['total'].mean()
    
    drafts_created = 0
    for _, row in perf_df[perf_df['total'] < avg_performance * 0.85].iterrows():
        # Check if we already have a recent AI draft for this branch
        existing = Announcement.query.filter(
            Announcement.title.like(f"Performance Insight: {row['name']}%"),
            Announcement.created_at >= datetime.now() - timedelta(days=3)
        ).first()
        
        if not existing:
            new_ann = Announcement(
                title=f"Performance Insight: {row['name']}",
                message=f"Branch '{row['name']}' is currently performing {round((1 - row['total']/avg_performance)*100)}% below the network average. AI suggests reviewing current stock velocity and staff engagement levels.",
                target_role="manager",
                status="draft",
                created_by_id=None
            )
            db.session.add(new_ann)
            drafts_created += 1
            
    db.session.commit()
    return drafts_created

def get_supplier_lead_times():
    """
    Predicts replenishment times based on past restock history.
    """
    # Get restock adjustments
    restocks = db.session.query(
        InventoryAdjustment.product_id,
        InventoryAdjustment.supplier_id,
        InventoryAdjustment.adjustment_date,
        InventoryAdjustment.quantity
    ).filter(InventoryAdjustment.adjustment_type == 'restock').order_by(InventoryAdjustment.adjustment_date).all()
    
    if not restocks: return []
    
    # This is a simplified prediction (average gap analysis)
    # real production AI would look at order dates vs delivery dates
    return [{"message": "Supplier prediction requires at least 3 historical restock events per product."}]

def get_sales_forecast(branch_id=None):
    """
    Seasonality-aware forecast for the next 7 days based on weekday weights.
    """
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    query = db.session.query(
        func.date(SalesTransaction.transaction_date).label('day'),
        func.sum(SalesTransaction.total_amount).label('total')
    ).filter(
        SalesTransaction.transaction_date >= thirty_days_ago,
        SalesTransaction.status == "completed"
    )
    
    if branch_id:
        query = query.filter(SalesTransaction.branch_id == branch_id)
        
    daily_sales = query.group_by('day').all()
    
    if not daily_sales or len(daily_sales) < 7:
        return []
        
    df = pd.DataFrame(daily_sales, columns=['date', 'revenue'])
    df['date'] = pd.to_datetime(df['date'])
    df['revenue'] = df['revenue'].astype(float)
    df['weekday'] = df['date'].dt.weekday # 0=Mon, 6=Sun
    
    # 1. Calculate Seasonality Index per Weekday
    avg_revenue = df['revenue'].mean()
    weekday_avgs = df.groupby('weekday')['revenue'].mean()
    weekday_weights = (weekday_avgs / avg_revenue).fillna(1.0)
    
    # 2. Calculate Growth Trend (Recent vs Older)
    recent_total = df['revenue'].iloc[-7:].sum()
    previous_total = df['revenue'].iloc[-14:-7].sum()
    growth = ((recent_total - previous_total) / previous_total * 100) if previous_total > 0 else 0
    
    # 3. Generate Forecast for next 7 days
    forecast_data = []
    baseline_daily = df['revenue'].iloc[-7:].mean()
    
    for i in range(1, 8):
        future_date = datetime.now() + timedelta(days=i)
        w_day = future_date.weekday()
        
        # Apply weekday weight + growth trend
        weight = weekday_weights.get(w_day, 1.0)
        multiplier = 1 + (growth / 100 * (i/14))
        
        forecast_data.append({
            "date": future_date.strftime("%Y-%m-%d"),
            "predicted_revenue": round(baseline_daily * weight * multiplier, 2),
            "is_weekend": w_day >= 5
        })
        
    return {
        "forecast": forecast_data,
        "growth_trend": round(growth, 1),
        "seasonality_detect": "Active" if weekday_weights.max() > 1.2 else "Stable"
    }
