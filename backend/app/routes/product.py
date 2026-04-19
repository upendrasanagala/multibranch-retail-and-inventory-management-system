"""
Product Routes
CRUD operations for products with filtering and pagination
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.product import Product
from app.models.category import Category
from app.utils.decorators import roles_required
from app.routes import product_bp
from app.utils.categorization import predict_category
import math 


@product_bp.route("/", methods=["GET"])
@jwt_required()
def get_products():
    from app.models.product import ProductVariant
    from app.models.category import Category
    from sqlalchemy import func
    
    # Query parameters for filtering
    category_id = request.args.get("category_id", type=int)
    search = request.args.get("search", "")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    branch_id = request.args.get("branch_id", type=int)
    
    # Base query
    if branch_id:
        # Branch-specific view: no aggregation needed
        query = db.session.query(ProductVariant, Product).join(Product, ProductVariant.product_id == Product.product_id)
        query = query.filter(ProductVariant.branch_id == branch_id)
    else:
        # Global view: aggregate by product + variant size
        query = db.session.query(
            Product,
            func.min(ProductVariant.variant_id).label("variant_id"),
            func.sum(ProductVariant.stock_quantity).label("total_stock"),
            ProductVariant.variant_size.label("size"),
            func.min(ProductVariant.sku_code).label("sku"),
            func.min(ProductVariant.barcode).label("barcode"),
            func.max(ProductVariant.price).label("unit_price"),
            func.max(ProductVariant.cost_price).label("cost_price"),
            func.max(ProductVariant.discount_percent).label("discount_percent"),
            func.max(ProductVariant.gst_percent).label("gst_percent"),
            func.bool_or(ProductVariant.is_b1g1).label("is_b1g1"),
            func.min(ProductVariant.mfg_date).label("mfg_date"),
            func.min(ProductVariant.expiry_date).label("expiry_date"),
            # Count branches with low stock for this specific variant
            func.count(ProductVariant.variant_id).filter(ProductVariant.stock_quantity <= ProductVariant.min_threshold).label("low_stock_branches")
        ).join(ProductVariant, Product.product_id == ProductVariant.product_id)
        
    # Apply global filters
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    if search:
        if branch_id:
            query = query.filter(
                (Product.name.ilike(f"%{search}%")) |
                (ProductVariant.sku_code.ilike(f"%{search}%")) |
                (ProductVariant.barcode.ilike(f"%{search}%"))
            )
        else:
            query = query.filter(
                (Product.name.ilike(f"%{search}%")) |
                (ProductVariant.sku_code.ilike(f"%{search}%"))
            )
    
    if not branch_id:
        query = query.group_by(Product.product_id, ProductVariant.variant_size)

    # Pagination
    if branch_id:
        paginated = query.order_by(Product.name, ProductVariant.variant_size).paginate(page=page, per_page=per_page, error_out=False)
    else:
        paginated = query.order_by(Product.name, "size").paginate(page=page, per_page=per_page, error_out=False)
    
    from app.models.supplier import Supplier
    products = []
    if branch_id:
        for pv, p in paginated.items:
            cat = Category.query.get(p.category_id) if p.category_id else None
            supp = Supplier.query.get(p.supplier_id) if p.supplier_id else None
            products.append({
                "product_id": p.product_id,
                "variant_id": pv.variant_id,
                "name": p.name,
                "sku": pv.sku_code,
                "barcode": pv.barcode,
                "category_id": p.category_id,
                "category": {"name": cat.name} if cat else None,
                "supplier_name": supp.name if supp else None,
                "unit_price": pv.price,
                "cost_price": pv.cost_price,
                "discount_percent": pv.discount_percent,
                "gst_percent": pv.gst_percent,
                "unit": p.unit,
                "size": pv.variant_size,
                "total_stock": pv.stock_quantity,
                "branch_id": pv.branch_id,
                "is_b1g1": pv.is_b1g1,
                "mfg_date": pv.mfg_date.isoformat() if pv.mfg_date else None,
                "expiry_date": pv.expiry_date.isoformat() if pv.expiry_date else None,
                "low_stock_branches": 1 if pv.stock_quantity <= pv.min_threshold else 0
            })
    else:
        for row in paginated.items:
            p = row[0]
            cat = Category.query.get(p.category_id) if p.category_id else None
            supp = Supplier.query.get(p.supplier_id) if p.supplier_id else None
            products.append({
                "product_id": p.product_id,
                "variant_id": row.variant_id,
                "name": p.name,
                "sku": row.sku,
                "barcode": row.barcode,
                "category_id": p.category_id,
                "category": {"name": cat.name} if cat else None,
                "supplier_name": supp.name if supp else None,
                "unit_price": row.unit_price,
                "cost_price": row.cost_price,
                "discount_percent": row.discount_percent,
                "gst_percent": row.gst_percent,
                "unit": p.unit,
                "size": row.size,
                "total_stock": float(row.total_stock) if row.total_stock else 0,
                "is_b1g1": bool(row.is_b1g1),
                "mfg_date": row.mfg_date.isoformat() if row.mfg_date else None,
                "expiry_date": row.expiry_date.isoformat() if row.expiry_date else None,
                "low_stock_branches": row.low_stock_branches
            })
    
    return jsonify({
        "products": products,
        "total": paginated.total,
        "pages": paginated.pages,
        "current_page": page
    }), 200




# =============================
# Get Single Product
# =============================
@product_bp.route("/<int:product_id>", methods=["GET"])
@jwt_required()
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    
    return jsonify({
        "product_id": product.product_id,
        "name": product.name,
        "sku": product.sku,
        "barcode": product.barcode,
        "category_id": product.category_id,
        "description": product.description,
        "unit_price": product.unit_price,
        "cost_price": product.cost_price if product.cost_price is not None and not (isinstance(product.cost_price, float) and math.isnan(product.cost_price)) else None,
        "unit": product.unit,
        "size": product.size,
        "image_path": product.image_path,
        "is_b1g1": product.is_b1g1,
        "discount_percent": product.discount_percent,
        "gst_percent": product.gst_percent,
        "mfg_date": product.mfg_date.isoformat() if product.mfg_date else None,
        "expiry_date": product.expiry_date.isoformat() if product.expiry_date else None,
        "supplier_id": product.supplier_id,
        "created_at": product.created_at.isoformat() if product.created_at else None
    }), 200


# =============================
# Get Product Inventory Across Branches
# =============================
@product_bp.route("/<int:product_id>/inventory", methods=["GET"])
@jwt_required()
def get_product_inventory_branches(product_id):
    from app.models.product import ProductVariant
    from app.models.branch import Branch
    
    product = Product.query.get_or_404(product_id)
    # Get all variants for this product across all branches
    variants = db.session.query(
        ProductVariant, Branch.name.label("branch_name")
    ).join(
        Branch, ProductVariant.branch_id == Branch.branch_id
    ).filter(
        ProductVariant.product_id == product_id
    ).all()
    
    distribution = [{
        "variant_id": v.variant_id,
        "branch_id": v.branch_id,
        "branch_name": branch_name,
        "quantity": v.stock_quantity,
        "size": v.variant_size,
        "sku": v.sku_code
    } for v, branch_name in variants]
    
    return jsonify({
        "product_id": product.product_id,
        "product_name": product.name,
        "inventory": distribution
    }), 200



# =============================
# Predict Category (AI)
# =============================
@product_bp.route("/predict-category", methods=["POST"])
@jwt_required()
def get_predicted_category():
    data = request.get_json() or {}
    product_name = data.get("name")
    
    if not product_name:
        return jsonify({"message": "Product name is required"}), 400
        
    prediction = predict_category(product_name)
    return jsonify(prediction), 200


# =============================
# Create Product (Admin/Manager)
# =============================
@product_bp.route("/", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager")
def create_product():
    from app.models.product import ProductVariant
    from app.models.branch import Branch
    import uuid
    from datetime import datetime
    try:
        data = request.get_json() or {}

        name = data.get("name")
        unit_price = data.get("unit_price")
        category_id = data.get("category_id")
        supplier_id = data.get("supplier_id")
    
        if not name or unit_price is None or not category_id or not supplier_id:
            return jsonify({"message": "Name, Price, Category, and Supplier are required"}), 400
        
        # Check if master product already exists with same name
        product = Product.query.filter_by(name=name).first()
        if not product:
            product = Product(
                name=name,
                category_id=category_id,
                description=data.get("description"),
                unit=data.get("unit"),
                image_path=data.get("image_path"),
                supplier_id=supplier_id
            )
            db.session.add(product)
            db.session.flush() # Get product_id
        
        # Create Variants for each branch
        branches = Branch.query.all()
        branch_quantities = data.get("branch_quantities") or {}
        
        mfg_date_val = None
        if data.get("mfg_date"):
            try: mfg_date_val = datetime.strptime(data.get("mfg_date"), '%Y-%m-%d').date()
            except: pass

        expiry_date_val = None
        if data.get("expiry_date"):
            try: expiry_date_val = datetime.strptime(data.get("expiry_date"), '%Y-%m-%d').date()
            except: pass

        sku_val = data.get("sku")
        base_sku = sku_val if (sku_val and sku_val.lower() != 'nan') else f"PROD-{str(uuid.uuid4())[:8].upper()}"
        
        for branch in branches:
            qty = branch_quantities.get(str(branch.branch_id), data.get("initial_quantity", 0))
            try: qty = float(qty)
            except: qty = 0.0

            variant = ProductVariant(
                product_id=product.product_id,
                branch_id=branch.branch_id,
                variant_size=data.get("size"),
                sku_code=f"{base_sku}-{branch.branch_id}",
                barcode=data.get("barcode"),
                stock_quantity=qty,
                price=unit_price,
                cost_price=data.get("cost_price") or (float(unit_price) * 0.7),
                discount_percent=data.get("discount_percent", 0.0),
                gst_percent=data.get("gst_percent", 0.0),
                mfg_date=mfg_date_val,
                expiry_date=expiry_date_val,
                is_b1g1=data.get("is_b1g1", False)
            )
            db.session.add(variant)
        
        db.session.commit()
        
        return jsonify({
            "message": "Product and variants created successfully",
            "product_id": product.product_id,
            "sku": base_sku
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Server Error: {str(e)}"}), 500



# =============================
# Update Product (Admin/Manager)
# =============================
@product_bp.route("/<int:variant_id>", methods=["PUT"])
@jwt_required()
@roles_required("admin", "manager")
def update_product_variant(variant_id):
    from app.models.product import ProductVariant
    variant = ProductVariant.query.get_or_404(variant_id)
    product = Product.query.get(variant.product_id)
    data = request.get_json() or {}
    
    # Update Variant-specific info
    variant.variant_size = data.get("size", variant.variant_size)
    variant.price = data.get("unit_price", variant.price)
    variant.cost_price = data.get("cost_price", variant.cost_price)
    variant.sku_code = data.get("sku", variant.sku_code)
    variant.barcode = data.get("barcode", variant.barcode)
    variant.discount_percent = data.get("discount_percent", variant.discount_percent)
    variant.gst_percent = data.get("gst_percent", variant.gst_percent)
    variant.is_b1g1 = data.get("is_b1g1", variant.is_b1g1)
    
    from datetime import datetime
    if data.get("mfg_date"):
        try: variant.mfg_date = datetime.strptime(data.get("mfg_date"), '%Y-%m-%d').date()
        except: pass
    if "expiry_date" in data:
        try: variant.expiry_date = datetime.strptime(data.get("expiry_date"), '%Y-%m-%d').date() if data.get("expiry_date") else None
        except: pass
        
    # Update Product-wide info
    product.name = data.get("name", product.name)
    product.category_id = data.get("category_id", product.category_id)
    product.description = data.get("description", product.description)
    product.unit = data.get("unit", product.unit)
    product.supplier_id = data.get("supplier_id", product.supplier_id)
    
    db.session.commit()
    return jsonify({"message": "Variant updated successfully"}), 200


# =============================
# Return to Retailer (Admin/Manager)
# =============================
@product_bp.route("/return", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager")
def return_to_retailer():
    from app.models.product import ProductVariant
    from app.models.adjustment import InventoryAdjustment
    from flask_jwt_extended import get_jwt_identity
    
    data = request.get_json() or {}
    variant_id = data.get("variant_id") or data.get("product_id") # Back-compat
    branch_id = data.get("branch_id")
    quantity = data.get("quantity")
    reason = data.get("reason", "Returned to Retailer (Expired)")
    
    if not all([variant_id, branch_id, quantity]):
        return jsonify({"message": "Variant ID, Branch ID, and Quantity are required"}), 400
        
    variant = ProductVariant.query.get(variant_id)
    if not variant:
        # Fallback to finding variant by product_id and branch_id
        variant = ProductVariant.query.filter_by(product_id=variant_id, branch_id=branch_id).first()
        
    if not variant or variant.stock_quantity < float(quantity):
        return jsonify({"message": "Insufficient stock in branch variant"}), 400
        
    # Deduct stock
    variant.stock_quantity -= float(quantity)
    
    # Record adjustment
    user_id = get_jwt_identity()
    adjustment = InventoryAdjustment(
        variant_id=variant.variant_id,
        branch_id=branch_id,
        adjustment_type="Return to Supplier",
        quantity=float(quantity),
        reason=reason,
        adjusted_by=user_id,
        supplier_id=data.get("supplier_id")
    )
    db.session.add(adjustment)
    db.session.commit()
    
    return jsonify({"message": "Stock returned to retailer successfully"}), 200


# =============================
# Delete Product (Admin Only)
# =============================
@product_bp.route("/<int:variant_id>", methods=["DELETE"])
@jwt_required()
@roles_required("admin")
def delete_product_variant(variant_id):
    from app.models.product import ProductVariant
    variant = ProductVariant.query.get_or_404(variant_id)
    
    # Check if this is the last variant of the parent product
    remaining_variants = ProductVariant.query.filter(
        ProductVariant.product_id == variant.product_id,
        ProductVariant.variant_id != variant_id
    ).count()
    
    db.session.delete(variant)
    
    # If no variants left, delete the parent product too
    if remaining_variants == 0:
        product = Product.query.get(variant.product_id)
        if product:
             db.session.delete(product)
             
    db.session.commit()
    return jsonify({"message": "Variant deleted successfully"}), 200


# =============================
# Bulk Delete Variants (Admin Only)
# =============================
@product_bp.route("/bulk", methods=["DELETE"])
@jwt_required()
@roles_required("admin")
def delete_bulk_variants():
    data = request.get_json() or {}
    variant_ids = data.get("variant_ids", [])
    
    if not variant_ids or not isinstance(variant_ids, list):
        return jsonify({"message": "No variant IDs provided"}), 400
        
    from app.models.product import ProductVariant, Product
    from app.models.sales import TransactionItem
    from app.models.stock_transfer import StockTransfer
    from app.models.adjustment import InventoryAdjustment
    
    # Get product IDs before deleting variants (to check for cleanup later)
    product_ids = [v.product_id for v in ProductVariant.query.filter(ProductVariant.variant_id.in_(variant_ids)).all()]
    product_ids = list(set(product_ids)) # Unique list

    # Batch delete related records
    TransactionItem.query.filter(TransactionItem.variant_id.in_(variant_ids)).delete(synchronize_session=False)
    StockTransfer.query.filter(StockTransfer.variant_id.in_(variant_ids)).delete(synchronize_session=False)
    InventoryAdjustment.query.filter(InventoryAdjustment.variant_id.in_(variant_ids)).delete(synchronize_session=False)
    
    # Delete variants
    ProductVariant.query.filter(ProductVariant.variant_id.in_(variant_ids)).delete(synchronize_session=False)
    db.session.commit()

    # Cleanup parent products that have zero variants left
    for p_id in product_ids:
        remaining = ProductVariant.query.filter(ProductVariant.product_id == p_id).count()
        if remaining == 0:
            p = Product.query.get(p_id)
            if p: db.session.delete(p)
    
    db.session.commit()
    return jsonify({"message": f"Successfully deleted {len(variant_ids)} variants"}), 200

# =============================
# Import Products from Excel
# =============================
def normalize_size(s):
    if not s or not isinstance(s, str): return ""
    return "".join(s.lower().split())

def parse_date(date_val):
    from datetime import datetime
    import pandas as pd
    if pd.isna(date_val) or not str(date_val).strip() or str(date_val).lower() == 'nan':
        return None
    # Try common formats
    for fmt in ('%d-%m-%Y', '%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y'):
        try:
            return datetime.strptime(str(date_val).strip(), fmt).date()
        except:
            continue
    # Ultimate fallback to pandas smart parsing
    try:
        dt = pd.to_datetime(date_val, dayfirst=True, errors='coerce')
        return dt.date() if pd.notnull(dt) else None
    except:
        return None

@product_bp.route("/import", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager")
def import_products():
    mode = request.args.get("mode", "add") # 'add' or 'sync'
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400
    
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls') or file.filename.endswith('.csv')):
        return jsonify({"message": "Invalid file type. Please upload Excel or CSV."}), 400

    try:
        import os
        from datetime import datetime
        import pandas as pd
        import uuid
        
        upload_folder = os.path.join(os.getcwd(), 'uploads', 'imports')
        os.makedirs(upload_folder, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = "".join([c for c in file.filename if c.isalnum() or c in (' ', '.', '_')]).strip()
        file_path = os.path.join(upload_folder, f"{timestamp}_{safe_filename}")
        file.save(file_path)
        
        df = pd.read_csv(file_path) if file_path.endswith('.csv') else pd.read_excel(file_path)
        df.columns = [c.lower().strip() for c in df.columns]
        df.dropna(how='all', inplace=True)
        
        required_cols = ['name', 'price', 'category']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            return jsonify({"message": f"Missing required columns: {', '.join(missing_cols)}"}), 400

        from app.models.category import Category
        from app.models.product import Product, ProductVariant
        from app.models.branch import Branch
        from app.models.supplier import Supplier

        success_count = 0
        updated_count = 0
        skipped_count = 0
        errors = []
        
        branches = Branch.query.all()
        categories = {c.name.lower(): c.category_id for c in Category.query.all()}
        suppliers = {s.name.lower(): s.supplier_id for s in Supplier.query.all()}
        
        # Ensure a default supplier exists
        default_supp_name = "Generic Supplier"
        default_supp_id = suppliers.get(default_supp_name.lower())
        if not default_supp_id:
            gen_supp = Supplier(name=default_supp_name)
            db.session.add(gen_supp)
            db.session.flush()
            default_supp_id = gen_supp.supplier_id
            suppliers[default_supp_name.lower()] = default_supp_id

        for index, row in df.iterrows():
            try:
                name = str(row['name']).strip()
                # Flexible column matching
                size_str = str(row.get('size') or row.get('variant_size') or '').strip()
                sku_val = str(row.get('sku') or row.get('variant_sku') or '').strip()
                
                # Flexible price/cost matching
                price_val = row.get('price') or row.get('unit_price') or row.get('sale_price') or row.get('mrp', 0)
                price = float(price_val) if pd.notna(price_val) else 0.0

                cost_val = row.get('cost_price') or row.get('purchase_price') or (price * 0.7)
                cost_price = float(cost_val) if pd.notna(cost_val) else (price * 0.7)
                
                cat_name = str(row.get('category') or row.get('category_name') or 'General').strip()
                cat_id = categories.get(cat_name.lower())
                if not cat_id:
                    new_cat = Category(name=cat_name)
                    db.session.add(new_cat)
                    db.session.flush()
                    cat_id = new_cat.category_id
                    categories[cat_name.lower()] = cat_id

                supp_name = str(row.get('supplier', '')).strip()
                if supp_name:
                    supp_id = suppliers.get(supp_name.lower())
                    if not supp_id:
                        new_supp = Supplier(name=supp_name)
                        db.session.add(new_supp)
                        db.session.flush()
                        supp_id = new_supp.supplier_id
                        suppliers[supp_name.lower()] = supp_id
                else:
                    supp_id = default_supp_id

                # Find Master Product
                product = Product.query.filter_by(name=name).first()
                if not product:
                    product = Product(
                        name=name,
                        category_id=cat_id,
                        supplier_id=supp_id,
                        unit=str(row.get('unit', 'pcs')),
                        description=str(row.get('description', ''))
                    )
                    db.session.add(product)
                    db.session.flush()
                
                # Check for existing variants of this size across branches
                # If variant_inventory has branch-specific data, we should use it
                branch_col = str(row.get('branch', '')).strip()
                target_branches = branches
                if branch_col:
                    target_branches = [b for b in branches if b.name.lower() == branch_col.lower()]
                    if not target_branches:
                        skipped_count += 1
                        errors.append(f"Row {index+2}: Branch '{branch_col}' not found. Skipping.")
                        continue
                
                norm_size = normalize_size(size_str)
                
                for branch in target_branches:
                    variant = None
                    
                    # 1. Match by SKU first (most accurate)
                    if sku_val:
                        variant = ProductVariant.query.filter_by(sku_code=sku_val).first()
                    
                    # 2. Match by (Product + Size + Branch) fallback
                    if not variant:
                        existing_variants = ProductVariant.query.filter_by(
                            product_id=product.product_id, 
                            branch_id=branch.branch_id
                        ).all()
                        for ev in existing_variants:
                            if normalize_size(ev.variant_size) == norm_size:
                                variant = ev
                                break
                    
                    # Use quantity from row or default to 0
                    qty_val = row.get('quantity') or row.get('stock') or row.get('stock_quantity') or 0
                    try:
                        qty = float(qty_val) if pd.notna(qty_val) else 0.0
                    except:
                        qty = 0.0
                    
                    if variant:
                        variant.price = price
                        variant.cost_price = cost_price
                        # Update dates if present
                        new_mfg = parse_date(row.get('mfg_date') or row.get('manufacturing_date'))
                        if new_mfg: variant.mfg_date = new_mfg
                        new_exp = parse_date(row.get('expiry_date'))
                        if new_exp: variant.expiry_date = new_exp
                        
                        if mode == "sync":
                            variant.stock_quantity = qty
                        else:
                            variant.stock_quantity += qty
                        updated_count += 1
                    else:
                        sku_to_use = sku_val
                        if not sku_to_use:
                            sku_to_use = f"SKU-{str(uuid.uuid4())[:8].upper()}-{branch.branch_id}"
                        
                        variant = ProductVariant(
                            product_id=product.product_id,
                            branch_id=branch.branch_id,
                            variant_size=size_str,
                            sku_code=sku_to_use,
                            barcode=str(row.get('barcode', '')).strip(),
                            stock_quantity=qty,
                            price=price,
                            cost_price=cost_price,
                            mfg_date=parse_date(row.get('mfg_date') or row.get('manufacturing_date')),
                            expiry_date=parse_date(row.get('expiry_date'))
                        )
                        db.session.add(variant)
                        success_count += 1
                
                # Commit every row to handle potential database errors without crashing the whole process
                db.session.commit()
            except Exception as e:
                errors.append(f"Row {index+2}: {str(e)}")
        
        return jsonify({
            "message": "Import completed",
            "created": success_count,
            "updated": updated_count,
            "skipped": skipped_count,
            "errors": errors
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Server Error: {str(e)}"}), 500


# =============================
# Get Import History (Admin)
# =============================
@product_bp.route("/imports", methods=["GET"])
@jwt_required()
@roles_required("admin")
def get_import_history():
    import os
    from datetime import datetime
    
    upload_folder = os.path.join(os.getcwd(), 'uploads', 'imports')
    os.makedirs(upload_folder, exist_ok=True)
    
    files = []
    try:
        for filename in os.listdir(upload_folder):
            file_path = os.path.join(upload_folder, filename)
            if os.path.isfile(file_path):
                stat = os.stat(file_path)
                files.append({
                    "filename": filename,
                    "size": stat.st_size,
                    "uploaded_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        
        # Sort by newest first
        files.sort(key=lambda x: x["uploaded_at"], reverse=True)
        
    except Exception as e:
        return jsonify({"message": f"Failed to list imports: {str(e)}"}), 500
        
    return jsonify({"imports": files}), 200

# =============================
# Delete Import File (Admin)
# =============================
@product_bp.route("/imports/<filename>", methods=["DELETE"])
@jwt_required()
@roles_required("admin")
def delete_import_file(filename):
    import os
    upload_folder = os.path.join(os.getcwd(), 'uploads', 'imports')
    file_path = os.path.join(upload_folder, filename)
    
    # Security: ensure the resolved path is within the upload folder
    real_path = os.path.realpath(file_path)
    real_folder = os.path.realpath(upload_folder)
    if not real_path.startswith(real_folder):
        return jsonify({"message": "Invalid filename"}), 400
    
    if not os.path.exists(file_path):
        return jsonify({"message": "File not found"}), 404
    
    try:
        os.remove(file_path)
        return jsonify({"message": f"File '{filename}' deleted successfully"}), 200
    except Exception as e:
        return jsonify({"message": f"Failed to delete file: {str(e)}"}), 500


# =============================
# Download Import File (Admin)
# =============================
@product_bp.route("/imports/<path:filename>", methods=["GET"])
@jwt_required()
@roles_required("admin")
def download_import_file(filename):
    import os
    from flask import send_from_directory
    
    upload_folder = os.path.join(os.getcwd(), 'uploads', 'imports')
    return send_from_directory(upload_folder, filename, as_attachment=True)

# =============================
# Bulk Update GST Rates by Category (Admin)
# =============================
@product_bp.route("/update-gst", methods=["POST"])
@jwt_required()
@roles_required("admin")
def bulk_update_gst():
    """Update GST percent for all variants based on category (Indian GST 2026 Slabs)"""
    try:
        from app.models.product import ProductVariant
        from app.models.category import Category
        # Category name -> GST% mapping (Indian GST 2026)
        mapping = {
            "Dairy (Milk, Eggs, Cheese)": 5,
            "Fruits": 0,
            "Vegetables": 0,
            "Grains & Pulses": 5,
            "Beverages": 18,
            "Bakery Items": 5,
            "Snacks": 5,
            "Household Items": 18,
            "Personal Care": 18,
            "Frozen Foods": 18,
            "Spices & Oils": 5
        }

        # Join ProductVariant to Product to get category_id
        variants = db.session.query(ProductVariant).join(Product, ProductVariant.product_id == Product.product_id).all()
        updated = 0

        for variant in variants:
            cat = Category.query.get(variant.product.category_id)
            if cat and cat.name in mapping:
                new_gst = mapping[cat.name]
                if variant.gst_percent != new_gst:
                    variant.gst_percent = new_gst
                    updated += 1

        db.session.commit()
        return jsonify({"message": f"GST rates updated for {updated} variants"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to update GST: {str(e)}"}), 500


# =============================
# Download Sample Template (Admin/Manager)
# =============================
@product_bp.route("/download-sample", methods=["GET"])
@jwt_required()
def download_sample_template():
    import os
    import pandas as pd
    from io import BytesIO
    from flask import send_file

    # Define empty template structure
    data = [
        {
            "name": "",
            "sku": "",
            "barcode": "",
            "category": "",
            "price": 0.0,
            "cost_price": 0.0,
            "unit": "",
            "size": "",
            "quantity": 0,
            "discount_percent": 0.0,
            "gst_percent": 0.0,
            "description": ""
        }
    ]

    df = pd.DataFrame(data)
    
    # Create an in-memory CSV
    output = BytesIO()
    df.to_csv(output, index=False)
    output.seek(0)

    return send_file(
        output,
        mimetype="text/csv",
        as_attachment=True,
        download_name="sample_inventory_template.csv"
    )
