import { BrowserRouter, Route, Routes } from 'react-router';
import EditOrder from '../pages/EditOrder.jsx';
import EditRestock from '../pages/EditRestock.jsx';
import EditStockItem from '../pages/EditStockItem.jsx';
import Finances from '../pages/Finances.jsx';
import Home from '../pages/Home.jsx';
import Login from '../pages/Login.jsx';
import NewExpense from '../pages/NewExpense.jsx';
import NewOrder from '../pages/NewOrder.jsx';
import NewRound from '../pages/NewRound.jsx';
import Orders from '../pages/Orders.jsx';
import Restock from '../pages/Restock.jsx';
import Stock from '../pages/Stock.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/rounds/new" element={<NewRound />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/new" element={<NewOrder />} />
          <Route path="/orders/:id" element={<EditOrder />} />
          <Route path="/restock" element={<Restock />} />
          <Route path="/expenses/new" element={<NewExpense />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/stock/:id" element={<EditStockItem />} />
          <Route path="/restocks/:id" element={<EditRestock />} />
          <Route path="/finances" element={<Finances />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
