import { useEffect, useState } from "react";
import api from "../../services/api";
import { useConfirm } from "../../components/ConfirmContext";
import { useToast } from "../../components/ToastContext";

export default function SupplierManagement() {
    const { showConfirm } = useConfirm();
    const { showToast } = useToast();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
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
            showToast("Failed to load supplier network", "error");
        }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) {
                showToast("Invalid mobile number format", "warning");
                setLoading(false);
                return;
            }

            if (editingSupplier) {
                await api.suppliers.update(editingSupplier.supplier_id, form);
                showToast("Supplier relationship updated", "success");
            } else {
                await api.suppliers.create(form);
                showToast("New supplier onboarded successfully", "success");
            }
            setForm({ name: "", contact_person: "", phone: "", email: "", address: "" });
            setEditingSupplier(null);
            await loadSuppliers();
        } catch (err) {
            showToast(err.response?.data?.message || err.message, "error");
        }
        setLoading(false);
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
        // Smooth scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!(await showConfirm("Are you sure you want to terminate this supplier relationship? This may affect linked inventory.", "Purge Supplier"))) return;
        try {
            await api.suppliers.delete(id);
            showToast("Supplier purged from system", "success");
            await loadSuppliers();
        } catch (err) {
            showToast(err.response?.data?.message || err.message, "error");
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.contact_person || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ padding: '0 0 40px' }}>
            {/* ================= HEADER ================= */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>Suppliers</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>Manage product vendors and procurement contacts</p>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ backgroundColor: '#fff', padding: '12px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                            <i className="fas fa-truck-moving"></i>
                        </div>
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>{suppliers.length}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Active Vendors</div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 400px) 1fr', gap: '32px', alignItems: 'start' }}>
                {/* ================= ONBOARDING FORM ================= */}
                <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', position: 'sticky', top: '24px' }}>
                    <h3 style={{ margin: '0 0 24px', fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>
                        {editingSupplier ? "Update Supplier" : "Add New Supplier"}
                    </h3>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Business Name *</label>
                            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 600 }} required placeholder="e.g. Acme Logistics Corp" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Contact Person</label>
                            <input type="text" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }} placeholder="Primary contact name" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Direct Phone</label>
                                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }} placeholder="10 digits" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Official Email</label>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }} placeholder="vendor@corp.com" />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>HQ Address</label>
                            <textarea rows="3" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', resize: 'none' }} placeholder="Registered business address..."></textarea>
                        </div>
                        <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
                            <button type="submit" disabled={loading} style={{ padding: '14px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3)' }}>
                                {loading ? "SAVING..." : (editingSupplier ? "UPDATE SUPPLIER" : "ADD SUPPLIER")}
                            </button>
                            {editingSupplier && (
                                <button type="button" onClick={() => { setEditingSupplier(null); setForm({ name: "", contact_person: "", phone: "", email: "", address: "" }); }} style={{ padding: '14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}>
                                    CANCEL REVISION
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* ================= SUPPLIER DIRECTORY ================= */}
                <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                    <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>Vendor Directory</h3>
                        <div style={{ position: 'relative', width: '280px' }}>
                            <i className="fas fa-search" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}></i>
                            <input type="text" placeholder="Search by name or principal..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }} />
                        </div>
                    </div>

                    {suppliers.length === 0 ? (
                        <div style={{ padding: '100px 0', textAlign: 'center' }}>
                            <i className="fas fa-users-slash" style={{ fontSize: '48px', color: '#e2e8f0', marginBottom: '20px' }}></i>
                            <p style={{ fontWeight: 600, color: '#94a3b8' }}>No identified external vendors in the matrix</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr>
                                        <th className="table-header-th" style={{ textAlign: 'left' }}>Vendor Identity</th>
                                        <th className="table-header-th" style={{ textAlign: 'left' }}>Primary Principal</th>
                                        <th className="table-header-th" style={{ textAlign: 'left' }}>Rel. Metadata</th>
                                        <th className="table-header-th" style={{ textAlign: 'right' }}>Management</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSuppliers.map(s => (
                                        <tr key={s.supplier_id} className="inventory-row">
                                            <td style={{ padding: '20px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800 }}>
                                                        <i className="fas fa-building"></i>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '15px' }}>{s.name}</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>PARTNER-ID: SUP-{s.supplier_id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px 0' }}>
                                                <div style={{ fontWeight: 700, color: '#475569', fontSize: '14px' }}>{s.contact_person || "Unspecified"}</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Lead Officer</div>
                                            </td>
                                            <td style={{ padding: '20px 0' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{s.phone || "No direct line"}</div>
                                                    <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700 }}>{s.email || "No digital contact"}</div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => startEdit(s)} style={{ background: '#f8faff', color: '#6366f1', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }} title="Edit Vendor Meta">
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(s.supplier_id)} style={{ background: '#fff1f2', color: '#e11d48', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }} title="Terminate Relationship">
                                                        <i className="fas fa-trash-alt"></i>
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
    );
}
