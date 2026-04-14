# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app import create_app
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.sales import SalesTransaction

app = create_app()
with app.app_context():
    try:
        p_count = Product.query.count()
        inv_count = Inventory.query.count()
        sales_count = SalesTransaction.query.count()
        expiring_products = Product.query.filter(Product.expiry_date != None).count()
        print(f"DEBUG: Products={p_count}, Inventory={inv_count}, Sales={sales_count}, Expiring={expiring_products}")
    except Exception as e:
        print(f"ERROR: {str(e)}")
