import { useEffect, useState } from "react";
import { formatDate } from "../../utils/dateUtils";
import api, { API_BASE_URL } from "../../services/api";
import { useToast } from "../../components/ToastContext";
import { useConfirm } from "../../components/ConfirmContext";

const tableStyles = `
  .inventory-row:hover {
    background-color: #f8faff !important;
    transition: all 0.2s ease;
  }
  .table-header-th {
    padding: 16px 12px;
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;


export default function AdminInventory({ setActiveSection }) {
  const calculateUnits = (stock, stockUnit, sizeStr) => {
    if (!sizeStr || stock === undefined) return null;
    
    const sUnit = (stockUnit || '').toLowerCase();
    const countUnits = ['pcs', 'pkt', 'piece', 'pieces', 'packet', 'packets', 'unit', 'units', 'tube', 'tubes', 'box', 'boxes'];
    
    // If we're already counting in units/pieces, the unit count is just the stock itself
    if (countUnits.includes(sUnit)) return stock;


    // Extract number and unit from size string (e.g. "500g", "1kg", "250 ml")
    const sizeMatch = sizeStr.match(/(\d+(\.\d+)?)\s*([a-zA-Z]+)?/);
    if (!sizeMatch) return null;
    
    const sizeVal = parseFloat(sizeMatch[1]);
    let sizeUnit = (sizeMatch[3] || sUnit || '').toLowerCase();
    
    if (sizeVal <= 0) return null;

    let convertedStock = stock;

    // Weight conversion (kg <-> g)
    const weightK = ['kg', 'kgs', 'kilogram', 'kilograms'];
    const weightG = ['g', 'gm', 'gram', 'grams'];
    
    if (weightK.includes(sUnit) && weightG.includes(sizeUnit)) {
      convertedStock = stock * 1000;
    } else if (weightG.includes(sUnit) && weightK.includes(sizeUnit)) {
      convertedStock = stock / 1000;
    }
    
    // Volume conversion (L <-> ml)
    const volL = ['l', 'lt', 'ltr', 'liter', 'litre'];
    const volM = ['ml', 'ml.', 'milliliter', 'millilitre'];
    if (volL.includes(sUnit) && volM.includes(sizeUnit)) {
      convertedStock = stock * 1000;
    } else if (volM.includes(sUnit) && volL.includes(sizeUnit)) {
      convertedStock = stock / 1000;
    }

    const units = convertedStock / sizeVal;
    if (units % 1 === 0) return units;
    return `~${units.toFixed(1)}`;
  };


  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
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
    mfg_date: "",
    expiry_date: "",
    is_b1g1: false, // New: B1G1 Offer
    supplier_id: "", // New: Supplier field
    branch_quantities: {} // New: Store qty per branch
  });
  const [suppliers, setSuppliers] = useState([]); // New: Suppliers list
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

  /* ========== CATEGORY → DEFAULT GST % (Indian GST 2026 Slabs) ========== */
  const categoryGSTMap = {
    "Dairy (Milk, Eggs, Cheese)": 5,    // Butter, ghee, cheese, condensed milk, eggs
    "Fruits": 0,                         // Fresh fruits are NIL rated
    "Vegetables": 0,                     // Fresh vegetables are NIL rated
    "Grains & Pulses": 5,               // Packaged cereals, flours, starches
    "Beverages": 18,                     // Mineral water, packaged drinks
    "Bakery Items": 5,                   // Pastries, cakes, biscuits, rusks
    "Snacks": 5,                         // Namkeens, bhujia, mixtures
    "Household Items": 18,               // Household articles, utensils
    "Personal Care": 18,                 // Cosmetics, skincare, hair products
    "Frozen Foods": 18,                  // Processed/preserved food items
    "Spices & Oils": 5                   // Spices, edible oils, condiments
  };
  const gstSlabs = [0, 5, 18, 40];

  const getUnitsForCategory = () => {
    const selectedCat = categories.find(c => String(c.category_id) === String(form.category_id));
    if (!selectedCat) return defaultUnits;
    return categoryUnitMap[selectedCat.name] || defaultUnits;
  };

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);
  const [predictingCat, setPredictingCat] = useState(false);
  const [aiPredicted, setAiPredicted] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importOverwrite, setImportOverwrite] = useState(false);

  /* ========== BULK DELETE UTILITIES ========== */
  const [selectedIds, setSelectedIds] = useState(new Set());

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all visible (filtered) products using variant_id
      const allIds = filteredProducts.map(p => p.variant_id || p.id);
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
    if (!(await showConfirm(`Are you sure you want to delete ${selectedIds.size} products? This cannot be undone.`, "Bulk Delete"))) return;

    setLoading(true);
    try {
      const res = await api.products.bulkDelete(Array.from(selectedIds));
      setMessage(`✅ ${res.message || "Bulk delete successful"}`);
      setSelectedIds(new Set());
      await loadProducts();
    } catch (err) {
      setMessage("❌ " + (err.response?.data?.message || err.message));
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
        const res = await fetch(`${API_BASE_URL}/products/imports`, {
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
    loadBranches();
    loadSuppliers(); // New
    loadSuggestions();
  }, []);

  const loadSuppliers = async () => {
    try {
      const res = await api.suppliers.getAll();
      setSuppliers(res.suppliers || []);
    } catch (err) {
      console.error("Failed to load suppliers", err);
    }
  };

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
      const res = await api.products.import(formData, importOverwrite ? "sync" : "add");
      let msg = `✅ ${res.message}`;
      if (res.updated > 0) {
        msg += ` (New: ${res.created}, Updated: ${res.updated})`;
      }
      if (res.skipped > 0) {
        msg += ` (${res.skipped} skipped)`;
      }
      if (res.errors && res.errors.length > 0) {
        msg += ` | ⚠️ ${res.errors.length} errors`;
      }
      setMessage(msg);
      if (res.errors && res.errors.length > 0) {
        showToast("Import Errors: " + res.errors.join(", "), "warning");
      }
      loadProducts();
      // Reload categories too as new ones might be added
      loadCategories();
    } catch (err) {
      showToast("Import Failed: " + (err.response?.data?.message || err.message), "error");
    }
    setImportLoading(false);
    // Reset input
    e.target.value = null;




  };

  const handleDownloadSample = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("loggedInUser"));
      const token = user?.access_token;

      const res = await fetch(`${API_BASE_URL}/products/download-sample`, {
        headers: { "Authorization": "Bearer " + token }
      });

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sample_inventory_template.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast("Download Failed: " + err.message, "error");
    }
  };
  const handleDownloadFile = async (filename) => {
    try {
      const user = JSON.parse(localStorage.getItem("loggedInUser"));
      const token = user?.access_token;

      const res = await fetch(`${API_BASE_URL}/products/imports/${filename}`, {
        headers: { "Authorization": "Bearer " + token }
      });

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast("Download Failed: " + err.message, "error");
    }
  };

  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);

  /* ========== DELETE IMPORT FILE ========== */
  const handleDeleteImport = async (filename) => {
    if (!(await showConfirm(`Delete import file "${filename}"? This cannot be undone.`, "Delete File"))) return;
    try {
      await api.products.deleteImport(filename);
      showToast("File deleted successfully!", "success");
      loadImportHistory();
    } catch (err) {
      showToast("Delete failed: " + (err.message || "Unknown error"), "error");
    }
  };

  /* ========== STOCK DISTRIBUTION MODAL ========== */
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [distributionData, setDistributionData] = useState([]);
  const [distLoading, setDistLoading] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ type: 'add', quantity: '', reason: '' });

  const loadDistribution = async (variant) => {
    setSelectedProduct(variant);
    setDistLoading(true);
    try {
      // Fetch this specific product size across all branches
      const [distRes, branchRes] = await Promise.all([
        api.inventory.getAll({ 
          product_id: variant.product_id, 
          size: variant.size, 
          per_page: 100 
        }),
        api.branches.getAll()
      ]);
      setDistributionData(distRes.inventory || []);
      setBranches(branchRes.branches || []);
    } catch (err) {
      console.error("Failed to load distribution:", err);
      setDistributionData([]);
    }
    setDistLoading(false);
  };

  /* ========== RETURN TO SUPPLIER MODAL ========== */
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnForm, setReturnForm] = useState({ product_id: null, branch_id: "", supplier_id: "", quantity: "", reason: "Returned to Supplier (Damaged/Expired)" });
  const [returnLoading, setReturnLoading] = useState(false);

  const openReturnModal = (variant) => {
    setReturnForm({ ...returnForm, variant_id: variant.variant_id || variant.id });
    setShowReturnModal(true);
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnForm.branch_id || !returnForm.quantity) {
      showToast("Please select branch and quantity", "warning");
      return;
    }
    setReturnLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("loggedInUser"));
      const token = user?.access_token;
      const res = await fetch(`${API_BASE_URL}/products/return`, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          variant_id: returnForm.variant_id,
          branch_id: returnForm.branch_id,
          quantity: Number(returnForm.quantity),
          supplier_id: returnForm.supplier_id,
          reason: returnForm.reason
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setShowReturnModal(false);
        loadProducts();
      } else {
        showToast(data.message, "error");
      }
    } catch (err) {
      showToast("Error processing return", "error");
    }
    setReturnLoading(false);
  };

  const updateThresholds = async (invId, min, max) => {
    try {
      await api.inventory.update(invId, {
        min_threshold: Number(min),
        max_threshold: Number(max)
      });
      setMessage("✅ Thresholds updated successfully");
      loadDistribution(selectedProduct);
    } catch (err) {
      showToast("Update failed: " + (err.response?.data?.message || err.message), "error");
    }
  };

  const openAdjustment = (item) => {
    setAdjustTarget(item);
    setAdjustForm({ type: 'add', quantity: '', reason: '' });
  };

  const submitAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustForm.quantity || Number(adjustForm.quantity) < 0) {
      showToast("Please enter a valid quantity", "warning");
      return;
    }

    try {
      await api.inventory.adjust({
        variant_id: selectedProduct.variant_id || selectedProduct.id,
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
      showToast("Adjustment failed: " + (err.response?.data?.message || err.message), "error");
    }
  };

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
      showToast("Transfer failed: " + (err.response?.data?.message || err.message), "error");
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
          const res = await fetch(`${API_BASE_URL}/categories/`, {
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

  const handleNameBlur = async () => {
    if (!form.name || form.name.length < 3 || form.category_id) return;

    setPredictingCat(true);
    try {
      const prediction = await api.products.predictCategory(form.name);
      if (prediction && prediction.category_id && prediction.confidence > 0.5) {
        setForm(prev => ({
          ...prev,
          category_id: String(prediction.category_id),
          // Also set unit based on predicted category if possible
          unit: prev.unit || (getUnitsForCategory(prediction.name)[0] || "")
        }));
        setAiPredicted(true);
        setTimeout(() => setAiPredicted(false), 5000);
      }
    } catch (err) {
      console.error("AI Category Prediction failed:", err);
    }
    setPredictingCat(false);
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
        unit: form.unit || undefined,
        size: form.size || undefined,
        discount_percent: Number(form.discount_percent) || 0,
        gst_percent: Number(form.gst_percent) || 0,
        mfg_date: form.mfg_date || null,
        expiry_date: form.expiry_date || null,
        is_b1g1: form.is_b1g1, // New
        supplier_id: form.supplier_id || null,
        branch_quantities: form.branch_quantities // Send detailed distribution
      });

      setMessage("✅ Product and inventory initialized across all branches");
      setForm({
        name: "", sku: "", barcode: "", description: "", price: "", cost_price: "",
        category_id: "", unit: "",
        size: "", discount_percent: "", gst_percent: "", mfg_date: "", expiry_date: "", is_b1g1: false,
        supplier_id: "",
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

  /* ================= UPDATE DISCOUNT ================= */
  const updateDiscount = async (id, value) => {
    try {
      await api.products.update(id, { discount_percent: Number(value) });
      setMessage("✅ Discount updated");
      await loadProducts();
    } catch (err) {
      setMessage("❌ " + (err.message || "Failed to update discount"));
    }
    setTimeout(() => setMessage(""), 2500);
  };

  /* ================= UPDATE B1G1 ================= */
  const updateB1G1 = async (id, value) => {
    try {
      await api.products.update(id, { is_b1g1: value });
      setMessage(value ? "🎉 Method B1G1 Activated" : "🚫 Method B1G1 Deactivated");
      await loadProducts();
    } catch (err) {
      setMessage("❌ " + (err.message || "Failed to update offer"));
    }
    setTimeout(() => setMessage(""), 2500);
  };

  /* ================= DELETE PRODUCT ================= */
  const deleteProduct = async (id) => {
    if (!(await showConfirm("Delete this product?", "Delete Product"))) return;

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
      <style>{tableStyles}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", paddingBottom: '24px', borderBottom: '1px solid #f1f5f9' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>Inventory Assets</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Manage global stock levels and product distribution</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            style={{
              background: 'linear-gradient(135deg, #4338ca, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              cursor: 'pointer',
              border: 'none',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(67, 56, 202, 0.2)',
              transition: 'all 0.2s ease'
            }}
            onClick={async () => {
              if (!(await showConfirm('Update GST rates for ALL existing products based on their category? This will apply: Fruits/Vegetables → 0%, Dairy/Grains/Bakery/Snacks/Spices → 5%, Beverages/Household/Personal Care/Frozen → 18%', 'Sync GST Rates'))) return;
              try {
                const res = await api.products.updateGST();
                setMessage(`✅ ${res.message}`);
                loadProducts();
              } catch (err) {
                setMessage('❌ ' + (err.message || 'Failed to update GST'));
              }
              setTimeout(() => setMessage(""), 3000);
            }}
          >
            <i className="fas fa-file-invoice"></i> Sync GST Rates
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
                <input 
                  type="checkbox" 
                  id="overwrite-toggle"
                  checked={importOverwrite}
                  onChange={(e) => setImportOverwrite(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: '#4338ca' }}
                />
                <label htmlFor="overwrite-toggle" style={{ fontSize: '11px', fontWeight: 700, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Overwrite Stock
                </label>
              </div>

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
                  style={{
                    cursor: importLoading ? 'wait' : 'pointer',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    color: '#1e293b',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 700,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  <i className="fas fa-file-import" style={{ color: '#10b981' }}></i>
                  {importLoading ? "Processing..." : "Import Excel"}
                </label>
              </div>
            </div>
            {importOverwrite && (
               <span style={{ fontSize: '10px', color: '#e11d48', fontWeight: 600, marginRight: '4px' }}>
                 ⚠️ Existing stocks for matching items will be replaced
               </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '14px', width: 'fit-content', gap: '4px' }}>
          <button
            onClick={() => setActiveTab("all")}
            style={{
              padding: '10px 24px', borderRadius: '10px', border: 'none',
              background: activeTab === 'all' ? '#fff' : 'transparent',
              color: activeTab === 'all' ? '#1e293b' : '#64748b',
              boxShadow: activeTab === 'all' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
              fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease',
              fontSize: '13px'
            }}
          >
            <i className="fas fa-boxes-stacked" style={{ marginRight: '8px' }}></i> All Inventory
          </button>
          <button
            onClick={() => setActiveTab("rebalance")}
            style={{
              padding: '10px 24px', borderRadius: '10px', border: 'none',
              background: activeTab === 'rebalance' ? '#fff' : 'transparent',
              color: activeTab === 'rebalance' ? '#1e293b' : '#64748b',
              boxShadow: activeTab === 'rebalance' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s ease', fontSize: '13px'
            }}
          >
            <i className="fas fa-balance-scale" style={{ color: '#6366f1' }}></i> AI Rebalancing
            {suggestions.length > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>{suggestions.length}</span>}
          </button>
          <button
            onClick={() => { setActiveTab("history"); loadImportHistory(); }}
            style={{
              padding: '10px 24px', borderRadius: '10px', border: 'none',
              background: activeTab === 'history' ? '#fff' : 'transparent',
              color: activeTab === 'history' ? '#1e293b' : '#64748b',
              boxShadow: activeTab === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s ease', fontSize: '13px'
            }}
          >
            <i className="fas fa-history" style={{ color: '#94a3b8' }}></i> Audit Logs
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

      {/* ================= ADD PRODUCT FORM ================= */}
      {activeTab === 'all' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.1)', marginBottom: '32px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <i className="fas fa-plus"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>Add New Product</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Enter product details and distribute initial stock</p>
            </div>
          </div>

          <form onSubmit={addProduct}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              {/* SECTION: Identity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Core Identity</h4>

                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>PRODUCT NAME *</label>
                  <input
                    placeholder="e.g. Organic Almond Milk"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    onBlur={handleNameBlur}
                    disabled={loading}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', transition: 'all 0.2s ease' }}
                    required
                  />
                  {predictingCat && <span style={{ fontSize: '10px', color: '#6366f1', position: 'absolute', right: '12px', top: '35px' }}>✨ AI Analyzing...</span>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>SKU (OPTIONAL)</label>
                    <input
                      placeholder="SKU-001"
                      value={form.sku}
                      onChange={e => setForm({ ...form, sku: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>BARCODE</label>
                    <input
                      placeholder="EAN-13"
                      value={form.barcode}
                      onChange={e => setForm({ ...form, barcode: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>DESCRIPTION</label>
                  <textarea
                    placeholder="Briefly describe the product..."
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', minHeight: '80px', resize: 'none' }}
                  />
                </div>
              </div>

              {/* SECTION: Categorization & Supplier */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categorization</h4>

                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>CATEGORY *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={form.category_id}
                      onChange={e => {
                        const catId = e.target.value;
                        const selectedCat = categories.find(c => String(c.category_id) === String(catId));
                        const defaultGST = selectedCat ? (categoryGSTMap[selectedCat.name] ?? "") : "";
                        setForm({ ...form, category_id: catId, unit: "", gst_percent: defaultGST !== "" ? String(defaultGST) : form.gst_percent });
                      }}
                      style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', backgroundColor: '#fff' }}
                      required
                    >
                      <option value="">{loadingCats ? "Loading..." : "Select Category"}</option>
                      {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowNewCat(!showNewCat)} style={{ width: '46px', padding: 0, borderRadius: '12px', border: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#6366f1', cursor: 'pointer', fontSize: '18px' }}>
                      <i className={showNewCat ? "fas fa-minus" : "fas fa-plus"}></i>
                    </button>
                  </div>
                  {aiPredicted && <span style={{ position: 'absolute', right: '55px', top: '10px', fontSize: '10px', fontWeight: 800, color: '#6366f1' }}>✨ AI SMART SET</span>}
                </div>

                {showNewCat && (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px dotted #cbd5e1', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input placeholder="New Category Name" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <button type="button" onClick={handleCreateCategory} className="primary-btn" style={{ fontSize: '12px', padding: '8px' }}>Initialize Category</button>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>PREMIUM SUPPLIER *</label>
                  <select
                    value={form.supplier_id}
                    onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', backgroundColor: '#fff' }}
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>SIZE/VARIANT</label>
                    <input placeholder="e.g. 500g, 1L" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>UNIT</label>
                    <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', backgroundColor: '#fff' }} required>
                      <option value="">Unit</option>
                      {getUnitsForCategory().map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>MANUFACTURING DATE</label>
                    <input type="date" value={form.mfg_date} onChange={e => setForm({ ...form, mfg_date: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', backgroundColor: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>EXPIRY DATE</label>
                    <input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', backgroundColor: '#fff' }} />
                  </div>
                </div>
              </div>

              {/* SECTION: Financials & Distribution */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Financials & Distribution</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>SELL PRICE (INR) *</label>
                    <input type="number" placeholder="0.00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 800 }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>COST PRICE</label>
                    <input type="number" placeholder="0.00" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }} />
                  </div>
                </div>

                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h5 style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Branch Allocation</h5>
                    <span style={{ fontSize: '10px', background: '#6366f1', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                      TOTAL: {Object.values(form.branch_quantities || {}).reduce((a, b) => a + (Number(b) || 0), 0)}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {branches.filter(b => b.status !== 'closed').map(b => (
                      <div key={b.branch_id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', flex: 1 }}>{b.name}</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={form.branch_quantities?.[b.branch_id] || ""}
                          onChange={e => setForm({ ...form, branch_quantities: { ...form.branch_quantities, [b.branch_id]: e.target.value } })}
                          style={{ width: '60px', padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', textAlign: 'center' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" style={{ marginTop: 'auto', padding: '16px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '15px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3)', transition: 'all 0.2s ease' }}>
                  Save Product & Stock →
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ================= SEARCH & ACTIONS ================= */}
      {activeTab === 'all' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: '#fff', padding: '16px 24px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={loadProducts}
              style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              disabled={loading}
            >
              <i className={loading ? "fas fa-spinner fa-spin" : "fas fa-sync-alt"}></i>
              {loading ? "Refreshing..." : "Refresh Stock"}
            </button>
            <div style={{ height: '24px', width: '1px', background: '#e2e8f0', margin: '0 8px' }}></div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              Showing {filteredProducts.length} unique items
            </span>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                style={{ background: '#fee2e2', color: '#e11d48', padding: '10px 20px', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fas fa-trash-alt"></i> Purge Selected ({selectedIds.size})
              </button>
            )}

            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}></i>
              <input
                placeholder="Search global inventory..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '320px', padding: '12px 16px 12px 48px', borderRadius: '14px', border: '1.5px solid #e2e8f0', fontSize: '14px', transition: 'all 0.2s ease', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= TABS CONTENT ================= */}
      {activeTab === 'all' ? (
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '48px', padding: '16px 24px', background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                    />
                  </th>
                  <th className="table-header-th" style={{ textAlign: 'left' }}>Product Details</th>
                  <th className="table-header-th" style={{ textAlign: 'left' }}>Category</th>
                  <th className="table-header-th" style={{ textAlign: 'left' }}>Expiry Info</th>
                  <th className="table-header-th" style={{ textAlign: 'center' }}>Global Stock (All Branches)</th>
                  <th className="table-header-th" style={{ textAlign: 'center' }}>Offer (B1G1)</th>
                  <th className="table-header-th" style={{ textAlign: 'left' }}>Discount %</th>
                  <th className="table-header-th" style={{ textAlign: 'left' }}>Price</th>
                  <th className="table-header-th" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map(p => {
                  const isExpired = p.expiry_date && new Date(p.expiry_date) < new Date();
                  const isOutOfStock = (p.total_stock || 0) === 0;
                  const isLowStock = p.low_stock_branches > 0;

                    return (
                    <tr
                      key={p.variant_id || p.id}
                      className="inventory-row"
                      style={{
                        backgroundColor: isExpired ? '#fff1f2' : (selectedIds.has(p.variant_id || p.id) ? '#f5f7ff' : 'transparent'),
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
                      <td style={{ padding: '16px 24px' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.variant_id || p.id)}
                          onChange={() => handleSelectOne(p.variant_id || p.id)}
                        />
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '14px' }}>
                              {p.name} {p.size && <span style={{ color: '#6366f1', marginLeft: '4px' }}>({p.size})</span>}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, fontFamily: 'monospace' }}>{p.sku || '---'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#6366f1', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px', width: 'fit-content' }}>
                            {p.category?.name || 'Uncategorized'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{p.supplier_name || 'Generic Supplier'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ fontSize: '11px', lineHeight: '1.5' }}>
                          <div style={{ color: '#64748b' }}>MFG: {p.mfg_date ? formatDate(p.mfg_date) : '--'}</div>
                          <div style={{ fontWeight: 700, color: isExpired ? '#e11d48' : '#64748b' }}>
                            EXP: {p.expiry_date ? formatDate(p.expiry_date) : '--'}
                            {isExpired && <span style={{ marginLeft: '4px', background: '#ffe4e6', color: '#e11d48', padding: '1px 4px', borderRadius: '4px', fontSize: '9px' }}>CRITICAL</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                        <div 
                          onClick={() => loadDistribution(p)}
                          style={{ 
                            display: 'inline-flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '12px',
                            transition: 'all 0.2s ease',
                            backgroundColor: 'transparent'
                          }}
                          className="stock-hover-reveal"
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ fontSize: '14px', fontWeight: 800, color: isOutOfStock ? '#e11d48' : '#1e293b' }}>
                            {p.total_stock || 0} <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>{p.unit || 'pcs'}</span>
                          </div>
                          {p.size && calculateUnits(p.total_stock || 0, p.unit, p.size) && (
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', marginTop: '2px' }}>
                              {calculateUnits(p.total_stock || 0, p.unit, p.size)} units <span style={{ fontSize: '9px', opacity: 0.7 }}>({p.size})</span>
                            </div>
                          )}
                          <div style={{ fontSize: '9px', fontWeight: 800, color: '#6366f1', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            View Branches
                          </div>
                          {isLowStock && (
                            <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 800, marginTop: '4px' }}>⚠️ LOW IN {p.low_stock_branches} BR</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => updateB1G1(p.variant_id || p.id, !p.is_b1g1)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', transition: 'transform 0.2s' }}
                        >
                          <i className={`fas ${p.is_b1g1 ? 'fa-toggle-on text-indigo-600' : 'fa-toggle-off text-gray-300'}`} style={{ fontSize: '24px', color: p.is_b1g1 ? '#6366f1' : '#cbd5e1' }}></i>
                        </button>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ position: 'relative', width: '80px' }}>
                          <input
                            type="number"
                            value={p.discount_percent || 0}
                            onChange={e => updateDiscount(p.variant_id || p.id, e.target.value)}
                            style={{ width: '100%', padding: '6px 20px 6px 8px', borderRadius: '8px', border: '1.5px solid #f1f5f9', fontSize: '13px', fontWeight: 800, color: '#16a34a', textAlign: 'right' }}
                          />
                          <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#16a34a', fontWeight: 800 }}>%</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ position: 'relative', width: '90px' }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#94a3b8', fontWeight: 800 }}>₹</span>
                          <input
                            type="number"
                            value={p.unit_price || p.price || 0}
                            onChange={e => updatePrice(p.variant_id || p.id, e.target.value)}
                            style={{ width: '100%', padding: '6px 8px 6px 20px', borderRadius: '8px', border: '1.5px solid #f1f5f9', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => loadDistribution(p)} style={{ background: '#f8faff', color: '#6366f1', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} title="Full Distribution">
                            <i className="fas fa-warehouse"></i>
                          </button>
                          <button onClick={() => openReturnModal(p)} style={{ background: '#fff1f2', color: '#e11d48', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} title="Return to Supplier">
                            <i className="fas fa-undo"></i>
                          </button>
                          <button onClick={() => deleteProduct(p.variant_id || p.id)} style={{ background: '#f8fafc', color: '#94a3b8', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }} title="Remove Record">
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'rebalance' ? (
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>Stock Rebalancing</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Optimize stock from High-Stock → Low-Stock branches</p>
            </div>
            <button onClick={loadSuggestions} disabled={sugLoading} style={{ padding: '10px 16px', background: '#f1f5f9', color: '#6366f1', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              <i className={sugLoading ? "fas fa-spinner fa-spin" : "fas fa-sync"}></i> Refresh Suggestions
            </button>
          </div>

          {suggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 32px', backgroundColor: '#f8fafc', borderRadius: '20px' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: '#dcfce7', color: '#059669', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px' }}>
                <i className="fas fa-check-circle"></i>
              </div>
              <h4 style={{ margin: 0, color: '#1e293b', fontSize: '18px', fontWeight: 800 }}>Supply Logic Balanced</h4>
              <p style={{ color: '#64748b', marginTop: '8px' }}>Global inventory is currently distributed with 100% efficiency.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th className="table-header-th">Target Product</th>
                    <th className="table-header-th">Origin (High)</th>
                    <th className="table-header-th">Target (Low)</th>
                    <th className="table-header-th" style={{ textAlign: 'center' }}>Smart Quantity</th>
                    <th className="table-header-th" style={{ textAlign: 'right' }}>Authorization</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((sug, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 0' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b' }}>{sug.product_name} {sug.size && <span style={{ color: '#6366f1' }}>{sug.size} {sug.unit}</span>}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>#{sug.product_id}</div>
                      </td>
                      <td style={{ padding: '16px 0' }}>
                        <div style={{ color: '#059669', fontWeight: 700 }}>{sug.from_branch_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Critical Surplus</div>
                      </td>
                      <td style={{ padding: '16px 0' }}>
                        <div style={{ color: '#e11d48', fontWeight: 700 }}>{sug.to_branch_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Stock Depleted</div>
                      </td>
                      <td style={{ padding: '16px 0', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', backgroundColor: '#f0f9ff', borderRadius: '10px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0369a1' }}>{sug.suggested_quantity}</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>units</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 0', textAlign: 'right' }}>
                        <button onClick={() => quickTransfer(sug)} style={{ background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(67, 56, 202, 0.2)' }}>
                          Authorize Move →
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
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>Import History</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Review of batch inventory updates via Excel</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleDownloadSample}
                style={{ padding: '10px 16px', background: '#fff', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fas fa-file-download"></i> Sample Template
              </button>
              <button onClick={loadImportHistory} style={{ padding: '10px 16px', background: '#f1f5f9', color: '#6366f1', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                <i className="fas fa-sync"></i> Refresh
              </button>
            </div>
          </div>

          {importHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
              <i className="fas fa-folder-open" style={{ fontSize: '32px', opacity: 0.3, marginBottom: '16px' }}></i>
              <p style={{ margin: 0 }}>No audit logs identified.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th className="table-header-th">Resource Name</th>
                    <th className="table-header-th">Timestamp</th>
                    <th className="table-header-th">Payload Size</th>
                    <th className="table-header-th" style={{ textAlign: 'right' }}>Management</th>
                  </tr>
                </thead>
                <tbody>
                  {importHistory.map((file, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <i className="fas fa-file-excel" style={{ color: '#10b981' }}></i>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>{file.filename}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 0', fontSize: '13px', color: '#64748b' }}>{new Date(file.uploaded_at).toLocaleString()}</td>
                      <td style={{ padding: '16px 0' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px' }}>
                          {(file.size / 1024).toFixed(2)} KB
                        </span>
                      </td>
                      <td style={{ padding: '16px 0', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleDownloadFile(file.filename)} style={{ background: '#f1f5f9', color: '#4338ca', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                            <i className="fas fa-download"></i> Download
                          </button>
                          <button onClick={() => handleDeleteImport(file.filename)} style={{ background: '#fff1f2', color: '#e11d48', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                            <i className="fas fa-trash-alt"></i> Delete
                          </button>
                        </div>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setSelectedProduct(null)}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '900px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'modalSlideUp 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 32px', background: 'linear-gradient(135deg, #1e293b, #334155)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Supply Intelligence: {selectedProduct.name} {selectedProduct.size && `(${selectedProduct.size})`}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.7, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cross-Branch Inventory Audit • {selectedProduct.sku || '---'}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', width: '36px', height: '36px', borderRadius: '10px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: '32px', maxHeight: '70vh', overflowY: 'auto' }}>
              {distLoading ? (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  <div className="fas fa-circle-notch fa-spin" style={{ fontSize: '32px', color: '#6366f1', marginBottom: '16px' }}></div>
                  <p style={{ fontWeight: 600, color: '#64748b' }}>Synthesizing distribution data...</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
                    {branches.filter(b => b.status !== 'closed').map((branch) => {
                      const item = (distributionData || []).find(d => d.branch_id === branch.branch_id);
                      const qty = item ? item.quantity : 0;
                      const lastUpdated = item ? item.last_updated : null;
                      const invId = item ? item.inventory_id : null;
                      const minT = item ? item.min_threshold : 0;
                      const maxT = item ? item.max_threshold : 0;

                      return (
                        <div key={branch.branch_id} style={{ padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '15px' }}>{branch.name}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Last Sync: {lastUpdated ? formatDate(lastUpdated) : 'N/A'}</div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8' }}>MIN</span>
                                <input 
                                  type="number" 
                                  disabled={!invId}
                                  defaultValue={minT} 
                                  onBlur={(e) => invId && updateThresholds(invId, e.target.value, maxT)} 
                                  style={{ width: '50px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', textAlign: 'center', opacity: invId ? 1 : 0.5 }} 
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8' }}>MAX</span>
                                <input 
                                  type="number" 
                                  disabled={!invId}
                                  defaultValue={maxT} 
                                  onBlur={(e) => invId && updateThresholds(invId, minT, e.target.value)} 
                                  style={{ width: '50px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', textAlign: 'center', opacity: invId ? 1 : 0.5 }} 
                                />
                              </div>
                              {!invId && <div style={{ fontSize: '9px', color: '#6366f1', marginTop: '14px', fontStyle: 'italic' }}>* Use 'Adjust' to initialize</div>}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '24px', fontWeight: 900, color: qty <= minT ? '#e11d48' : '#1e293b' }}>
                              {qty} <span style={{ fontSize: '12px', color: '#94a3b8' }}>{selectedProduct.size ? 'units' : (selectedProduct.unit || 'pcs')}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', justifyContent: 'flex-end' }}>
                              <button onClick={() => openAdjustment(item || { branch_id: branch.branch_id, branch_name: branch.name, product_id: selectedProduct.product_id, variant_id: selectedProduct.variant_id })} style={{ padding: '6px 12px', background: '#fff', color: '#6366f1', border: '1px solid #e0e7ff', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Adjust</button>
                              <button onClick={() => setActiveSection('transfers')} style={{ padding: '6px 12px', background: '#eff6ff', color: '#1e40af', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Move</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {adjustTarget && (
                    <div style={{ marginTop: '16px', padding: '24px', backgroundColor: '#f5f7ff', borderRadius: '20px', border: '2px dashed #6366f1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#4338ca' }}>Adjust Stock: {adjustTarget.branch_name}</h4>
                        <button onClick={() => setAdjustTarget(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><i className="fas fa-times"></i></button>
                      </div>
                      <form onSubmit={submitAdjustment} style={{ display: 'grid', gridTemplateColumns: '120px 100px 1fr 100px', gap: '12px', alignItems: 'center' }}>
                        <select value={adjustForm.type} onChange={e => setAdjustForm({ ...adjustForm, type: e.target.value })} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                          <option value="add">Add (+)</option>
                          <option value="subtract">Subtract (-)</option>
                          <option value="set">Hard Set (=)</option>
                        </select>
                        <input type="number" placeholder="Qty" value={adjustForm.quantity} onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px' }} required />
                        <input placeholder="Calibration reason..." value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                        <button type="submit" style={{ padding: '10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>Save</button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '24px 32px', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
              <button onClick={() => setSelectedProduct(null)} style={{ padding: '12px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>Dismiss Intel</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= RETURN TO SUPPLIER MODAL ================= */}
      {showReturnModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowReturnModal(false)}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '450px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'modalSlideUp 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 32px', background: '#e11d48', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Reverse Logistics</h3>
                <p style={{ margin: '2px 0 0', fontSize: '11px', opacity: 0.8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Supplier Return Authorization</p>
              </div>
              <button onClick={() => setShowReturnModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', width: '32px', height: '32px', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}><i className="fas fa-times"></i></button>
            </div>

            <form onSubmit={handleReturnSubmit} style={{ padding: '32px' }}>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{ padding: '16px', background: '#fff1f2', borderRadius: '12px', border: '1px solid #ffe4e6', color: '#9f1239', fontSize: '12px', lineHeight: '1.5' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                  Record stock being returned to the supplier (Damaged/Exp). This will deduct count from local branch inventory.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Source Branch</label>
                  <select value={returnForm.branch_id} onChange={e => setReturnForm({ ...returnForm, branch_id: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', backgroundColor: '#fff' }} required>
                    <option value="">Choose Branch...</option>
                    {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Target Supplier</label>
                  <select value={returnForm.supplier_id} onChange={e => setReturnForm({ ...returnForm, supplier_id: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', backgroundColor: '#fff' }} required>
                    <option value="">Select Supplier...</option>
                    {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Quantity</label>
                    <input type="number" value={returnForm.quantity} onChange={e => setReturnForm({ ...returnForm, quantity: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 800 }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Return Reason</label>
                    <input value={returnForm.reason} onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }} placeholder="e.g. Broken seal" />
                  </div>
                </div>

                <button type="submit" style={{ marginTop: '12px', padding: '16px', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '15px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(225, 29, 72, 0.3)' }}>
                  {returnLoading ? "Processing Return..." : "Confirm Return Authorization →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
