import { useEffect, useState } from "react";
import api from "../../services/api";

export default function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    price: "",
    stock: "",
    category_id: ""
  });

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= LOAD PRODUCTS FROM BACKEND ================= */
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await api.products.getAll();
      setProducts(response.products || []);
    } catch (err) {
      console.error("Failed to load products:", err);
      // Fallback to localStorage
      const stored = JSON.parse(localStorage.getItem("products")) || [];
      setProducts(stored);
    }
    setLoading(false);
  };

  const loadCategories = async () => {
    try {
      const response = await api.categories.getAll();
      setCategories(response.categories || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  /* ================= ADD PRODUCT ================= */
  const addProduct = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) {
      setMessage("❌ Name and price are required");
      return;
    }

    setLoading(true);
    try {
      await api.products.create({
        name: form.name.trim(),
        unit_price: Number(form.price),
        category_id: form.category_id || null
      });

      setMessage("✅ Product added successfully");
      setForm({ name: "", price: "", stock: "", category_id: "" });
      await loadProducts();
    } catch (err) {
      setMessage("❌ " + (err.message || "Failed to add product"));
    }
    setLoading(false);
    setTimeout(() => setMessage(""), 2500);
  };

  /* ================= UPDATE PRICE ================= */
  const updatePrice = async (id, value) => {
    try {
      await api.products.update(id, { unit_price: Number(value) });
      setMessage("✅ Price updated");
      await loadProducts();
    } catch (err) {
      setMessage("❌ " + (err.message || "Failed to update price"));
    }
    setTimeout(() => setMessage(""), 2500);
  };

  /* ================= DELETE PRODUCT ================= */
  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;

    setLoading(true);
    try {
      await api.products.delete(id);
      setMessage("✅ Product deleted");
      await loadProducts();
    } catch (err) {
      setMessage("❌ " + (err.message || "Failed to delete product"));
    }
    setLoading(false);
    setTimeout(() => setMessage(""), 2500);
  };

  /* ================= SEARCH FILTER ================= */
  const filteredProducts = products.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>

      <h2 style={{ marginBottom: "15px" }}>
        Product Catalog {loading && "(Loading...)"}
      </h2>

      {/* ================= INLINE MESSAGE ================= */}
      {message && (
        <div className="inline-msg" style={{
          padding: '10px',
          marginBottom: '15px',
          borderRadius: '6px',
          background: message.includes('✅') ? '#d1fae5' : '#fee2e2'
        }}>
          {message}
        </div>
      )}

      {/* ================= ADD FORM ================= */}
      <form
        onSubmit={addProduct}
        className="chart-card"
        style={{ marginBottom: "25px" }}
      >
        <h3>Add Product</h3>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            placeholder="Product name"
            value={form.name}
            onChange={e =>
              setForm({ ...form, name: e.target.value })
            }
            disabled={loading}
          />

          <input
            type="number"
            placeholder="Price"
            value={form.price}
            onChange={e =>
              setForm({ ...form, price: e.target.value })
            }
            disabled={loading}
          />

          <select
            value={form.category_id}
            onChange={e => setForm({ ...form, category_id: e.target.value })}
            disabled={loading}
          >
            <option value="">Select Category</option>
            {categories.map(cat => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.name}
              </option>
            ))}
          </select>

          <button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Product"}
          </button>
        </div>
      </form>

      {/* ================= SEARCH ================= */}
      <div
        style={{
          marginBottom: "15px",
          display: "flex",
          justifyContent: "flex-end"
        }}
      >
        <input
          placeholder="🔍 Search by product name"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "250px",
            padding: "6px"
          }}
        />
      </div>

      {/* ================= PRODUCT TABLE ================= */}
      <div className="table-card">
        <h3>All Products ({filteredProducts.length})</h3>

        {filteredProducts.length === 0 ? (
          <p>{loading ? "Loading products..." : "No matching products found"}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.product_id || p.id}>
                  <td>{p.sku || p.product_id || p.id}</td>
                  <td>{p.name}</td>
                  <td>{p.category?.name || 'N/A'}</td>

                  <td>
                    <input
                      type="number"
                      value={p.unit_price || p.price || 0}
                      onChange={e =>
                        updatePrice(p.product_id || p.id, e.target.value)
                      }
                      style={{ width: "90px" }}
                      disabled={loading}
                    />
                  </td>

                  <td>
                    <button
                      onClick={() => deleteProduct(p.product_id || p.id)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
