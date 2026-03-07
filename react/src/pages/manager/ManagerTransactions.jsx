import { useEffect, useState } from "react";
import api from "../../services/api";
import { formatDate } from "../../utils/dateUtils";
import { useConfirm } from "../../components/ConfirmContext";
import { useToast } from "../../components/ToastContext";

export default function ManagerTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchMobile, setSearchMobile] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [processingReturn, setProcessingReturn] = useState(false);
  const { showConfirm } = useConfirm();
  const { addToast } = useToast();

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};
  const branchId = loggedInUser.branch_id;

  /* ================= LOAD TRANSACTIONS ================= */
  useEffect(() => {
    const loadTransactions = async () => {
      if (!branchId) return;

      setLoading(true);
      try {
        const params = {};
        if (searchMobile) {
          if (!/^[6-9]\d{9}$/.test(searchMobile)) return; // Simple guard
          params.customer_mobile = searchMobile;
        }
        const res = await api.sales.getByBranch(branchId, params);

        const mapped = res.transactions.map(t => ({
          ...t,
          id: t.invoice_number || `#${t.transaction_id}`,
          date: formatDate(t.transaction_date),
          product: t.items ? t.items.map(i => i.product_name).join(", ") : "Item Details",
          quantity: t.items ? t.items.reduce((sum, i) => sum + i.quantity, 0) : 0,
          amount: t.total_amount,
          paymentMethod: t.payment_method
        }));

        setTransactions(mapped);
      } catch (err) {
        console.error("Failed to load transactions", err);
      }
      setLoading(false);
    };

    loadTransactions();
  }, [branchId, searchMobile]);

  const handleReturn = async (itemId) => {
    const confirmed = await showConfirm(
      "Are you sure you want to return this item? Inventory will be restored and the bill total will be adjusted.",
      "Confirm Item Return"
    );
    if (!confirmed) return;

    setProcessingReturn(true);
    try {
      await api.sales.returnItem(itemId);
      // Refresh data
      const res = await api.sales.getByBranch(branchId, { customer_mobile: searchMobile });
      const mapped = res.transactions.map(t => ({
        ...t,
        id: t.invoice_number || `#${t.transaction_id}`,
        date: formatDate(t.transaction_date),
        product: t.items ? t.items.map(i => i.product_name).join(", ") : "Item Details",
        quantity: t.items ? t.items.reduce((sum, i) => sum + i.quantity, 0) : 0,
        amount: t.total_amount,
        paymentMethod: t.payment_method
      }));
      setTransactions(mapped);

      // Update selected transaction view if open
      if (selectedTransaction) {
        const updated = mapped.find(t => t.transaction_id === selectedTransaction.transaction_id);
        setSelectedTransaction(updated);
      }

      addToast("Item returned successfully!", "success");
    } catch (err) {
      addToast("Failed to return item: " + (err.message || "Unknown error"), "error");
    }
    setProcessingReturn(false);
  };

  return (
    <div>

      <h2 style={{ marginBottom: "20px" }}>
        Branch Transactions
      </h2>

      {/* ================= SALES TABLE ================= */}
      <div className="table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>Recent Sales</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <i className="fas fa-search" style={{ color: '#64748b', fontSize: '13px' }}></i>
            <input
              type="text"
              placeholder="Search by Mobile..."
              value={searchMobile}
              onChange={(e) => setSearchMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              style={{ border: 'none', background: 'transparent', fontSize: '13px', outline: 'none', width: '150px' }}
            />
          </div>
        </div>

        {transactions.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
            {searchMobile ? "No transactions found for this mobile." : "No transactions available"}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Amount (₹)</th>
                <th>Payment</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((t, i) => (
                <tr key={i}>
                  <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{t.id}</code></td>
                  <td>{t.date}</td>
                  <td>{t.product}</td>
                  <td>{t.quantity}</td>
                  <td>₹{Number(t.amount || 0)}</td>
                  <td>{t.paymentMethod}</td>
                  <td>
                    <button
                      className="secondary-btn"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => setSelectedTransaction(t)}
                    >
                      <i className="fas fa-eye"></i> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ================= STAFF ACTIVITY ================= */}
      <div
        className="chart-card"
        style={{ marginTop: "30px" }}
      >
        <h3>Staff Activity Summary</h3>

        {transactions.length === 0 ? (
          <p>No staff activity recorded yet</p>
        ) : (
          <ul style={{ lineHeight: "1.8" }}>
            {transactions.slice(0, 5).map((t, i) => (
              <li key={i}>
                Sale of <strong>{t.product}</strong>{" "}
                (Qty: {t.quantity}) on{" "}
                <strong>{t.date}</strong> via{" "}
                <strong>{t.paymentMethod}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ================= TRANSACTION DETAILS MODAL ================= */}
      {selectedTransaction && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Transaction Details {selectedTransaction.id}</h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <div style={{ marginBottom: '20px', fontSize: '14px', color: '#475569' }}>
              <p><strong>Date:</strong> {selectedTransaction.date}</p>
              <p><strong>Status:</strong> <span style={{ textTransform: 'uppercase', color: selectedTransaction.status === 'voided' ? '#ef4444' : '#10b981' }}>{selectedTransaction.status}</span></p>
              <p><strong>Total Amount:</strong> ₹{selectedTransaction.total_amount.toFixed(2)}</p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ textAlign: 'left', fontSize: '12px', background: '#f8fafc' }}>
                  <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0' }}>Product</th>
                  <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0' }}>Qty</th>
                  <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0' }}>Price</th>
                  <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0' }}>Subtotal</th>
                  <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedTransaction.items?.map((item, idx) => (
                  <tr key={idx} style={{ fontSize: '13px', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px' }}>
                      {item.product_name}
                      {item.is_returned && <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#fee2e2', color: '#ef4444', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>RETURNED</span>}
                    </td>
                    <td style={{ padding: '10px' }}>{item.quantity}</td>
                    <td style={{ padding: '10px' }}>₹{item.unit_price}</td>
                    <td style={{ padding: '10px' }}>₹{item.subtotal}</td>
                    <td style={{ padding: '10px' }}>
                      {!item.is_returned && selectedTransaction.status !== 'voided' && (
                        <button
                          className="secondary-btn"
                          disabled={processingReturn}
                          onClick={() => handleReturn(item.item_id)}
                          style={{ padding: '4px 8px', fontSize: '11px', background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b' }}
                        >
                          <i className="fas fa-undo"></i> Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '25px', textAlign: 'right' }}>
              <button
                className="secondary-btn"
                onClick={() => setSelectedTransaction(null)}
                style={{ padding: '8px 20px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
