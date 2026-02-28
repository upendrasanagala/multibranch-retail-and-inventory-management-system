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
import math 


# =============================
# Get All Products (with filters)
# =============================
@product_bp.route("/", methods=["GET"])
@jwt_required()
def get_products():
    # Query parameters for filtering
    category_id = request.args.get("category_id", type=int)
    search = request.args.get("search", "")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    
    query = Product.query
    
    # Apply filters
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) |
            (Product.sku.ilike(f"%{search}%")) |
            (Product.barcode.ilike(f"%{search}%"))
        )
    
    # Pagination
    paginated = query.order_by(Product.name).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    from app.models.inventory import Inventory
    products = []
    for p in paginated.items:
        cat = Category.query.get(p.category_id) if p.category_id else None
        
        # Calculate global stats
        inv_records = Inventory.query.filter_by(product_id=p.product_id).all()
        total_stock = sum(r.quantity for r in inv_records)
        low_stock_count = sum(1 for r in inv_records if r.quantity <= (r.min_threshold or 0))
        
        products.append({
            "product_id": p.product_id,
            "name": p.name,
            "sku": p.sku,
            "barcode": p.barcode,
            "category_id": p.category_id,
            "category": {"category_id": cat.category_id, "name": cat.name} if cat else None,
            "description": p.description,
            "unit_price": p.unit_price,
            "cost_price": p.cost_price if p.cost_price is not None and not (isinstance(p.cost_price, float) and math.isnan(p.cost_price)) else None,
            "discount_percent": p.discount_percent if p.discount_percent is not None and not (isinstance(p.discount_percent, float) and math.isnan(p.discount_percent)) else 0.0,
            "gst_percent": p.gst_percent if p.gst_percent is not None and not (isinstance(p.gst_percent, float) and math.isnan(p.gst_percent)) else 0.0,
            "unit": p.unit,
            "size": p.size,
            "total_stock": total_stock,
            "low_stock_branches": low_stock_count,
            "image_path": p.image_path,
            "is_b1g1": p.is_b1g1,
            "mfg_date": p.mfg_date.isoformat() if p.mfg_date else None,
            "expiry_date": p.expiry_date.isoformat() if p.expiry_date else None,
            "supplier_id": p.supplier_id,
            "supplier_name": p.supplier.name if p.supplier else None,
            "created_at": p.created_at.isoformat() if p.created_at else None
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
        "image_path": product.image_path,
        "is_b1g1": product.is_b1g1,
        "created_at": product.created_at.isoformat() if product.created_at else None
    }), 200


# =============================
# Create Product (Admin/Manager)
# =============================
@product_bp.route("/", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager")
def create_product():
    try:
        data = request.get_json() or {}
        print("DEBUG: Received create_product data:", data) # Debug log

        name = data.get("name")
        unit_price = data.get("unit_price")
        category_id = data.get("category_id")
        initial_quantity = data.get("initial_quantity", 0)
        supplier_id = data.get("supplier_id")
    
        if not name or unit_price is None or not category_id or not supplier_id:
            return jsonify({"message": "Name, Price, Category, and Supplier are required"}), 400
        
        # Check if SKU already exists or generate one
        sku = data.get("sku")
        if sku:
            if Product.query.filter_by(sku=sku).first():
                return jsonify({"message": "SKU already exists"}), 409
        else:
            # Generate a simple SKU if not provided
            import uuid
            sku = f"PROD-{str(uuid.uuid4())[:8].upper()}"
        
        # Parse dates safely
        mfg_date = None
        if data.get("mfg_date"):
            try:
                from datetime import datetime
                mfg_date = datetime.strptime(data.get("mfg_date"), '%Y-%m-%d').date()
            except ValueError:
                pass

        expiry_date = None
        if data.get("expiry_date"):
            try:
                from datetime import datetime
                expiry_date = datetime.strptime(data.get("expiry_date"), '%Y-%m-%d').date()
            except ValueError:
                pass

        product = Product(
            name=name,
            sku=sku,
            barcode=data.get("barcode"),
            category_id=category_id,
            description=data.get("description"),
            unit_price=unit_price,
            cost_price=data.get("cost_price") or (float(unit_price) * 0.7),
            unit=data.get("unit"),
            image_path=data.get("image_path"),
            size=data.get("size"),
            discount_percent=data.get("discount_percent", 0.0),
            gst_percent=data.get("gst_percent", 0.0),
            mfg_date=mfg_date,
            expiry_date=expiry_date,
            is_b1g1=data.get("is_b1g1", False),
            supplier_id=data.get("supplier_id")
        )
        
        db.session.add(product)
        db.session.flush() # Get product_id
        
        # Initialize inventory for all branches
        from app.models.branch import Branch
        from app.models.inventory import Inventory
        
        branch_quantities = data.get("branch_quantities")
        
        branches = Branch.query.all()
        for branch in branches:
            qty = 0
            try:
                if branch_quantities and str(branch.branch_id) in branch_quantities:
                    val = branch_quantities.get(str(branch.branch_id), "")
                    qty = int(val) if val else 0
                elif not branch_quantities and initial_quantity:
                     # Only fallback to initial_quantity if NO distribution data was sent
                     qty = initial_quantity
            except (ValueError, TypeError):
                qty = 0
    
            inventory = Inventory(
                product_id=product.product_id,
                branch_id=branch.branch_id,
                quantity=qty,
                min_threshold=10,
                max_threshold=1000
            )
            db.session.add(inventory)
        
        db.session.commit()
        
        return jsonify({
            "message": "Product created and inventory initialized successfully",
            "product_id": product.product_id,
            "sku": sku
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"ERROR in create_product: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Server Error: {str(e)}"}), 500


# =============================
# Update Product (Admin/Manager)
# =============================
@product_bp.route("/<int:product_id>", methods=["PUT"])
@jwt_required()
@roles_required("admin", "manager")
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json() or {}
    
    # Check SKU uniqueness if being changed
    new_sku = data.get("sku")
    if new_sku and new_sku != product.sku:
        if Product.query.filter_by(sku=new_sku).first():
            return jsonify({"message": "SKU already exists"}), 409
    
    product.name = data.get("name", product.name)
    product.sku = data.get("sku", product.sku)
    product.barcode = data.get("barcode", product.barcode)
    product.category_id = data.get("category_id", product.category_id)
    product.description = data.get("description", product.description)
    product.unit_price = data.get("unit_price", product.unit_price)
    product.cost_price = data.get("cost_price", product.cost_price)
    product.unit = data.get("unit", product.unit)
    product.image_path = data.get("image_path", product.image_path)
    product.supplier_id = data.get("supplier_id", product.supplier_id)
    
    product.size = data.get("size", product.size)
    product.discount_percent = data.get("discount_percent", product.discount_percent)
    product.gst_percent = data.get("gst_percent", product.gst_percent)
    product.is_b1g1 = data.get("is_b1g1", product.is_b1g1)
    
    if data.get("mfg_date"):
        try:
            from datetime import datetime
            product.mfg_date = datetime.strptime(data.get("mfg_date"), '%Y-%m-%d').date()
        except ValueError:
            pass
            
    if "expiry_date" in data:
        try:
             from datetime import datetime
             product.expiry_date = datetime.strptime(data.get("expiry_date"), '%Y-%m-%d').date() if data.get("expiry_date") else None
        except:
             pass
    
    db.session.commit()
    return jsonify({"message": "Product updated successfully"}), 200

# =============================
# Return to Retailer (Admin/Manager)
# =============================
@product_bp.route("/return", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager")
def return_to_retailer():
    from app.models.inventory import Inventory
    from app.models.adjustment import InventoryAdjustment
    from flask_jwt_extended import get_jwt_identity
    
    data = request.get_json() or {}
    product_id = data.get("product_id")
    branch_id = data.get("branch_id")
    quantity = data.get("quantity")
    reason = data.get("reason", "Returned to Retailer (Expired)")
    
    if not all([product_id, branch_id, quantity]):
        return jsonify({"message": "Product ID, Branch ID, and Quantity are required"}), 400
        
    inventory = Inventory.query.filter_by(product_id=product_id, branch_id=branch_id).first()
    if not inventory or inventory.quantity < int(quantity):
        return jsonify({"message": "Insufficient stock in branch"}), 400
        
    # Deduct stock
    inventory.quantity -= int(quantity)
    
    # Record adjustment
    user_id = get_jwt_identity()
    adjustment = InventoryAdjustment(
        product_id=product_id,
        branch_id=branch_id,
        adjustment_type="Return to Supplier",
        quantity=int(quantity),
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
@product_bp.route("/<int:product_id>", methods=["DELETE"])
@jwt_required()
@roles_required("admin")
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    
    # Delete all related records first to avoid FK constraints
    from app.models.inventory import Inventory
    from app.models.sales import TransactionItem
    from app.models.stock_transfer import StockTransfer
    from app.models.adjustment import InventoryAdjustment
    
    Inventory.query.filter_by(product_id=product_id).delete()
    TransactionItem.query.filter_by(product_id=product_id).delete()
    StockTransfer.query.filter_by(product_id=product_id).delete()
    InventoryAdjustment.query.filter_by(product_id=product_id).delete()
    
    db.session.delete(product)
    db.session.commit()
    
    return jsonify({"message": "Product deleted successfully"}), 200

# =============================
# Bulk Delete Products (Admin Only)
# =============================
@product_bp.route("/bulk", methods=["DELETE"])
@jwt_required()
@roles_required("admin")
def delete_bulk_products():
    data = request.get_json() or {}
    product_ids = data.get("product_ids", [])
    
    if not product_ids or not isinstance(product_ids, list):
        return jsonify({"message": "No product IDs provided"}), 400
        
    # Delete all related records for ALL products to avoid FK constraints
    from app.models.inventory import Inventory
    from app.models.sales import TransactionItem
    from app.models.stock_transfer import StockTransfer
    from app.models.adjustment import InventoryAdjustment
    
    # Batch delete related records
    Inventory.query.filter(Inventory.product_id.in_(product_ids)).delete(synchronize_session=False)
    TransactionItem.query.filter(TransactionItem.product_id.in_(product_ids)).delete(synchronize_session=False)
    StockTransfer.query.filter(StockTransfer.product_id.in_(product_ids)).delete(synchronize_session=False)
    InventoryAdjustment.query.filter(InventoryAdjustment.product_id.in_(product_ids)).delete(synchronize_session=False)
    
    # Delete products
    Product.query.filter(Product.product_id.in_(product_ids)).delete(synchronize_session=False)
    
    db.session.commit()
    
    return jsonify({"message": f"Successfully deleted {len(product_ids)} products"}), 200

# =============================
# Import Products from Excel
# =============================
@product_bp.route("/import", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager")
def import_products():
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400
    
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls') or file.filename.endswith('.csv')):
        return jsonify({"message": "Invalid file type. Please upload Excel or CSV."}), 400

    try:
        # Save file first
        import os
        from datetime import datetime
        
        upload_folder = os.path.join(os.getcwd(), 'uploads', 'imports')
        os.makedirs(upload_folder, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = "".join([c for c in file.filename if c.isalpha() or c.isdigit() or c in (' ', '.', '_')]).strip()
        saved_filename = f"{timestamp}_{safe_filename}"
        file_path = os.path.join(upload_folder, saved_filename)
        
        file.save(file_path)
        
        # Read the SAVED file
        import pandas as pd
        
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        
        # Standardize column names (lowercase, strip spaces)
        df.columns = [c.lower().strip() for c in df.columns]
        
        # Remove empty rows
        df.dropna(how='all', inplace=True)
        
        # Drop duplicates by Name and SKU (if present)
        # 1. Clean up relevant columns for deduplication
        if 'name' in df.columns:
            df['name'] = df['name'].astype(str).str.strip()
        # Consider Size/Weight in deduplication
        if 'weight' in df.columns and 'size' not in df.columns:
            df['size'] = df['weight']
        
        subset_cols = ['name']
        if 'size' in df.columns:
            df['size'] = df['size'].astype(str).str.strip().replace('nan', '')
            subset_cols.append('size')

        if 'sku' in df.columns:
            # If SKU exists, exact SKU duplicates should be dropped
            df.drop_duplicates(subset=['sku'], keep='first', inplace=True)
        
        # Deduplicate by Name + Size combo
        df.drop_duplicates(subset=subset_cols, keep='last', inplace=True)

        
        required_cols = ['name', 'price', 'category']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            return jsonify({"message": f"Missing required columns: {', '.join(missing_cols)}"}), 400

        success_count = 0
        updated_count = 0
        errors = []
        
        from app.models.category import Category
        from app.models.product import Product
        from app.models.branch import Branch
        from app.models.inventory import Inventory
        import uuid

        # Cache existing categories to minimize DB hits
        categories = {c.name.lower(): c for c in Category.query.all()}
        branches = Branch.query.all()
        
        # Normalize columns: lowercase and strip spaces
        df.columns = [str(c).lower().strip() for c in df.columns]
        
        # Helper for flexible date parsing
        def get_date_val(row, nicknames):
            for nick in nicknames:
                if nick in row and pd.notna(row[nick]):
                    try: return pd.to_datetime(row[nick]).date()
                    except: continue
            return None
        
        for index, row in df.iterrows():
            try:
                # DEBUG: Log to file
                with open("debug_import.log", "a", encoding="utf-8") as f:
                    f.write(f"Row {index}: {row.to_dict()}\n")

                name = str(row['name']).strip()
                if not name or pd.isna(row['name']):
                    continue
                
                price = pd.to_numeric(row['price'], errors='coerce')
                if pd.isna(price) or price < 0:
                    errors.append(f"Row {index+2}: Invalid price for '{name}'")
                    continue
                
                # Identify Category
                cat_val = row.get('category')
                if pd.isna(cat_val):
                     # Try alternative column names
                     cat_val = row.get('category_name') or row.get('cat')
                
                cat_name = str(cat_val).strip() if pd.notna(cat_val) else "Uncategorized"
                
                # Find or Create Category
                category = categories.get(cat_name.lower())
                if not category:
                    category = Category(name=cat_name, description="Imported via Excel")
                    db.session.add(category)
                    db.session.flush() # Get ID
                    categories[cat_name.lower()] = category
                
                # Check if Product exists (by Name or SKU)
                # Identify Size/Weight
                size_val = row.get('size')
                if pd.isna(size_val) or str(size_val).strip() == '':
                     size_val = row.get('weight')
                if pd.isna(size_val) or str(size_val).strip() == '':
                     size_val = row.get('variant_size')
                if pd.isna(size_val) or str(size_val).strip() == '':
                     size_val = row.get('size_name')
                
                size_str = str(size_val).strip() if pd.notna(size_val) else ""

                # Valid SKU?
                sku_val = str(row.get('sku', '')).strip()
                is_valid_sku = sku_val and sku_val.lower() != 'nan'
                
                if is_valid_sku:
                     sku = sku_val
                     # Look up strictly by SKU
                     existing_product = Product.query.filter(Product.sku == sku).first()
                else:
                     # Generate a SKU
                     sku = f"PROD-{str(uuid.uuid4())[:8].upper()}"
                     
                     # Look up by Name AND Size
                     if size_str:
                          existing_product = Product.query.filter(Product.name == name, Product.size == size_str).first()
                          
                          # Smart Merge: If not found, check if there's a product with SAME NAME but EMPTY SIZE
                          # This handles cases where user previously imported without size, and now adds size.
                          if not existing_product:
                               potential_match = Product.query.filter(Product.name == name, (Product.size == None) | (Product.size == '')).first()
                               if potential_match:
                                    existing_product = potential_match
                                    # We found a match that was missing size!
                                    # It will fall into the update block below
                     else:
                          existing_product = Product.query.filter(Product.name == name, (Product.size == None) | (Product.size == '')).first()
                
                if existing_product:
                    existing_product.unit_price = price
                    existing_product.category_id = category.category_id
                    # Update other fields if present
                    if 'barcode' in row and pd.notna(row['barcode']): existing_product.barcode = str(row['barcode'])
                    if 'description' in row and pd.notna(row['description']): existing_product.description = str(row['description'])
                    if 'is_b1g1' in row and pd.notna(row['is_b1g1']):
                         existing_product.is_b1g1 = str(row['is_b1g1']).lower() in ['true', '1', 'yes', 'y']
                    
                    # Update new fields
                    if any(x in row for x in ['mfg_date', 'manufacturing_date', 'mfg_date_manual', 'mfg date', 'manufacturing date', 'mfg. date']):
                         val = get_date_val(row, ['mfg_date', 'manufacturing_date', 'mfg_date_manual', 'mfg date', 'manufacturing date', 'mfg. date'])
                         if val: existing_product.mfg_date = val
                         
                    if any(x in row for x in ['expiry_date', 'exp_date', 'expiry date', 'exp date']):
                         val = get_date_val(row, ['expiry_date', 'exp_date', 'expiry date', 'exp date'])
                         if val: existing_product.expiry_date = val

                    if 'cost_price' in row and pd.notna(row['cost_price']):
                         existing_product.cost_price = pd.to_numeric(row['cost_price'], errors='coerce')
                    if 'discount_percent' in row and pd.notna(row['discount_percent']):
                         existing_product.discount_percent = pd.to_numeric(row['discount_percent'], errors='coerce')
                    if 'gst_percent' in row and pd.notna(row['gst_percent']):
                         existing_product.gst_percent = pd.to_numeric(row['gst_percent'], errors='coerce')
                    if 'unit' in row and pd.notna(row['unit']):
                         existing_product.unit = str(row['unit']).strip()

                    product = existing_product
                    
                    # Update size if provided
                    if size_str:
                         product.size = size_str
                    
                    updated_count += 1
                else:
                    try:
                        mfg_date = get_date_val(row, ['mfg_date', 'manufacturing_date', 'mfg_date_manual', 'mfg date', 'manufacturing date'])
                        expiry_date = get_date_val(row, ['expiry_date', 'exp_date', 'expiry date', 'exp date'])
                    except:
                        mfg_date = None
                        expiry_date = None

                    product = Product(
                        name=name,
                        sku=sku,
                        category_id=category.category_id,
                        unit_price=price,
                        cost_price=pd.to_numeric(row.get('cost_price'), errors='coerce') or (price * 0.7),
                        barcode=str(row.get('barcode', '')).strip() if pd.notna(row.get('barcode')) else None,
                        unit=str(row.get('unit', 'pcs')).strip(),
                        description=str(row.get('description', '')).strip(),
                        image_path=None,
                        size=size_str or None,
                        discount_percent=pd.to_numeric(row.get('discount_percent', 0), errors='coerce'),
                        gst_percent=pd.to_numeric(row.get('gst_percent', 0), errors='coerce'),
                        mfg_date=mfg_date,
                        expiry_date=expiry_date,
                        is_b1g1=str(row.get('is_b1g1', 'false')).lower() in ['true', '1', 'yes', 'y']
                    )
                    db.session.add(product)
                    db.session.flush()
                    success_count += 1
                
                # process Inventory
                # Check for 'stock', 'qty', 'quantity' columns
                qty_val = row.get('quantity')
                if pd.isna(qty_val): qty_val = row.get('qty')
                if pd.isna(qty_val): qty_val = row.get('stock')
                
                initial_qty = pd.to_numeric(qty_val, errors='coerce')
                if pd.isna(initial_qty): initial_qty = 0
                
                for branch in branches:
                    inv = Inventory.query.filter_by(product_id=product.product_id, branch_id=branch.branch_id).first()
                    if not inv:
                        # Only create new inventory records for NEW products
                        inv = Inventory(
                            product_id=product.product_id,
                            branch_id=branch.branch_id,
                            quantity=int(initial_qty),
                            min_threshold=10,
                            max_threshold=1000
                        )
                        db.session.add(inv)
                    # Existing inventory records are NOT updated to prevent
                    # accidental stock overwriting/duplication on re-import
                         
            except Exception as e:
                errors.append(f"Row {index+2}: {str(e)}")
        
        db.session.commit()
        
        return jsonify({
            "message": f"Successfully processed {len(df)} rows.",
            "products_created": success_count,
            "products_updated": updated_count,
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
    """Update GST percent for all products based on their category (Indian GST 2026 Slabs)"""
    try:
        # Category name -> GST% mapping (Indian GST 2026)
        category_gst_map = {
            "Dairy (Milk, Eggs, Cheese)": 5,    # Butter, ghee, cheese, condensed milk
            "Fruits": 0,                         # Fresh fruits are NIL rated
            "Vegetables": 0,                     # Fresh vegetables are NIL rated
            "Grains & Pulses": 5,               # Packaged cereals, flours, starches
            "Beverages": 18,                     # Mineral water, packaged drinks
            "Bakery Items": 5,                   # Pastries, cakes, biscuits, rusks
            "Snacks": 5,                         # Namkeens, bhujia, mixtures
            "Household Items": 18,               # Household articles, utensils
            "Personal Care": 18,                 # Cosmetics, skincare, hair products
            "Frozen Foods": 18,                  # Processed/preserved food items
            "Spices & Oils": 5                   # Spices, edible oils, condiments
        }

        products = Product.query.all()
        updated = 0

        for product in products:
            category = Category.query.get(product.category_id)
            if category and category.name in category_gst_map:
                new_gst = category_gst_map[category.name]
                if product.gst_percent != new_gst:
                    product.gst_percent = new_gst
                    updated += 1

        db.session.commit()

        return jsonify({
            "message": f"GST rates updated for {updated} products based on category",
            "updated_count": updated,
            "total_products": len(products)
        }), 200

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

    # Define sample data
    data = [
        {
            "name": "Sample Product 1",
            "sku": "SAMPLE-001",
            "barcode": "123456789012",
            "category": "Snacks",
            "price": 50.0,
            "cost_price": 35.0,
            "unit": "pkt",
            "size": "100g",
            "quantity": 100,
            "discount_percent": 0.0,
            "gst_percent": 5.0,
            "description": "Delicious snack example"
        },
        {
            "name": "Sample Product 2",
            "sku": "SAMPLE-002",
            "barcode": "098765432109",
            "category": "Dairy (Milk, Eggs, Cheese)",
            "price": 60.0,
            "cost_price": 45.0,
            "unit": "L",
            "size": "1L",
            "quantity": 50,
            "discount_percent": 5.0,
            "gst_percent": 0.0,
            "description": "Fresh milk example"
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
