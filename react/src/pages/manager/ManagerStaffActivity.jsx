import { useEffect, useState } from "react";

export default function ManagerStaffActivity() {
  const [staff, setStaff] = useState([]);
  const [sales, setSales] = useState([]);

  useEffect(() => {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const salesData = JSON.parse(localStorage.getItem("sales")) || [];

    // Only staff users
    setStaff(users.filter(u => u.role === "staff"));
    setSales(salesData);
  }, []);

  // Count sales per staff (email based)
  const getStaffSalesCount = (email) => {
    return sales.filter(s => s.staffEmail === email).length;
  };

  return (
    <div>

      <h2 style={{ marginBottom: "20px" }}>
        Staff Activity Monitoring
      </h2>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Total Sales</th>
              <th>Last Activity</th>
            </tr>
          </thead>

          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan="6">No staff found</td>
              </tr>
            ) : (
              staff.map((s, i) => (
                <tr key={i}>
                  <td>{s.firstName} {s.lastName}</td>
                  <td>{s.email}</td>
                  <td>{s.branch}</td>
                  <td>
                    <span
                      style={{
                        color: s.status === "approved" ? "green" : "red",
                        fontWeight: 600
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td>{getStaffSalesCount(s.email)}</td>
                  <td>
                    {s.lastLogin && !isNaN(new Date(s.lastLogin))
                      ? new Date(s.lastLogin).toLocaleString()
                      : "Not logged in yet"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
