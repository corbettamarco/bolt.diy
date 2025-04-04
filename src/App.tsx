import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Auth from './components/Auth'
import Navbar from './components/Navbar'
import ListingsPage from './components/ListingsPage'
import AddListing from './components/AddListing'
import ProfilePage from './components/ProfilePage'
import OwnerDashboard from './components/OwnerDashboard'
import ItemDetailPage from './components/ItemDetailPage'
import RentalCheckout from './components/RentalCheckout'
import NotFound from './components/NotFound'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import MessagesPage from './components/MessagesPage'
import EditEquipment from './components/EditEquipment'
function AppRoutes() {
  const { user, isOwner } = useAuth()

  return (
    <Routes>
      <Route path="/" element={<ListingsPage />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/equipment/:id" element={<ItemDetailPage />} />
      {user ? (
        <>
          <Route path="/listings/new" element={<AddListing />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          {isOwner && <Route path="/owner-dashboard" element={<OwnerDashboard />} />}
					 {isOwner && <Route path="/edit-equipment/:id" element={<EditEquipment />} />}
          <Route path="/checkout" element={<RentalCheckout />} />
        </>
      ) : (
        <Route path="/checkout" element={<Navigate to="/login" />} />
      )}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="md:ml-64 pt-16 md:pt-0">
            <AppRoutes />
          </div>
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
