import { useEffect, useState } from "react";

export default function ManagerInventory() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [transfer, setTransfer] = useState({
    productId: "",
    quantity: "",
    toBranch: ""
  });

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const currentBranch = loggedInUser?.branch;

  /* ================= LOAD INVENTORY ================= */
  useEffect(() => {
    const storedProducts = JSON.parse(localStorage.getItem("products")) || [];
    setProducts(storedProducts);
  }, []);

  /* ================= SEARCH ================= */
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= REQUEST TRANSFER ================= */
  const requestTransfer = (e) => {
    e.preventDefault();

    if (!transfer.productId || !transfer.quantity || !transfer.toBranch) {
      alert("All transfer fields required");
      return;
    }

    const requests = JSON.parse(localStorage.getItem("stockTransfers")) || [];

    requests.push({
      id: Date.now(),
      productId: transfer.productId,
      quantity: Number(transfer.quantity),
      fromBranch: currentBranch,
      toBranch: transfer.toBranch,
      status: "pending",
      date: new Date().toISOString().split("T")[0]
    });

    localStorage.setItem("stockTransfers", JSON.stringify(requests));

    alert("Stock transfer request sent");
    setTransfer({ productId: "", quantity: "", toBranch: "" });
  };

  return (
    <div>

      <h2 style={{ marginBottom: "20px" }}>Inventory Status</h2>

      {/* ================= SEARCH ================= */}
      <input
        type="text"
        placeholder="Search product..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          marginBottom: "20px",
          padding: "8px",
          width: "100%"
        }}
      />

      {/* ================= INVENTORY TABLE ================= */}
      <div className="table-card">
        <h3>Current Inventory</h3>

        {filteredProducts.length === 0 ? (
          <p>No products found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price (₹)</th>
                <th>Stock</th>
                <th>Alert</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>₹{p.price}</td>
                  <td>{p.stock}</td>
                  <td>
                    {p.stock <= 5 && (
                      <span style={{ color: "red", fontWeight: 600 }}>
                        LOW
                      </span>
                    )}
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
