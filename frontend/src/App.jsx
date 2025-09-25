import { useState } from "react";
import "./App.css";

// Components
import DriverApplicationForm from "./Components/DriverApplicationForm";
import DriverApplicationList from "./Components/DriverApplicationList";
import DriverEarningsForm from "./Components/DriverEarningsForm";
import DriverEarningsList from "./Components/DriverEarningsList";
import DriverPaymentForm from "./Components/DriverPaymentForm";
import DriverPaymentList from "./Components/DriverPaymentList";
import DriverSchedulesForm from "./Components/DriverSchedulesForm";
import DriverSchedulesList from "./Components/DriverSchedulesList";

function App() {
  const [refresh, setRefresh] = useState(false);

  return (
    <div className="dashboard-container">
      <header>
        <h1>🚚 Driver Management Dashboard</h1>
      </header>

      <main className="dashboard-main">
        {/* Applications Section */}
        <div className="section">
          <h2>Applications</h2>
          <DriverApplicationForm onSuccess={() => setRefresh(!refresh)} />
          <DriverApplicationList refresh={refresh} />
        </div>

        {/* Earnings Section */}
        <div className="section">
          <h2>Earnings</h2>
          <DriverEarningsForm onSuccess={() => setRefresh(!refresh)} />
          <DriverEarningsList refresh={refresh} />
        </div>

        {/* Payments Section */}
        <div className="section">
          <h2>Payments</h2>
          <DriverPaymentForm onSuccess={() => setRefresh(!refresh)} />
          <DriverPaymentList refresh={refresh} />
        </div>

        {/* Schedules Section */}
        <div className="section">
          <h2>Schedules</h2>
          <DriverSchedulesForm onSuccess={() => setRefresh(!refresh)} />
          <DriverSchedulesList refresh={refresh} />
        </div>
      </main>

      <footer>
        <p>© 2025 RentXpress</p>
      </footer>
    </div>
  );
}

export default App;
