import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

export default function SalesChart() {
  const data = {
    labels: ["Branch A", "Branch B", "Branch C"],
    datasets: [
      {
        label: "Sales (₹)",
        data: [120000, 95000, 150000],
        backgroundColor: "#2563eb"
      }
    ]
  };

  return (
    <div className="chart-card">
      <h3>Branch Sales Comparison</h3>
      <Bar data={data} />
    </div>
  );
}
