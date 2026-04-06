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
  const { showToast } = useToast();

  const user = JSON.parse(localStorage.getItem("loggedInUser")) || {};
  const branchId = user.branch_id;

  useEffect(() => {
    loadTransactions();
  }, [branchId, searchMobile]);

  const loadTransactions = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const params = {};
      if (searchMobile && /^[6-9]\d{9}$/.test(searchMobile)) params.customer_mobile = searchMobile;
      const res = await api.sales.getByBranch(branchId, params);
      const mapped = res.transactions.map(t => ({
        ...t,
        invoiceId: t.invoice_number || `TXN-${t.transaction_id}`,
        formattedDate: formatDate(t.transaction_date),
        productSummary: t.items ? t.items.map(i => i.product_name).join(", ") : "No items",
      }));
      setTransactions(mapped);
    } catch (err) { console.error("Sales Load Err:", err); }
    setLoading(false);
  };

  const handleReturn = async (itemId) => {
    const confirmed = await showConfirm("Are you sure you want to return this item? This will update the stock and refund the amount.", "Return Item");
    if (!confirmed) return;

    setProcessingReturn(true);
    try {
      await api.sales.returnItem(itemId);
      await loadTransactions();
      if (selectedTransaction) {
        const res = await api.sales.getByBranch(branchId, { customer_mobile: searchMobile });
        const updated = res.transactions.find(t => t.transaction_id === selectedTransaction.transaction_id);
        if(updated) {
           updated.invoiceId = updated.invoice_number || `TXN-${updated.transaction_id}`;
           updated.formattedDate = formatDate(updated.transaction_date);
           setSelectedTransaction(updated);
        }
      }
      showToast("Item return successful", "success");
    } catch (err) { showToast("Return failed: " + err.message, "error"); }
    setProcessingReturn(false);
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* ================= CUSTOMER SEARCH ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', gap: '30px' }}>
         <div style={{ flex: 1, position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}></i>
            <input
              placeholder="Search Customer (Mobile Number)..."
              value={searchMobile}
              onChange={(e) => setSearchMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              style={{ width: '100%', padding: '16px 16px 16px 50px', borderRadius: '18px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 600, background: '#fff', outline: 'none' }}
            />
         </div>
         <div style={{ padding: '8px 20px', background: '#eef2ff', borderRadius: '12px', border: '1px solid #e0e7ff', fontSize: '12px', fontWeight: 800, color: '#4338ca' }}>
            {transactions.length} TRANSACTIONS FOUND
         </div>
      </div>

      {/* ================= TRANSACTION LIST ================= */}
      <div style={{ background: '#fff', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
              <th style={{ padding: '20px 25px', textAlign: 'left', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 900 }}>Invoice ID</th>
              <th style={{ padding: '20px 25px', textAlign: 'left', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 900 }}>Customer Info</th>
              <th style={{ padding: '20px 25px', textAlign: 'center', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 900 }}>Payment Mode</th>
              <th style={{ padding: '20px 25px', textAlign: 'right', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 900 }}>Total Amount</th>
              <th style={{ padding: '20px 25px', textAlign: 'right', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 900 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => {
              const isVoided = t.status === 'voided';
              return (
                <tr key={i} onClick={() => setSelectedTransaction(t)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', opacity: isVoided ? 0.6 : 1, transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '18px 25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ padding: '6px 12px', background: '#f1f5f9', color: '#1e293b', borderRadius: '10px', fontSize: '11px', fontWeight: 900, border: '1px solid #e2e8f0' }}>{t.invoiceId}</div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>{t.formattedDate}</span>
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>{t.productSummary.length > 60 ? t.productSummary.substring(0, 60) + "..." : t.productSummary}</div>
                  </td>
                  <td style={{ padding: '18px 25px' }}>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '14px' }}>{t.customer_name || 'Guest'}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>{t.customer_mobile || 'No Mobile'}</div>
                  </td>
                  <td style={{ padding: '18px 25px', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '5px 12px', borderRadius: '100px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase',
                      background: t.payment_method === 'cash' ? '#ecfdf5' : t.payment_method === 'upi' ? '#f0f9ff' : '#f5f3ff',
                      color: t.payment_method === 'cash' ? '#059669' : t.payment_method === 'upi' ? '#0284c7' : '#7c3aed',
                      border: t.payment_method === 'cash' ? '1px solid #6ee7b7' : t.payment_method === 'upi' ? '#7dd3fc' : '#c4b5fd'
                    }}>{t.payment_method}</span>
                  </td>
                  <td style={{ padding: '18px 25px', textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#1e293b' }}>₹{t.total_amount?.toFixed(2)}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>AMOUNT PAID</div>
                  </td>
                  <td style={{ padding: '18px 25px', textAlign: 'right' }}>
                    <span style={{ 
                       padding: '5px 12px', borderRadius: '100px', fontSize: '10px', fontWeight: 900,
                       background: isVoided ? '#fff1f2' : '#f0fdf4',
                       color: isVoided ? '#e11d48' : '#166534',
                       border: isVoided ? '1px solid #fda4af' : '1px solid #86efac'
                    }}>{t.status?.toUpperCase()}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ================= INVOICE DETAILS ================= */}
      {selectedTransaction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '750px', borderRadius: '35px', overflow: 'hidden', boxShadow: '0 25px 70px -10px rgba(0,0,0,0.5)', animation: 'scaleUp 0.3s ease-out' }}>
            
            <div style={{ background: '#1e293b', padding: '40px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Transaction Record</div>
                <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 900 }}>Invoice {selectedTransaction.invoiceId}</h3>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                 <button onClick={() => window.print()} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '45px', height: '45px', borderRadius: '14px', cursor: 'pointer' }}><i className="fas fa-print"></i></button>
                 <button onClick={() => setSelectedTransaction(null)} style={{ background: '#fff', border: 'none', color: '#1e293b', width: '45px', height: '45px', borderRadius: '14px', cursor: 'pointer', fontWeight: 900 }}><i className="fas fa-times"></i></button>
              </div>
            </div>

            <div style={{ padding: '40px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginBottom: '40px' }}>
                 <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Customer Info</div>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#1e293b' }}>{selectedTransaction.customer_name || 'Guest'}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>Mobile: {selectedTransaction.customer_mobile || 'N/A'}</div>
                 </div>
                 <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Payment Mode</div>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#4338ca', textTransform: 'uppercase' }}>{selectedTransaction.payment_method}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>GATEWAY: STORE</div>
                 </div>
                 <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Transaction Date</div>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#1e293b' }}>{selectedTransaction.formattedDate}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>REF: {selectedTransaction.transaction_id}</div>
                 </div>
              </div>

              <div style={{ borderRadius: '24px', border: '1.5px solid #f1f5f9', overflow: 'hidden', marginBottom: '35px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #f1f5f9' }}>
                      <th style={{ textAlign: 'left', padding: '15px 25px', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 900 }}>Product Name</th>
                      <th style={{ textAlign: 'center', padding: '15px 25px', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 900 }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '15px 25px', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 900 }}>Subtotal</th>
                      <th style={{ textAlign: 'right', padding: '15px 25px', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 900 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTransaction.items?.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '15px 25px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>{item.product_name}</div>
                          {item.is_returned && <span style={{ padding: '2px 8px', background: '#fff1f2', color: '#e11d48', borderRadius: '6px', fontSize: '9px', fontWeight: 900 }}>RETURNED</span>}
                        </td>
                        <td style={{ textAlign: 'center', padding: '15px 25px', fontWeight: 900, color: '#1e293b', fontSize: '15px' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '15px 25px', fontWeight: 800, color: '#1e293b', fontSize: '15px' }}>₹{item.subtotal.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '15px 25px' }}>
                          {!item.is_returned && selectedTransaction.status !== 'voided' && (
                            <button 
                              disabled={processingReturn}
                              onClick={() => handleReturn(item.item_id)}
                              style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fda4af', padding: '6px 14px', borderRadius: '10px', fontSize: '10px', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#e11d48'; e.currentTarget.style.color = '#fff'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#e11d48'; }}
                            >RETURN</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                 <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Final Total</div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b', letterSpacing: '-1px' }}>₹{selectedTransaction.total_amount?.toFixed(2)}</div>
                 </div>
              </div>
            </div>

            <div style={{ padding: '30px', background: '#f8fafc', textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
               <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>End of Receipt • Thank you for your business</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
