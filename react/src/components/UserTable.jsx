import { useEffect, useState } from "react";

export default function UserTable() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    setUsers(JSON.parse(localStorage.getItem("users")) || []);
  }, []);

  const approveUser = (index) => {
    const updated = [...users];
    updated[index].status = "approved";
    setUsers(updated);
    localStorage.setItem("users", JSON.stringify(updated));
  };

  const deleteUser = (index) => {
    const updated = users.filter((_, i) => i !== index);
    setUsers(updated);
    localStorage.setItem("users", JSON.stringify(updated));
  };

  return (
    <div className="table-card">
      <h3>User Management</h3>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Branch</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u, i) => (
            <tr key={i}>
              <td>{u.firstName} {u.lastName}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.branch}</td>
              <td>{u.status}</td>
              <td>
                {u.status === "pending" && (
                  <button onClick={() => approveUser(i)}>Approve</button>
                )}
                <button onClick={() => deleteUser(i)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
