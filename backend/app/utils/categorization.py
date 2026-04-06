from app.models.category import Category
import re

def predict_category(product_name):
    """
    Predicts the best category for a new product name based on keywords.
    """
    categories = Category.query.all()
    if not categories:
        return None
        
    # Keyword mapping for more accurate results
    keyword_map = {
        "Electronics": ["phone", "laptop", "pc", "mobile", "monitor", "headphone", "tablet", "watch", "camera"],
        "Home Appliances": ["microwave", "fridge", "oven", "tv", "iron", "mixer", "heater"],
        "Groceries": ["rice", "flour", "sugar", "oil", "noodle", "biscuit", "tea", "coffee", "milk"],
        "Personal Care": ["soap", "shampoo", "cream", "paste", "brush", "deodorant", "oil", "perfume"],
        "Beverages": ["coke", "pepsi", "juice", "water", "soda", "drink", "energy"],
        "Clothing": ["shirt", "pant", "jeans", "top", "dress", "socks", "cap"]
    }
    
    product_name_lower = product_name.lower()
    
    # 1. Check direct matches with keywords
    for cat_name, keywords in keyword_map.items():
        if any(kw in product_name_lower for kw in keywords):
            # Find the category object that matches this name
            match = next((c for c in categories if c.name.lower() == cat_name.lower()), None)
            if match:
                return {
                    "category_id": match.category_id,
                    "name": match.name,
                    "confidence": 0.85
                }
                
    # 2. Check direct substring matches with Category names
    for cat in categories:
        if cat.name.lower() in product_name_lower or product_name_lower in cat.name.lower():
            return {
                "category_id": cat.category_id,
                "name": cat.name,
                "confidence": 0.70
            }
            
    # 3. Default to the first category if no match
    return {
        "category_id": categories[0].category_id,
        "name": categories[0].name,
        "confidence": 0.30
    }
