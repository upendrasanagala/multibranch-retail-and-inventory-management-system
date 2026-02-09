import { useEffect, useState } from "react";

export default function StaffReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    const sales = JSON.parse(localStorage.getItem("sales")) || [];
    const staff = JSON.parse(localStorage.getItem("loggedInUser"));

    /* ===== GROUP SALES INTO RECEIPTS ===== */
    const grouped = {};
    sales.forEach(s => {
      const key = `${s.date}-${s.paymentMethod}-${s.branch}`;
      if (!grouped[key]) {
        grouped[key] = {
          receiptNo: `R-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          date: s.date,
          branch: s.branch,
          paymentMethod: s.paymentMethod,
          staff: staff?.email || "Staff",
          items: [],
          total: 0
        };
      }
      grouped[key].items.push(s);
      grouped[key].total += s.amount;
    });

    setReceipts(Object.values(grouped).reverse());
  }, []);

  /* ===== FILTER BY DATE ===== */
  const filteredReceipts = filterDate
    ? receipts.filter(r => r.date === filterDate)
    : receipts;

  /* ===== DAILY SUMMARY ===== */
  const dailyTotal = filteredReceipts.reduce(
    (sum, r) => sum + r.total,
    0
  );

  /* ===== PRINT RECEIPT ===== */
  const printReceipt = (receipt) => {
    const win = window.open("", "_blank");

    win.document.write(`
      <html>
        <head>
          <title>Receipt ${receipt.receiptNo}</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; }
            td, th { padding: 6px; border-bottom: 1px dashed #999; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <h2>Retail POS Receipt</h2>
          <p><strong>Receipt:</strong> ${receipt.receiptNo}</p>
          <p><strong>Date:</strong> ${receipt.date}</p>
          <p><strong>Branch:</strong> ${receipt.branch}</p>
          <p><strong>Payment:</strong> ${receipt.paymentMethod}</p>
          <p><strong>Staff:</strong> ${receipt.staff}</p>
          <hr/>
          <table>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th class="right">Amount</th>
            </tr>
            ${receipt.items.map(i => `
              <tr>
                <td>${i.product}</td>
                <td>${i.quantity}</td>
                <td class="right">₹${i.amount}</td>
              </tr>
            `).join("")}
          </table>
          <hr/>
          <h3 class="right">Total: ₹${receipt.total}</h3>
          <p style="text-align:center;">Thank you for shopping!</p>
        </body>
      </html>
    `);

    win.document.close();
    win.print();
  };

  return (
    <div>

      <h2>Sales Receipts</h2>

      {/* ===== DATE FILTER ===== */}
      <div style={{ marginBottom: "20px" }}>
        <label>Select Date: </label>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        {filterDate && (
          <button
            style={{ marginLeft: "10px" }}
            onClick={() => setFilterDate("")}
          >
            Clear
          </button>
        )}
      </div>

      {/* ===== DAILY SUMMARY ===== */}
      <div className="chart-card" style={{ marginBottom: "20px" }}>
        <strong>Total Receipts:</strong> {filteredReceipts.length} <br />
        <strong>Total Sales:</strong> ₹{dailyTotal}
      </div>

      {/* ===== RECEIPTS TABLE ===== */}
      <div className="table-card">
        {filteredReceipts.length === 0 ? (
          <p>No receipts found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Date</th>
                <th>Branch</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredReceipts.map((r, i) => (
                <tr key={i}>
                  <td>{r.receiptNo}</td>
                  <td>{r.date}</td>
                  <td>{r.branch}</td>
                  <td>{r.paymentMethod}</td>
                  <td>₹{r.total}</td>
                  <td>
                    <button onClick={() => printReceipt(r)}>
                      Print
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
