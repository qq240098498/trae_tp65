import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Checkin from './pages/Checkin'
import RepairList from './pages/RepairList'
import Pickup from './pages/Pickup'
import Inventory from './pages/Inventory'
import RepairDetail from './pages/RepairDetail'
import ImeiRecords from './pages/ImeiRecords'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/repairs/pending" element={<RepairList defaultStatus="pending" pageTitle="待修列表" />} />
          <Route path="/repairs/repairing" element={<RepairList defaultStatus="repairing" pageTitle="维修中" />} />
          <Route path="/repairs/ready" element={<Pickup />} />
          <Route path="/repairs/completed" element={<RepairList defaultStatus="picked" pageTitle="已完成" />} />
          <Route path="/repairs/:id" element={<RepairDetail />} />
          <Route path="/checkin" element={<Checkin />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/imei" element={<ImeiRecords />} />
        </Route>
      </Routes>
    </Router>
  )
}
