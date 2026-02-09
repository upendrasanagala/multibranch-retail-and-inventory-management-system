export default function StaffInventory() {
  const products = JSON.parse(localStorage.getItem("products")) || [];

  return (
    <div className="table-card">
      <h3>Quick Inventory Check</h3>

      {products.length === 0 ? (
        <p>No inventory available</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>₹{p.price}</td>
                <td>{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
