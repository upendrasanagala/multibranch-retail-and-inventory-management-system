import { useEffect, useState } from "react";
import api from "../../services/api";
import DashboardFAQ from "../../components/DashboardFAQ";
import InventoryInsightCard from "../../components/InventoryInsightCard";
import StaffPerformanceInsight from "../../components/StaffPerformanceInsight";

export default function ManagerDashboardHome() {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const branchId = loggedInUser?.branch_id;
  
  const [inventory, setInventory] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSales: 0, transactionCount: 0, todayCash: 0, todayUpi: 0, todayCard: 0 });
  const [aiInsights, setAiInsights] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [branchId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        branchId ? api.inventory.getByBranch(branchId) : api.inventory.getAll(),
        branchId ? api.inventory.getLowStock(branchId) : api.inventory.getLowStock(),
        api.sales.getSummary(branchId ? { branch_id: branchId } : {}),
        api.sales.getDailySummary(branchId),
        api.manager.getAiInsights(),
        api.manager.getStaffPerformance()
      ]);

      if (results[0].status === "fulfilled") setInventory(results[0].value.inventory || []);
      if (results[1].status === "fulfilled") setLowStockItems(results[1].value.low_stock_items || []);
      if (results[2].status === "fulfilled") {
        setStats(prev => ({
          ...prev,
          totalSales: results[2].value.total_sales || 0,
          transactionCount: results[2].value.transaction_count || 0
        }));
      }
      if (results[3].status === "fulfilled") {
        const breakdown = results[3].value.payment_breakdown || {};
        setStats(prev => ({
          ...prev,
          todayCash: breakdown.cash?.total || 0,
          todayUpi: breakdown.upi?.total || 0,
          todayCard: breakdown.card?.total || 0
        }));
      }
      if (results[4].status === "fulfilled") setAiInsights(results[4].value.insights || []);
      if (results[5].status === "fulfilled") setStaffPerformance(results[5].value.performance_metrics || []);
    } catch (err) { console.error("Dashboard Load Err:", err); }
    setLoading(false);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: 800 }}>Loading Dashboard...</div>;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* ================= SUMMARY STATS ================= */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', 
        marginBottom: '40px'
      }}>
        {[
          { label: 'Total Sales', val: `₹${stats.totalSales.toLocaleString()}`, color: '#4338ca', icon: 'fa-chart-bar' },
          { label: 'Total Transactions', val: stats.transactionCount, color: '#1e293b', icon: 'fa-file-invoice-dollar' },
          { label: 'Total Products', val: inventory.length, color: '#64748b', icon: 'fa-boxes' },
          { label: 'Low Stock Alerts', val: lowStockItems.length, color: lowStockItems.length > 0 ? '#ef4444' : '#10b981', icon: 'fa-exclamation-triangle' }
        ].map((s, idx) => (
          <div key={idx} style={{ background: '#fff', padding: '24px 30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <i className={`fas ${s.icon}`} style={{ fontSize: '10px', color: '#94a3b8' }}></i>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</div>
             </div>
             <div style={{ fontSize: '24px', fontWeight: 900, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '30px' }}>
         
         <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* SHIFT REVENUE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
               {[
                 { label: 'CASH SALES', val: stats.todayCash, sub: 'Daily Cash Revenue', color: '#059669', bg: '#ecfdf5', icon: 'fa-money-bill-wave' },
                 { label: 'UPI SALES', val: stats.todayUpi, sub: 'Digital Payments', color: '#0284c7', bg: '#f0f9ff', icon: 'fa-mobile-alt' },
                 { label: 'CARD SALES', val: stats.todayCard, sub: 'Card Transactions', color: '#7c3aed', bg: '#f5f3ff', icon: 'fa-credit-card' }
               ].map((p, i) => (
                 <div key={i} style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                       <div style={{ padding: '4px 10px', background: p.bg, borderRadius: '8px', fontSize: '10px', fontWeight: 900, color: p.color }}>{p.label}</div>
                       <i className={`fas ${p.icon}`} style={{ color: '#cbd5e1' }}></i>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#1e293b' }}>₹{p.val.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginTop: '4px' }}>{p.label}</div>
                 </div>
               ))}
            </div>

            {/* ARTIFICIAL INTELLIGENCE INSIGHTS */}
            <section style={{ background: '#fff', padding: '35px', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <i className="fas fa-brain"></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#1e293b' }}>AI Business Insights</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Analyzing branch-level performance data</p>
                  </div>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {aiInsights.length > 0 ? aiInsights.slice(0, 2).map((insight, idx) => (
                    <InventoryInsightCard key={idx} insight={insight} />
                  )) : (
                    <div style={{ gridColumn: 'span 2', padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: 700, background: '#f8fafc', borderRadius: '20px' }}>Preparing data...</div>
                  )}
               </div>
            </section>

            {/* CRITICAL ASSET LOGS */}
            <section style={{ background: '#fff', padding: '35px', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#1e293b' }}>Inventory Alerts</h3>
                  <div style={{ padding: '6px 14px', background: '#fff1f2', color: '#e11d48', borderRadius: '10px', fontSize: '11px', fontWeight: 900 }}>ACTION REQUIRED</div>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {lowStockItems.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', background: '#f0fdf4', borderRadius: '20px', color: '#166534', fontWeight: 700 }}>All stock levels are normal. No alerts.</div>
                  ) : (
                    lowStockItems.slice(0, 5).map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#f8fafc', borderRadius: '16px', border: '1.5px solid #f1f5f9' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '10px', fontWeight: 900 }}>SKU</div>
                            <div>
                               <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>{item.product_name}</div>
                               <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>ID: {item.sku}</div>
                            </div>
                         </div>
                         <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: 900, color: item.quantity <= 5 ? '#ef4444' : '#f59e0b' }}>{item.quantity} {item.unit || 'PCS'}</div>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>In Stock</div>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </section>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* PERSONNEL RANKING */}
            <section style={{ background: '#fff', padding: '30px', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                  <i className="fas fa-crown" style={{ color: '#f59e0b' }}></i>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#1e293b' }}>Top Performers</h3>
               </div>
               <StaffPerformanceInsight metrics={staffPerformance} />
            </section>



            <DashboardFAQ faqs={[
              { question: "How many branches can I manage?", answer: "InventoryPro Enterprise supports unlimited branches. You can scale your retail chain from two locations to hundreds." },
              { question: "Is the synchronization truly real-time?", answer: "Yes. Our sync engine ensures that any stock change, sale, or transfer is updated across all connected devices in under 200 milliseconds." },
              { question: "Can I transfer stock between branches?", answer: "Yes, our 'Inter-Branch Transfer' (IBT) feature allows you to move stock between locations with one click, complete with digital transit tracking." },
              { question: "Does it support barcode scanning?", answer: "Absolutely. The system is compatible with standard USB/Bluetooth scanners and mobile camera scanning." },
              { question: "What kind of reports can I generate?", answer: "You can generate detailed sales analytics, profit margin reports, tax summaries, and inventory turnover data." },
              { question: "Can I manage employee permissions?", answer: "Yes. Use our granular Role-Based Access Control (RBAC) to define what Admin, Manager, and Staff users can see and modify." },
              { question: "Does it work offline?", answer: "Yes, our 'Offline-First' architecture allows you to continue sales during internet outages. Data automatically syncs once restored." },
              { question: "Can I use it on mobile devices?", answer: "Absolutely. InventoryPro is a progressive web platform designed to work seamlessly on tablets, smartphones, and desktops." },
              { question: "How secure is my business data?", answer: "We use bank-grade AES-256 encryption for all data at rest and TLS 1.3 for data in transit." },
              { question: "Do you offer staff training?", answer: "Yes, we provide comprehensive onboarding and 24/7 dedicated support for all Enterprise customers." }
            ]} />
         </div>

      </div>
    </div>
  );
}
