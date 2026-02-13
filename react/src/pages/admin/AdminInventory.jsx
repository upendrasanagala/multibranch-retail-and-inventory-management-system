import { useEffect, useState } from "react";
import api from "../../services/api";

export default function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]); // New: Branches for stock distribution
  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "", // New: Barcode field
    description: "", // New: Description field
    price: "",
    cost_price: "",
    category_id: "",
    unit: "",
    size: "",
    discount_percent: "",
    gst_percent: "",
    expiry_date: "",
    branch_quantities: {} // New: Store qty per branch
  });
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", description: "" });
  const [catLoading, setCatLoading] = useState(false);

  /* ========== CATEGORY → UNIT MAPPING ========== */
  const categoryUnitMap = {
    "Dairy (Milk, Eggs, Cheese)": ["L", "mL", "pcs"],
    "Fruits": ["kg", "g", "dz", "pcs"],
    "Vegetables": ["kg", "g", "pcs"],
    "Grains & Pulses": ["kg", "g", "L", "pcs"],
    "Beverages": ["L", "mL", "pcs"],
    "Bakery Items": ["pcs", "pkt", "kg"],
    "Snacks": ["pkt", "pcs", "g"],
    "Household Items": ["pcs", "pkt"],
    "Personal Care": ["pcs", "pkt", "mL", "g"],
    "Frozen Foods": ["kg", "g", "pcs", "pkt"],
    "Spices & Oils": ["kg", "g", "L", "mL"]
  };
  const defaultUnits = ["pcs", "pkt", "kg", "g", "L", "mL", "dz"];

  const getUnitsForCategory = () => {
    const selectedCat = categories.find(c => String(c.category_id) === String(form.category_id));
    if (!selectedCat) return defaultUnits;
    return categoryUnitMap[selectedCat.name] || defaultUnits;
  };

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  /* ========== BULK DELETE UTILITIES ========== */
  const [selectedIds, setSelectedIds] = useState(new Set());

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all visible (filtered) products
      const allIds = filteredProducts.map(p => p.product_id || p.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} products? This cannot be undone.`)) return;

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("loggedInUser"));
      const token = user?.access_token;

      const res = await fetch("http://127.0.0.1:5000/api/products/bulk", {
        method: "DELETE",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ product_ids: Array.from(selectedIds) })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        setSelectedIds(new Set());
        await loadProducts();
      } else {
        throw new Error(data.message || "Bulk delete failed");
      }
    } catch (err) {
      setMessage("❌ " + err.message);
    }
    setLoading(false);
    setTimeout(() => setMessage(""), 2500);
  };

  /* ========== IMPORT HISTORY ========== */
  const [importHistory, setImportHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadImportHistory = async () => {
    setHistoryLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("loggedInUser"));
      const token = user?.access_token;
      if (token) {
        const res = await fetch("http://127.0.0.1:5000/api/products/imports", {
          headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        setImportHistory(data.imports || []);
      }
    } catch (err) {
      console.error("Failed to load import history", err);
    }
    setHistoryLoading(false);
  };

  /* ========== LOAD DATA ========== */
  useEffect(() => {
    loadProducts();
    loadCategories();
    loadBranches(); // New
    loadSuggestions();
  }, []);

  const loadBranches = async () => {
    try {
      const res = await api.branches.getAll();
      setBranches(res.branches || []);
    } catch (err) {
      console.error("Failed to load branches", err);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.products.import(formData);
      let msg = `✅ ${res.message}`;
      if (res.products_updated > 0) {
        msg += ` (New: ${res.products_created}, Updated: ${res.products_updated})`;
      }
      if (res.errors && res.errors.length > 0) {
        msg += ` | ⚠️ ${res.errors.length} errors`;
      }
      setMessage(msg);
      if (res.errors && res.errors.length > 0) {
        alert("Import Errors:\n" + res.errors.join("\n"));
      }
      loadProducts();
      // Reload categories too as new ones might be added
      loadCategories();
    } catch (err) {
      alert("Import Failed: " + (err.response?.data?.message || err.message));
    }
    setImportLoading(false);
    // Reset input
    e.target.value = null;
  };

  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);

  /* ========== STOCK DISTRIBUTION MODAL ========== */
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [distributionData, setDistributionData] = useState([]);
  const [distLoading, setDistLoading] = useState(false);

  const loadDistribution = async (product) => {
    setSelectedProduct(product);
    setDistLoading(true);
    try {
      // Assuming api.inventory.getAll supports query params
      const res = await api.inventory.getAll({ product_id: product.product_id || product.id });
      setDistributionData(res.inventory || []);
    } catch (err) {
      console.error("Failed to load distribution:", err);
    }
    setDistLoading(false);
  };

  const updateThresholds = async (inventoryId, minThreshold, maxThreshold) => {
    try {
      await api.inventory.update(inventoryId, {
        min_threshold: parseInt(minThreshold),
        max_threshold: parseInt(maxThreshold)
      });
      // Update local state
      setDistributionData(prev => prev.map(d =>
        d.inventory_id === inventoryId ? { ...d, min_threshold: minThreshold, max_threshold: maxThreshold } : d
      ));
    } catch (err) {
      alert("Failed to update thresholds");
    }
  };

  /* ========== STOCK ADJUSTMENT ========== */
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ type: 'add', quantity: '', reason: '' });

  const openAdjustment = (item) => {
    setAdjustTarget(item);
    setAdjustForm({ type: 'add', quantity: '', reason: '' });
  };

  const submitAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustForm.quantity || Number(adjustForm.quantity) < 0) {
      alert("Please enter a valid quantity");
      return;
    }

    try {
      await api.inventory.adjust({
        product_id: selectedProduct.product_id || selectedProduct.id,
        branch_id: adjustTarget.branch_id,
        adjustment_type: adjustForm.type,
        quantity: Number(adjustForm.quantity),
        reason: adjustForm.reason
      });

      // Refresh data
      await loadDistribution(selectedProduct);
      setAdjustTarget(null);
      setMessage("✅ Stock adjusted successfully");
      loadProducts(); // Update main list counts
    } catch (err) {
      alert("Adjustment failed: " + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    setSugLoading(true);
    try {
      const res = await api.admin.getRebalanceSuggestions();
      setSuggestions(res.suggestions || []);
    } catch (err) {
      console.error("Failed to load suggestions:", err);
    }
    setSugLoading(false);
  };

  const quickTransfer = async (sug) => {
    try {
      setSugLoading(true);
      await api.inventory.adjust({
        product_id: sug.product_id,
        branch_id: sug.from_branch_id,
        adjustment_type: 'subtract',
        quantity: sug.suggested_quantity,
        reason: `Rebalance transfer to ${sug.to_branch_name}`
      });
      await api.inventory.adjust({
        product_id: sug.product_id,
        branch_id: sug.to_branch_id,
        adjustment_type: 'add',
        quantity: sug.suggested_quantity,
        reason: `Rebalance transfer from ${sug.from_branch_name}`
      });
      setMessage(`✅ Moved ${sug.suggested_quantity} units of ${sug.product_name}`);
      await loadSuggestions();
      await loadProducts();
    } catch (err) {
      alert("Transfer failed: " + (err.response?.data?.message || err.message));
    }
    setSugLoading(false);
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      console.log("Fetching products...");
      const response = await api.products.getAll({ per_page: 1000 });
      console.log("Products loaded:", response.products?.length);
      setProducts(response.products || []);
    } catch (err) {
      console.error("Failed to load products:", err);
      setMessage("❌ Failed to load products: " + (err.message || "Unknown error"));
    }
    setLoading(false);
  };

  const loadCategories = async () => {
    setLoadingCats(true);
    try {
      console.log("Fetching categories via api.categories.getAll()...");
      const response = await api.categories.getAll();
      console.log("Categories API response:", JSON.stringify(response));
      const cats = Array.isArray(response) ? response : (response.categories || []);
      console.log("Parsed categories count:", cats.length);
      setCategories(cats);
    } catch (err) {
      console.error("Categories API failed, trying direct fetch:", err);
      try {
        const user = JSON.parse(localStorage.getItem("loggedInUser"));
        const token = user?.access_token;
        if (token) {
          const res = await fetch("http://127.0.0.1:5000/api/categories/", {
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
          });
          const data = await res.json();
          console.log("Direct fetch categories:", data);
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch (e2) {
        console.error("Direct fetch also failed:", e2);
      }
      setMessage("❌ Error loading categories: " + (err.response?.data?.message || err.message));
    }
    setLoadingCats(false);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCat.name) return;

    setCatLoading(true);
    try {
      const res = await api.categories.create(newCat);
      setMessage("✅ Category created");
      await loadCategories();
      setForm(prev => ({ ...prev, category_id: res.category_id }));
      setNewCat({ name: "", description: "" });
      setShowNewCat(false);
    } catch (err) {
      setMessage("❌ " + (err.response?.data?.message || err.message));
    }
    setCatLoading(false);
    setTimeout(() => setMessage(""), 3000);
  };

  /* ================= ADD PRODUCT ================= */
  const addProduct = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) {
      setMessage("❌ Name and price are required");
      return;
    }
    if (!form.unit) {
      setMessage("❌ Please select a measurement unit");
      return;
    }

    const totalQty = Object.values(form.branch_quantities || {}).reduce((sum, qty) => sum + (Number(qty) || 0), 0);

    setLoading(true);
    try {
      await api.products.create({
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        barcode: form.barcode.trim() || undefined, // New
        description: form.description.trim() || undefined, // New
        unit_price: Number(form.price),
        cost_price: form.cost_price ? Number(form.cost_price) : undefined,
        category_id: form.category_id || null,
        initial_quantity: totalQty, // Send total for compatibility/logging
        branch_quantities: form.branch_quantities, // Send detailed distribution
        unit: form.unit,
        size: form.size.trim() || null,
        discount_percent: Number(form.discount_percent) || 0,
        gst_percent: Number(form.gst_percent) || 0,
        expiry_date: form.expiry_date || null
      });

      setMessage("✅ Product and inventory initialized across all branches");
      setForm({
        name: "", sku: "", barcode: "", description: "", price: "", cost_price: "",
        category_id: "", unit: "",
        size: "", discount_percent: "", gst_percent: "", expiry_date: "",
        branch_quantities: {}
      });
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Admin Inventory Management</h2>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleImport}
              style={{ display: 'none' }}
              id="excel-upload"
              disabled={importLoading}
            />
            <label
              htmlFor="excel-upload"
              className="primary-btn"
              style={{
                cursor: importLoading ? 'wait' : 'pointer',
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {importLoading ? "Importing..." : "📂 Import Excel"}
            </label>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab("all")}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none',
              background: activeTab === 'all' ? '#fff' : 'transparent',
              boxShadow: activeTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontWeight: 600, cursor: 'pointer', marginRight: '10px'
            }}
          >
            All Products
          </button>
          <button
            onClick={() => setActiveTab("rebalance")}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none',
              background: activeTab === 'rebalance' ? '#fff' : 'transparent',
              boxShadow: activeTab === 'rebalance' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginRight: '10px'
            }}
          >
            ⚖️ Rebalancing
            {suggestions.length > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>{suggestions.length}</span>}
          </button>
          <button
            onClick={() => { setActiveTab("history"); loadImportHistory(); }}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none',
              background: activeTab === 'history' ? '#fff' : 'transparent',
              boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
            }}
          >
            📜 Import History
          </button>
        </div>
      </div>

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
      {activeTab === 'all' && (
        <form
          onSubmit={addProduct}
          className="chart-card"
          style={{ marginBottom: "25px" }}
        >
          <h3>Add Product</h3>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                placeholder="Product name"
                value={form.name}
                onChange={e =>
                  setForm({ ...form, name: e.target.value })
                }
                disabled={loading}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ width: '100px' }}>
              <input
                type="number"
                placeholder="Price"
                value={form.price}
                onChange={e =>
                  setForm({ ...form, price: e.target.value })
                }
                disabled={loading}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ width: '120px' }}>
              <input
                placeholder="SKU (Opt)"
                value={form.sku}
                onChange={e => setForm({ ...form, sku: e.target.value })}
                disabled={loading}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ width: '120px' }}>
              <input
                placeholder="Barcode (Opt)"
                value={form.barcode}
                onChange={e => setForm({ ...form, barcode: e.target.value })}
                disabled={loading}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ width: '100%', marginTop: '5px' }}>
              <input
                placeholder="Description / Product Details"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                disabled={loading}
                style={{ width: '100%' }}
              />
            </div>

            {/* Stock Distribution Section (Replaces simple Qty input) */}
            <div style={{
              width: '100%',
              marginTop: '10px',
              background: '#f8fafc',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <h4 style={{ fontSize: '13px', marginBottom: '8px', marginTop: 0, display: 'flex', justifyContent: 'space-between' }}>
                <span>Distribution (Total: {Object.values(form.branch_quantities || {}).reduce((a, b) => a + (Number(b) || 0), 0)})</span>
                <span style={{ fontWeight: 'normal', color: '#64748b', fontSize: '11px' }}>Enter qty for each branch</span>
              </h4>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {branches.filter(b => b.status !== 'closed').map(b => (
                  <div key={b.branch_id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '600', color: '#475569' }}>{b.name}</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={form.branch_quantities?.[b.branch_id] || ""}
                      onChange={e => setForm({
                        ...form,
                        branch_quantities: {
                          ...form.branch_quantities,
                          [b.branch_id]: e.target.value
                        }
                      })}
                      style={{ width: '70px', padding: '4px', fontSize: '12px' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '5px' }}>
              <select
                value={form.category_id}
                onChange={e => setForm({ ...form, category_id: e.target.value, unit: "" })}
                disabled={loading || catLoading || loadingCats}
                style={{ flex: 1 }}
              >
                <option value="">{loadingCats ? "Loading categories..." : "Select Category"}</option>
                {categories.map(c => (
                  <option key={c.category_id} value={c.category_id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '8px 12px', fontSize: '20px', lineHeight: 1 }}
                onClick={() => setShowNewCat(!showNewCat)}
                title="Add New Category"
              >
                {showNewCat ? "−" : "+"}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', width: '100%', flexWrap: 'wrap', marginTop: '10px' }}>
              <input
                type="number"
                placeholder="Cost Price"
                value={form.cost_price}
                onChange={e => setForm({ ...form, cost_price: e.target.value })}
                disabled={loading}
                style={{ width: "120px" }}
                title="Cost Price (Defaults to 70% of Price)"
              />
              <input
                placeholder="Size (e.g. L, XL, 500g)"
                value={form.size}
                onChange={e => setForm({ ...form, size: e.target.value })}
                disabled={loading}
                style={{ width: "150px" }}
              />
              <input
                type="number"
                placeholder="Discount %"
                value={form.discount_percent}
                onChange={e => setForm({ ...form, discount_percent: e.target.value })}
                disabled={loading}
                style={{ width: "100px" }}
              />
              <input
                type="number"
                placeholder="GST %"
                value={form.gst_percent}
                onChange={e => setForm({ ...form, gst_percent: e.target.value })}
                disabled={loading}
                style={{ width: "80px" }}
              />
              <input
                type="date"
                placeholder="Expiry Date"
                value={form.expiry_date}
                onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                disabled={loading}
                style={{ width: "150px" }}
                title="Expiry Date"
              />
            </div>

            {/* ========== UNIT DROPDOWN ========== */}
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <select
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                disabled={loading}
                style={{ minWidth: '100px' }}
              >
                <option value="">Unit</option>
                {getUnitsForCategory().map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <span
                style={{ cursor: 'help', color: '#64748b', fontSize: '16px' }}
                title="Units are filtered based on the category you select. e.g. L/mL for Dairy, kg/g/dz for Fruits."
              >
                ⓘ
              </span>
            </div>

            {showNewCat && (
              <div style={{
                padding: '15px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginTop: '5px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <h4 style={{ margin: 0, fontSize: '14px' }}>New Category</h4>
                <input
                  placeholder="Category Name"
                  value={newCat.name}
                  onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                  disabled={catLoading}
                  style={{ width: '100%' }}
                />
                <input
                  placeholder="Description"
                  value={newCat.description}
                  onChange={e => setNewCat({ ...newCat, description: e.target.value })}
                  disabled={catLoading}
                  style={{ width: '100%' }}
                />
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleCreateCategory}
                  disabled={catLoading || !newCat.name}
                  style={{ alignSelf: 'flex-end', padding: '5px 15px' }}
                >
                  {catLoading ? "Adding..." : "Add"}
                </button>
              </div>
            )}

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Adding..." : "Add Product"}
            </button>
          </div>
        </form>
      )}

      {/* ================= SEARCH ================= */}
      {activeTab === 'all' && (
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={loadProducts}
              className="secondary-btn"
              disabled={loading}
              style={{ padding: '6px 12px', display: 'flex', gap: '5px' }}
            >
              {loading ? "Refreshing..." : "🔄 Refresh List"}
            </button>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              {loading ? "Fetching..." : `Showing ${filteredProducts.length} products`}
            </span>
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="primary-btn"
                style={{ background: '#ef4444', marginLeft: '10px' }}
                disabled={loading}
              >
                🗑️ Delete Selected ({selectedIds.size})
              </button>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
        </div>
      )}

      {/* ================= TABS CONTENT ================= */}
      {activeTab === 'all' ? (
        <div className="table-card">
          <h3>All Products ({filteredProducts.length})</h3>

          {filteredProducts.length === 0 ? (
            <p>{loading ? "Loading products..." : "No matching products found"}</p>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                      />
                    </th>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Size/Weight</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th>Inventory Status</th>
                    <th>Price (₹)</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map(p => (
                    <tr key={p.product_id || p.id} className={selectedIds.has(p.product_id || p.id) ? "selected-row" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.product_id || p.id)}
                          onChange={() => handleSelectOne(p.product_id || p.id)}
                        />
                      </td>
                      <td>{p.sku || p.product_id || p.id}</td>
                      <td><span style={{ fontWeight: 600 }}>{p.name}</span></td>
                      <td><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>{p.size || '-'}</span></td>
                      <td><span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>{p.category?.name || 'N/A'}</span></td>
                      <td>
                        <span className="stock-badge ok" style={{ fontSize: '11px' }}>
                          {p.unit || 'pcs'}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: p.total_stock === 0 ? '#dc2626' : '#0f172a' }}>
                          {p.total_stock || 0} {p.unit || 'pcs'}
                        </div>
                        {p.low_stock_branches > 0 && (
                          <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600, marginTop: '2px' }}>
                            ⚠️ Low in {p.low_stock_branches} branch{p.low_stock_branches > 1 ? 'es' : ''}
                          </div>
                        )}
                      </td>

                      <td>
                        <input
                          type="number"
                          value={p.unit_price || p.price || 0}
                          onChange={e =>
                            updatePrice(p.product_id || p.id, e.target.value)
                          }
                          style={{ width: "90px", padding: '6px', fontSize: '13px' }}
                          disabled={loading}
                        />
                      </td>

                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="primary-btn"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => loadDistribution(p)}
                        >
                          View Stock
                        </button>
                        <button
                          onClick={() => deleteProduct(p.product_id || p.id)}
                          disabled={loading}
                          style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 12px', border: 'none', borderRadius: '4px' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'rebalance' ? (
        /* ================= REBALANCING ASSISTANT ================= */
        <div className="table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h3>Stock Rebalancing Assistant</h3>
              <p style={{ fontSize: '13px', color: '#64748b' }}>Move surplus stock to branches with shortages to optimize sales.</p>
            </div>
            <button className="secondary-btn" onClick={loadSuggestions} disabled={sugLoading}>
              {sugLoading ? "Refreshing..." : "🔄 Refresh Suggestions"}
            </button>
          </div>

          {suggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '12px' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
              <h4 style={{ margin: 0 }}>All Stock is Balanced!</h4>
              <p style={{ color: '#64748b' }}>No products currently have significant imbalances across branches.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="rebalance-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Source (Surplus)</th>
                    <th>Destination (Deficit)</th>
                    <th>Quantity to Move</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((sug, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{sug.product_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {sug.product_id}</div>
                      </td>
                      <td>
                        <div style={{ color: '#059669', fontWeight: 600 }}>{sug.from_branch_name}</div>
                        <div style={{ fontSize: '11px' }}>Has high stock levels</div>
                      </td>
                      <td>
                        <div style={{ color: '#dc2626', fontWeight: 600 }}>{sug.to_branch_name}</div>
                        <div style={{ fontSize: '11px' }}>Running low or out of stock</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 800, color: '#6366f1' }}>{sug.suggested_quantity}</span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>units</span>
                        </div>
                      </td>
                      <td>
                        <button
                          className="primary-btn"
                          style={{ padding: '8px 16px', background: '#6366f1', fontSize: '13px' }}
                          onClick={() => quickTransfer(sug)}
                          disabled={sugLoading}
                        >
                          Quick Move
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ================= IMPORT HISTORY ================= */
        <div className="table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>Import History</h3>
            <button className="secondary-btn" onClick={loadImportHistory} disabled={historyLoading}>
              {historyLoading ? "Refreshing..." : "🔄 Refresh"}
            </button>
          </div>

          {importHistory.length === 0 ? (
            <p>No import history found.</p>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Uploaded Date</th>
                    <th>Size</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {importHistory.map((file, i) => (
                    <tr key={i}>
                      <td>{file.filename}</td>
                      <td>{new Date(file.uploaded_at).toLocaleString()}</td>
                      <td>{(file.size / 1024).toFixed(2)} KB</td>
                      <td>
                        <a
                          href={`http://127.0.0.1:5000/api/products/imports/${file.filename}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#0369a1', textDecoration: 'underline' }}
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= STOCK DISTRIBUTION MODAL ================= */}
      {selectedProduct && (
        <div className="profile-overlay" style={{ display: 'flex' }} onClick={() => setSelectedProduct(null)}>
          <div className="profile-modal" style={{ maxWidth: '800px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Stock Distribution: {selectedProduct.name}</h3>
              <p style={{ color: '#64748b', fontSize: '14px' }}>SKU: {selectedProduct.sku}</p>
            </div>

            {distLoading ? (
              <p>Loading internal inventory data...</p>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '400px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Branch ID</th>
                      <th>Current Stock</th>
                      <th>Min Threshold</th>
                      <th>Max Threshold</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributionData.filter(item => {
                      const branch = branches.find(b => b.branch_id === item.branch_id);
                      return branch && branch.status !== 'closed';
                    }).map((item) => (
                      <tr key={item.inventory_id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.branch_name || `Branch ${item.branch_id}`}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Last updated: {new Date(item.last_updated).toLocaleDateString()}</div>
                        </td>
                        <td>
                          <span className={`stock-badge ${item.quantity <= item.min_threshold ? 'low' : 'ok'}`}>
                            {item.quantity} {selectedProduct.unit || 'pcs'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="number"
                              defaultValue={item.min_threshold}
                              onBlur={(e) => updateThresholds(item.inventory_id, e.target.value, item.max_threshold)}
                              style={{ width: '80px', padding: '4px' }}
                            />
                            <button
                              className="primary-btn"
                              style={{ padding: '4px 8px', fontSize: '11px', background: '#f8fafc', color: '#6366f1', border: '1px solid #e2e8f0' }}
                              onClick={() => window.location.href = `/admin/transfers?product_id=${selectedProduct.product_id || selectedProduct.id}&to_branch=${item.branch_id}`}
                            >
                              Transfer
                            </button>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            defaultValue={item.max_threshold}
                            onBlur={(e) => updateThresholds(item.inventory_id, item.min_threshold, e.target.value)}
                            style={{ width: '80px', padding: '4px' }}
                          />
                        </td>
                        <td>
                          <button
                            className="secondary-btn"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => openAdjustment(item)}
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {adjustTarget && (
              <div style={{
                marginTop: '15px', padding: '15px', background: '#f8fafc',
                border: '1px solid #cbd5e1', borderRadius: '8px'
              }}>
                <h4 style={{ marginTop: 0, marginBottom: '10px' }}>Adjust Stock: {adjustTarget.branch_name}</h4>
                <form onSubmit={submitAdjustment} style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'auto 1fr 2fr auto' }}>
                  <select
                    value={adjustForm.type}
                    onChange={e => setAdjustForm({ ...adjustForm, type: e.target.value })}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="add">Add (+)</option>
                    <option value="subtract">Subtract (-)</option>
                    <option value="set">Set (=)</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={adjustForm.quantity}
                    onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    required
                  />
                  <input
                    placeholder="Reason (Optional)"
                    value={adjustForm.reason}
                    onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button type="submit" className="primary-btn" style={{ padding: '8px 16px' }}>Save</button>
                    <button type="button" className="secondary-btn" onClick={() => setAdjustTarget(null)} style={{ padding: '8px' }}>✕</button>
                  </div>
                </form>
              </div>
            )}

            <button
              className="primary-btn"
              style={{ width: '100%', marginTop: '20px', background: '#f1f5f9', color: '#475569' }}
              onClick={() => setSelectedProduct(null)}
            >
              Close Distribution View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
