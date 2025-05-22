import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import RecipeAdminApp from './components/admin/RecipeAdminApp';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={<Navigate to="/admin" />} 
        />
        <Route path="/admin" element={<RecipeAdminApp />} />
      </Routes>
    </Router>
  );
};

export default App;