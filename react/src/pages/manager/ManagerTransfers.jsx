import { useEffect, useState } from "react";

export default function ManagerStockTransfer() {
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [requests, setRequests] = useState([]);

  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    toBranch: ""
  });

  const manager =
    JSON.parse(localStorage.getItem("loggedInUser"));

  useEffect(() => {
    setProducts(JSON.parse(localStorage.getItem("products")) || []);
    setRequests(JSON.parse(localStorage.getItem("transferRequests")) || []);

    const stored = JSON.parse(localStorage.getItem("branches")) || [];
    setBranches(
      stored.map(b =>
        typeof b === "string" ? { name: b, location: "" } : b
      )
    );
  }, []);

  /* ================= SUBMIT REQUEST ================= */
  const submitRequest = (e) => {
    e.preventDefault();

    const product = products.find(
      p => p.id === Number(form.productId)
    );

    if (!product || !form.quantity || !form.toBranch) return;

    const newRequest = {
      id: Date.now(),
      productId: product.id,
      productName: product.name,
      quantity: Number(form.quantity),
      fromBranch: manager.branch,
      toBranch: form.toBranch,
      requestedBy: manager.email,
      status: "pending",
      date: new Date().toISOString().split("T")[0]
    };

    const existing =
      JSON.parse(localStorage.getItem("transferRequests")) || [];

    const updated = [...existing, newRequest];

    // ✅ SAVE FOR BOTH ADMIN + MANAGER
    localStorage.setItem("transferRequests", JSON.stringify(updated));
    localStorage.setItem("stockRequests", JSON.stringify(updated));

    setRequests(updated);

    setForm({ productId: "", quantity: "", toBranch: "" });
  };

  return (
    <div>
      <h2>Stock Transfer Request</h2>

      <form onSubmit={submitRequest} className="chart-card">

        <select
          value={form.productId}
          onChange={(e) =>
            setForm({ ...form, productId: e.target.value })
          }
        >
          <option value="">Select Product</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Quantity"
          value={form.quantity}
          onChange={(e) =>
            setForm({ ...form, quantity: e.target.value })
          }
        />

        <select
          value={form.toBranch}
          onChange={(e) =>
            setForm({ ...form, toBranch: e.target.value })
          }
        >
          <option value="">Select Destination Branch</option>

          {branches
            .filter(b => b.name !== manager.branch)
            .map((b, i) => (
              <option key={i} value={b.name}>
                {b.name}
              </option>
            ))}
        </select>

        <button type="submit">
          Request Transfer
        </button>
      </form>

      <div className="table-card">
        <h3>My Transfer Requests</h3>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>From</th>
              <th>To</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {requests
              .filter(r => r.requestedBy === manager.email)
              .map(r => (
                <tr key={r.id}>
                  <td>{r.productName}</td>
                  <td>{r.quantity}</td>
                  <td>{r.fromBranch}</td>
                  <td>{r.toBranch}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
