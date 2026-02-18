import { useEffect, useState } from "react";
import api from "../../services/api";

export default function SupplierManagement() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [message, setMessage] = useState("");
    const [editingSupplier, setEditingSupplier] = useState(null);

    const [form, setForm] = useState({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: ""
    });

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        setLoading(true);
        try {
            const res = await api.suppliers.getAll();
            setSuppliers(res.suppliers || []);
        } catch (err) {
            console.error("Failed to load suppliers:", err);
            setMessage("❌ Failed to load suppliers");
        }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingSupplier) {
                await api.suppliers.update(editingSupplier.supplier_id, form);
                setMessage("✅ Supplier updated successfully");
            } else {
                await api.suppliers.create(form);
                setMessage("✅ Supplier added successfully");
            }
            setForm({ name: "", contact_person: "", phone: "", email: "", address: "" });
            setEditingSupplier(null);
            await loadSuppliers();
        } catch (err) {
            setMessage("❌ " + (err.response?.data?.message || err.message));
        }
        setLoading(false);
        setTimeout(() => setMessage(""), 3000);
    };

    const startEdit = (supplier) => {
        setEditingSupplier(supplier);
        setForm({
            name: supplier.name,
            contact_person: supplier.contact_person || "",
            phone: supplier.phone || "",
            email: supplier.email || "",
            address: supplier.address || ""
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this supplier?")) return;
        try {
            await api.suppliers.delete(id);
            setMessage("✅ Supplier deleted");
            await loadSuppliers();
        } catch (err) {
            setMessage("❌ " + (err.response?.data?.message || err.message));
        }
        setTimeout(() => setMessage(""), 3000);
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.contact_person || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>🚚 Supplier Management</h2>
                {message && <div className={`alert ${message.startsWith('✅') ? 'alert-success' : 'alert-danger'} mb-0`}>{message}</div>}
            </div>

            <div className="row">
                {/* ADD/EDIT FORM */}
                <div className="col-md-4">
                    <div className="chart-card">
                        <h3>{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</h3>
                        <form onSubmit={handleSubmit} className="mt-3">
                            <div className="mb-3">
                                <label className="form-label">Supplier Name *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Contact Person</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.contact_person}
                                    onChange={e => setForm({ ...form, contact_person: e.target.value })}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Phone</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Address</label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={form.address}
                                    onChange={e => setForm({ ...form, address: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="d-grid gap-2">
                                <button type="submit" className="primary-btn" disabled={loading}>
                                    {loading ? "Processing..." : (editingSupplier ? "Update Supplier" : "Add Supplier")}
                                </button>
                                {editingSupplier && (
                                    <button type="button" className="secondary-btn" onClick={() => {
                                        setEditingSupplier(null);
                                        setForm({ name: "", contact_person: "", phone: "", email: "", address: "" });
                                    }}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* LIST */}
                <div className="col-md-8">
                    <div className="table-card">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h3>Supplier List</h3>
                            <input
                                type="text"
                                placeholder="Search suppliers..."
                                className="form-control"
                                style={{ width: '250px' }}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        {suppliers.length === 0 ? (
                            <p className="text-center py-4 text-muted">No suppliers found.</p>
                        ) : (
                            <div className="table-responsive">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Contact</th>
                                            <th>Phone/Email</th>
                                            <th>Address</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSuppliers.map(s => (
                                            <tr key={s.supplier_id}>
                                                <td><strong>{s.name}</strong></td>
                                                <td>{s.contact_person || "-"}</td>
                                                <td style={{ fontSize: '12px' }}>
                                                    <div>{s.phone || "-"}</div>
                                                    <div className="text-muted">{s.email || "-"}</div>
                                                </td>
                                                <td style={{ fontSize: '12px', maxWidth: '200px' }} className="text-truncate">
                                                    {s.address || "-"}
                                                </td>
                                                <td>
                                                    <div className="d-flex gap-2">
                                                        <button
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => startEdit(s)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => handleDelete(s.supplier_id)}
                                                        >
                                                            Delete
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
                </div>
            </div>
        </div>
    );
}
