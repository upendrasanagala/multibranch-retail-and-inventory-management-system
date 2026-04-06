import { useEffect, useState } from "react";
import api from "../../services/api";
import { formatDate } from "../../utils/dateUtils";
import Chart from "react-apexcharts";

export default function AdminReports() {
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState("sales");
  const [period, setPeriod] = useState("30");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [reportType, selectedBranch, period, startDate, endDate]);

  const loadBranches = async () => {
    try {
      const data = await api.branches.getAll();
      setBranches(data.branches || []);
    } catch (err) {
      console.error("Failed to load branches", err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.admin.getReports(reportType, {
        period,
        start_date: period === "custom" ? startDate : null,
        end_date: period === "custom" ? endDate : null,
        branch_id: selectedBranch
      });
      setReportData(response);
    } catch (err) {
      console.error("Failed to fetch report:", err);
      setError("Failed to load report data: " + (err.message || "Unknown error"));
      setReportData(null);
    }
    setLoading(false);
  };

  /* ================= PRINT FULL REPORT ================= */
  const printFullReport = () => {
    if (!reportData) return;
    const w = window.open("", "_blank");
    const now = new Date();
    const branchLabel = selectedBranch ? (branches.find(b => b.branch_id == selectedBranch)?.name || 'Unknown') : 'All Branches';
    const periodLabel = period === 'custom' ? (startDate + ' to ' + endDate) : ('Last ' + (reportData.period_days || period) + ' Days');

    const styles = '<style>' +
      'body{font-family:"Outfit",sans-serif;padding:40px;color:#1e293b;font-size:12px;background:#fff}' +
      '.hdr{text-align:left;border-bottom:3px solid #4338ca;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-end}' +
      '.hdr-left h2{margin:0;font-size:24px;color:#4338ca;font-weight:900;letter-spacing:-0.02em}' +
      '.hdr-left p{margin:4px 0;font-size:12px;color:#64748b;font-weight:500}' +
      '.hdr-right{text-align:right}' +
      '.hdr-right h3{margin:0;font-size:14px;color:#1e293b;text-transform:uppercase;letter-spacing:0.1em}' +
      '.meta{display:flex;justify-content:space-between;margin-bottom:24px;font-size:11px;background:#f8fafc;padding:12px 20px;border-radius:12px;color:#475569;font-weight:600}' +
      'table{width:100%;border-collapse:separate;border-spacing:0;margin:20px 0;font-size:11px}' +
      'th{background:#f1f5f9;color:#475569;padding:10px 12px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e2e8f0}' +
      'td{border-bottom:1px solid #f1f5f9;padding:10px 12px;color:#1e293b}' +
      '.r{text-align:right}.c{text-align:center}.b{font-weight:800}' +
      '.section{margin:30px 0;page-break-inside:avoid}' +
      '.section h4{font-size:13px;color:#1e293b;border-left:4px solid #4338ca;padding-left:12px;margin-bottom:16px;font-weight:800;text-transform:uppercase}' +
      '.summary{display:grid;grid-template-columns:repeat(4, 1fr);gap:20px;margin:24px 0}' +
      '.box{background:#fff;border:1px solid #e2e8f0;padding:16px;text-align:center;border-radius:16px}' +
      '.box .val{font-size:20px;font-weight:900;color:#1e293b;margin-top:4px}' +
      '.box .lbl{font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.05em}' +
      '.ftr{margin-top:60px;border-top:1px solid #e2e8f0;padding-top:24px;font-size:10px;color:#94a3b8}' +
      '.sig-row{display:flex;justify-content:space-between;margin-top:40px}' +
      '.sig-box{text-align:center;width:30%}.sig-box .line{border-top:2px solid #e2e8f0;margin-top:48px;padding-top:8px;font-weight:700;color:#475569}' +
      '.low{color:#e11d48;font-weight:bold}.warn{color:#f59e0b}.ok{color:#10b981}' +
      '@media print{body{padding:20px}.box{border:1px solid #ddd}}' +
      '</style>';

    const header = '<div class="hdr">' +
      '<div class="hdr-left">' +
      '<h2>BUSINESS INTELLIGENCE</h2>' +
      '<p>Retail Enterprise Management System • Operational Analytics</p>' +
      '</div>' +
      '<div class="hdr-right">' +
      '<h3>' + (reportType === 'sales' ? 'Commercial Performance Audit' : 'Asset & Inventory Valuation') + '</h3>' +
      '<p style="font-size:10px;color:#94a3b8;margin-top:4px">Report ID: ' + Math.random().toString(36).slice(2, 11).toUpperCase() + '</p>' +
      '</div>' +
      '</div>' +
      '<div class="meta">' +
      '<div>AUDIT FOCUS: <span style="color:#4338ca">' + branchLabel.toUpperCase() + '</span></div>' +
      (reportType === 'sales' ? '<div>TIMELINE: <span style="color:#4338ca">' + periodLabel.toUpperCase() + '</span></div>' : '') +
      '<div>TIMESTAMP: ' + formatDate(now) + ' ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) + '</div>' +
      '</div>';

    const footer = '<div class="ftr">' +
      '<div class="sig-row">' +
      '<div class="sig-box"><div class="line">Operations Controller</div></div>' +
      '<div class="sig-box"><div class="line">System Administrator</div></div>' +
      '</div>' +
      '<p style="text-align:center;margin-top:20px;font-weight:600">CONFIDENTIAL DOCUMENT • FOR AUTHORIZED PERSONNEL ONLY</p>' +
      '</div>';

    let body = '';

    if (reportType === 'sales') {
      body += '<div class="summary">' +
        '<div class="box"><div class="lbl">Gross Revenue</div><div class="val">₹' + (reportData.total_revenue?.toLocaleString() || '0') + '</div></div>' +
        '<div class="box"><div class="lbl">Order Volume</div><div class="val">' + (reportData.total_transactions || 0) + '</div></div>' +
        '<div class="box"><div class="lbl">ATV (Avg Ticket)</div><div class="val">₹' + (reportData.avg_ticket_size?.toFixed(2) || '0') + '</div></div>' +
        '<div class="box"><div class="lbl">Yield per Day</div><div class="val">₹' + (reportData.average_per_day?.toFixed(2) || '0') + '</div></div>' +
        '</div>';

      if (reportData.payment_breakdown && reportData.payment_breakdown.length > 0) {
        body += '<div class="section"><h4>Payment Channels</h4><table>' +
          '<tr><th>Channel</th><th class="r">Orders</th><th class="r">Revenue</th><th class="r">Share %</th></tr>';
        reportData.payment_breakdown.forEach(p => {
          body += '<tr><td class="b">' + p.method.toUpperCase() + '</td><td class="r">' + p.count + '</td><td class="r">₹' + (p.total?.toLocaleString() || '0') + '</td><td class="r">' + p.percentage + '%</td></tr>';
        });
        body += '</table></div>';
      }

      if (reportData.branch_breakdown && reportData.branch_breakdown.length > 0) {
        body += '<div class="section"><h4>Branch Contribution Audit</h4><table>' +
          '<tr><th>Branch Node</th><th class="r">Transactions</th><th class="r">Net Contribution</th><th class="r">Performance</th></tr>';
        reportData.branch_breakdown.forEach(b => {
          const avgPerf = (reportData.total_revenue || 0) / (reportData.branch_breakdown.length || 1);
          const perf = b.total > avgPerf ? 'ok' : 'warn';
          body += '<tr><td class="b">' + b.branch + '</td><td class="r">' + (b.count || 0) + '</td><td class="r">₹' + (b.total?.toLocaleString() || '0') + '</td><td class="r ' + perf + '">' + (perf === 'ok' ? 'HIGH' : 'STABLE') + '</td></tr>';
        });
        body += '</table></div>';
      }

      if (reportData.top_products && reportData.top_products.length > 0) {
        body += '<div class="section"><h4>Top Performance Inventory</h4><table>' +
          '<tr><th>#</th><th>Asset Name</th><th class="r">Qty Cleared</th><th class="r">Revenue Generated</th><th class="c">Tax Slab</th></tr>';
        reportData.top_products.forEach((p, idxP) => {
          body += '<tr><td>' + (idxP + 1) + '</td><td class="b">' + p.product_name + '</td><td class="r">' + p.total_quantity + '</td><td class="r">₹' + (p.total_revenue?.toLocaleString() || '0') + '</td><td class="c">' + (p.gst_percent || 0) + '%</td></tr>';
        });
        body += '</table></div>';
      }

      if (reportData.gst_summary && reportData.gst_summary.length > 0) {
        body += '<div class="section"><h4>Compliance: GST Taxation Matrix</h4><table>' +
          '<tr><th>Tax Engine</th><th class="r">Taxable Base</th><th class="r">CGST</th><th class="r">SGST</th><th class="r">Audit Total</th></tr>';
        let totTaxable = 0, totCGST = 0, totSGST = 0, totTax = 0;
        reportData.gst_summary.forEach(g => {
          totTaxable += g.taxable || 0; totCGST += g.cgst || 0; totSGST += g.sgst || 0; totTax += g.total_tax || 0;
          body += '<tr><td class="b">' + g.slab + '</td><td class="r">₹' + (g.taxable?.toLocaleString() || '0') + '</td><td class="r">₹' + (g.cgst?.toLocaleString() || '0') + '</td><td class="r">₹' + (g.sgst?.toLocaleString() || '0') + '</td><td class="r">₹' + (g.total_tax?.toLocaleString() || '0') + '</td></tr>';
        });
        body += '<tr class="b" style="background:#f8fafc"><td>CONSOLIDATED TOTAL</td><td class="r">₹' + totTaxable.toLocaleString() + '</td><td class="r">₹' + totCGST.toLocaleString() + '</td><td class="r">₹' + totSGST.toLocaleString() + '</td><td class="r">₹' + totTax.toLocaleString() + '</td></tr>';
        body += '</table></div>';
      }
    } else {
      body += '<div class="summary">' +
        '<div class="box"><div class="lbl">Asset Count</div><div class="val">' + (reportData.total_items || 0) + '</div></div>' +
        '<div class="box"><div class="lbl">Total Asset Value</div><div class="val">₹' + (reportData.total_stock_value?.toLocaleString() || '0') + '</div></div>' +
        '<div class="box"><div class="lbl">Depletion Risk</div><div class="val low">' + (reportData.low_stock_count || 0) + '</div></div>' +
        '<div class="box"><div class="lbl">Critical VOID</div><div class="val low">' + (reportData.out_of_stock_count || 0) + '</div></div>' +
        '</div>';

      if (reportData.category_breakdown && reportData.category_breakdown.length > 0) {
        body += '<div class="section"><h4>Vertical Analysis: Categories</h4><table>' +
          '<tr><th>Vertical</th><th class="r">Asset Units</th><th class="r">Gross Qty</th><th class="r">Valuation</th></tr>';
        reportData.category_breakdown.forEach(c => {
          body += '<tr><td class="b">' + c.category + '</td><td class="r">' + c.items + '</td><td class="r">' + c.total_qty + '</td><td class="r">₹' + (c.total_value?.toLocaleString() || '0') + '</td></tr>';
        });
        body += '</table></div>';
      }

      if (reportData.all_items && reportData.all_items.length > 0) {
        body += '<div class="section"><h4>Consolidated Inventory Ledger</h4><table>' +
          '<tr><th>SKU</th><th>Asset Details</th><th>Category</th><th>Source Hub</th><th class="r">Qty</th><th class="r">Audit Value</th><th class="c">Health</th></tr>';
        reportData.all_items.forEach((item) => {
          const cls = item.severity === 'out_of_stock' ? 'low' : item.severity === 'critical' ? 'low' : item.severity === 'warning' ? 'warn' : 'ok';
          const label = item.severity === 'out_of_stock' ? 'VOID' : item.severity === 'critical' ? 'RISK' : item.severity === 'warning' ? 'WARN' : 'HEALTHY';
          body += '<tr><td style="font-family:monospace;font-size:9px">' + (item.sku || '-') + '</td><td class="b">' + item.product_name + '</td><td>' + (item.category || '-') + '</td><td>' + (item.branch_name || 'CENTRAL') + '</td><td class="r">' + item.quantity + '</td><td class="r">₹' + (item.stock_value?.toLocaleString() || '0') + '</td><td class="c ' + cls + '" style="font-size:8px;font-weight:900">' + label + '</td></tr>';
        });
        body += '</table></div>';
      }
    }

    w.document.write('<!DOCTYPE html><html><head><title>Retail Audit: ' + branchLabel + '</title><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">' + styles + '</head><body>' + header + body + footer + '</body></html>');
    w.document.close();
    w.print();
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = ('' + (val ?? '')).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>Reports</h2>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>Analyze sales performance and GST liabilities</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={printFullReport} disabled={loading || !reportData} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <i className="fas fa-print"></i> Generate Audit PDF
          </button>
          <button
            onClick={() => {
              const dataToExport = reportType === 'sales' ? reportData.transactions : reportData.all_items;
              exportToCSV(dataToExport, `${reportType}_report`);
            }}
            disabled={loading || !reportData}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: '#ecfdf5', color: '#059669', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.1)' }}
          >
            <i className="fas fa-file-csv"></i> Export Raw CSV
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', padding: '24px 32px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', marginBottom: '32px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Scope Analysis</label>
          <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.name} Authority</option>)}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Analytics Stream</label>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
            <button onClick={() => setReportType('sales')} style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: 'none', background: reportType === 'sales' ? '#fff' : 'transparent', color: reportType === 'sales' ? '#4338ca' : '#64748b', fontWeight: 800, fontSize: '12px', cursor: 'pointer', boxShadow: reportType === 'sales' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>Sales Performance</button>
            <button onClick={() => setReportType('inventory')} style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: 'none', background: reportType === 'inventory' ? '#fff' : 'transparent', color: reportType === 'inventory' ? '#4338ca' : '#64748b', fontWeight: 800, fontSize: '12px', cursor: 'pointer', boxShadow: reportType === 'inventory' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>Inventory Valuation</button>
          </div>
        </div>

        {reportType === "sales" && (
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Timeframe</label>
            <select value={period} onChange={e => { setPeriod(e.target.value); if (e.target.value === "custom" && !startDate) { const today = new Date().toISOString().split('T')[0]; setStartDate(today); setEndDate(today); } }} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 600 }}>
              <option value="0">Today</option>
              <option value="1">Last 24 Hours</option>
              <option value="7">Last 7 Cycles</option>
              <option value="30">Monthly Ledger</option>
              <option value="90">Quarterly Review</option>
              <option value="365">Annual Summary</option>
              <option value="custom">📅 Custom Parameter</option>
            </select>
          </div>
        )}

        {reportType === "sales" && period === "custom" && (
          <>
            <div style={{ width: '150px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px', display: 'block' }}>START</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }} />
            </div>
            <div style={{ width: '150px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px', display: 'block' }}>END</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }} />
            </div>
          </>
        )}
      </div>

      {error && <div style={{ background: '#fff1f2', color: '#e11d48', padding: '16px 24px', borderRadius: '16px', border: '1px solid #ffe4e6', marginBottom: '24px', fontWeight: 600 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="fas fa-circle-notch fa-spin" style={{ fontSize: '40px', color: '#6366f1', marginBottom: '20px' }}></div>
          <p style={{ fontWeight: 700, color: '#64748b', fontSize: '15px' }}>Synthesizing multi-cloud data points...</p>
        </div>
      ) : !reportData ? (
        <div style={{ textAlign: 'center', padding: '100px 0', color: '#94a3b8' }}>
          <i className="fas fa-microchip" style={{ fontSize: '48px', opacity: 0.2, marginBottom: '20px' }}></i>
          <p style={{ fontWeight: 600 }}>Select parameters to trigger data visualization</p>
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {reportType === "sales" ? (
              <>
                <div style={{ background: 'linear-gradient(135deg, #4338ca, #6366f1)', padding: '24px', borderRadius: '24px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue</div>
                  <div style={{ fontSize: '32px', fontWeight: 900, margin: '8px 0' }}>₹{reportData.total_revenue?.toLocaleString() || 0}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}><i className="fas fa-arrow-up"></i> +12.5% from last window</div>
                </div>
                <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Orders</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', margin: '4px 0' }}>{reportData.total_transactions || 0}</div>
                  <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Total Orders</div>
                </div>
                <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Ticket</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', margin: '4px 0' }}>₹{reportData.avg_ticket_size?.toFixed(0) || 0}</div>
                  <div style={{ fontSize: '11px', color: '#4338ca', fontWeight: 600 }}>Avg Value per checkout</div>
                </div>
                <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Yield / Day</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#e11d48', margin: '4px 0' }}>₹{(reportData.average_per_day || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: '#f43f5e', fontWeight: 600 }}>Daily Performance</div>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(30, 41, 59, 0.2)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portfolio Valuation</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: '4px 0' }}>₹{(reportData.total_stock_value || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Current capital locked in inventory</div>
                </div>
                <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SKU Breadth</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', margin: '4px 0' }}>{reportData.total_items || 0}</div>
                  <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>Active unique product identifiers</div>
                </div>
                <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Replenishment Risk</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#f59e0b', margin: '4px 0' }}>{reportData.low_stock_count || 0}</div>
                  <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>Assets near minimum replenishment</div>
                </div>
                <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Asset Gap</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#e11d48', margin: '4px 0' }}>{reportData.out_of_stock_count || 0}</div>
                  <div style={{ fontSize: '11px', color: '#e11d48', fontWeight: 600 }}>Out of stock units (lost revenue)</div>
                </div>
              </>
            )}
          </div>

          {reportType === "sales" ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', marginBottom: '32px' }}>
                <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>Sales Revenue</h4>
                    <span style={{ fontSize: '11px', padding: '4px 10px', background: '#eff6ff', color: '#1e40af', borderRadius: '20px', fontWeight: 800 }}>REVENUE TREND</span>
                  </div>
                  {reportData.daily_breakdown && (
                    <Chart
                      type="area"
                      height={350}
                      series={[{ name: 'Revenue', data: reportData.daily_breakdown.map(d => d.total) }]}
                      options={{
                        chart: { toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Outfit' },
                        dataLabels: { enabled: false },
                        stroke: { curve: 'smooth', width: 4, colors: ['#6366f1'] },
                        colors: ['#6366f1'],
                        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 90, 100] } },
                        xaxis: { categories: reportData.daily_breakdown.map(d => d.date), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: '#94a3b8', fontWeight: 600 } } },
                        yaxis: { labels: { formatter: (v) => `₹${v.toLocaleString()}`, style: { colors: '#94a3b8', fontWeight: 600 } } },
                        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
                        tooltip: { theme: 'light', y: { formatter: (v) => `₹${v.toLocaleString()}` } }
                      }}
                    />
                  )}
                </div>

                <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>Channel Composition</h4>
                    <i className="fas fa-chart-pie" style={{ color: '#94a3b8' }}></i>
                  </div>
                  <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {reportData.payment_breakdown && (
                      <Chart
                        type="donut"
                        width="100%"
                        series={reportData.payment_breakdown.map(p => p.total || 0)}
                        options={{
                          labels: reportData.payment_breakdown.map(p => (p.method || '').toUpperCase()),
                          colors: ['#6366f1', '#10b981', '#f59e0b', '#64748b'],
                          legend: { position: 'bottom', fontFamily: 'Outfit', fontWeight: 600, labels: { colors: '#475569' } },
                          dataLabels: { enabled: true, style: { fontWeight: 800, fontFamily: 'Outfit' } },
                          stroke: { width: 0 },
                          plotOptions: { pie: { donut: { size: '75%', labels: { show: true, total: { show: true, label: 'TOTAL', formatter: () => `₹${(reportData.total_revenue || 0).toLocaleString()}`, style: { fontSize: '14px', fontWeight: 900, color: '#1e293b' } } } } } }
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                  <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>🏆 Performance Leaders</h4>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '600px' }}>
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>IDENTIFIER</th>
                          <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>QTY</th>
                          <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>REVENUE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.top_products?.map((p, idxTP) => (
                          <tr key={`tp-${idxTP}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '16px 24px' }}>
                              <div style={{ fontWeight: 800, color: '#1e293b' }}>{p.product_name}</div>
                              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>TAX: {p.gst_percent || 0}%</div>
                            </td>
                            <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 700, color: '#475569' }}>{p.total_quantity} units</td>
                            <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 900, color: '#4338ca' }}>₹{p.total_revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                  <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>🏢 Branch Contribution</h4>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '600px' }}>
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>BRANCH</th>
                          <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>TRANS. COUNT</th>
                          <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>VALUATION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.branch_breakdown?.map((b, idxBB) => (
                          <tr key={`bb-${idxBB}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '16px 24px', fontWeight: 800, color: '#1e293b' }}>{b.branch}</td>
                            <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>{b.count || 0} checkouts</td>
                            <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 900, color: '#10b981' }}>₹{(b.total || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {reportData.gst_summary?.length > 0 && (
                <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden', marginTop: '32px' }}>
                  <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>📋 GST Compliance Summary</h4>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#6366f1', background: '#eef2ff', padding: '4px 12px', borderRadius: '20px' }}>AUDIT</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '800px' }}>
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>TAX SLAB</th>
                          <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>TAXABLE BASE</th>
                          <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>CGST</th>
                          <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>SGST</th>
                          <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.gst_summary.map((g, idxGST) => (
                          <tr key={`gst-${idxGST}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '20px 24px', fontWeight: 900, color: '#4338ca' }}>{g.slab}</td>
                            <td style={{ padding: '20px 24px', fontWeight: 600 }}>₹{g.taxable.toLocaleString()}</td>
                            <td style={{ padding: '20px 24px', color: '#64748b' }}>₹{g.cgst.toLocaleString()}</td>
                            <td style={{ padding: '20px 24px', color: '#64748b' }}>₹{g.sgst.toLocaleString()}</td>
                            <td style={{ padding: '20px 24px', textAlign: 'right', fontWeight: 900, color: '#1e293b' }}>₹{g.total_tax.toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr style={{ background: '#f8fafc', fontWeight: 900 }}>
                          <td style={{ padding: '24px' }}>CONSOLIDATED</td>
                          <td style={{ padding: '24px' }}>₹{reportData.gst_summary.reduce((s, g) => s + g.taxable, 0).toLocaleString()}</td>
                          <td style={{ padding: '24px', color: '#4338ca' }}>₹{reportData.gst_summary.reduce((s, g) => s + g.cgst, 0).toLocaleString()}</td>
                          <td style={{ padding: '24px', color: '#4338ca' }}>₹{reportData.gst_summary.reduce((s, g) => s + g.sgst, 0).toLocaleString()}</td>
                          <td style={{ padding: '24px', textAlign: 'right', fontSize: '18px', color: '#4338ca' }}>₹{reportData.gst_summary.reduce((s, g) => s + g.total_tax, 0).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {reportData.low_stock_items?.length > 0 && (
                <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #ffe4e6', boxShadow: '0 10px 15px -3px rgba(225, 29, 72, 0.05)', overflow: 'hidden', marginBottom: '32px' }}>
                  <div style={{ padding: '20px 32px', background: '#fff1f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#e11d48' }}><i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i> Low Stock Alert</h4>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#e11d48', border: '1px solid #e11d48', padding: '2px 10px', borderRadius: '8px' }}>{reportData.low_stock_items.length} ASSETS</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '600px' }}>
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          <th style={{ padding: '12px 32px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>ASSET</th>
                          <th style={{ padding: '12px 32px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>BRANCH</th>
                          <th style={{ padding: '12px 32px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>REMAINING</th>
                          <th style={{ padding: '12px 32px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>MIN LIMIT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.low_stock_items.map((item, idxLS) => (
                          <tr key={`ls-${idxLS}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '16px 32px', fontWeight: 800, color: '#1e293b' }}>{item.product_name}</td>
                            <td style={{ padding: '16px 32px' }}><code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '12px' }}>{item.branch_name || 'CENTRAL'}</code></td>
                            <td style={{ padding: '16px 32px' }}><span style={{ padding: '4px 12px', background: '#fff1f2', color: '#e11d48', borderRadius: '20px', fontWeight: 900, fontSize: '12px' }}>{item.quantity} units</span></td>
                            <td style={{ padding: '16px 32px', fontWeight: 700, color: '#94a3b8' }}>{item.min_threshold} units</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                  <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>📦 Categories</h4>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '500px' }}>
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>VERTICAL</th>
                          <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>QTY</th>
                          <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>VALUE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.category_breakdown?.map((c, idxC) => (
                          <tr key={`cat-${idxC}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '16px 24px', fontWeight: 800, color: '#1e293b' }}>{c.category}</td>
                            <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 700, color: '#64748b' }}>{c.total_qty} units</td>
                            <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 900, color: '#4338ca' }}>₹{c.total_value.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ margin: '0 0 24px', fontSize: '16px', fontWeight: 800, color: '#1e293b', textAlign: 'center' }}>Stock Valuation Distribution</h4>
                  <Chart
                    type="pie"
                    height={350}
                    series={reportData.category_breakdown?.map(c => c.total_value || 0) || []}
                    options={{
                      labels: reportData.category_breakdown?.map(c => c.category || 'Misc') || [],
                      colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
                      legend: { position: 'bottom', fontFamily: 'Outfit', fontWeight: 600 },
                      stroke: { width: 0 },
                      tooltip: { y: { formatter: (v) => `₹${(v || 0).toLocaleString()}` } }
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
