import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import theme from './theme.ts';

// Pages
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Pops from './pages/Pops.tsx';
import Olts from './pages/Olts.tsx';
import Onts from './pages/Onts.tsx';
import Users from './pages/Users.tsx';
import Settings from './pages/Settings.tsx';
import EmailTemplates from './pages/EmailTemplates.tsx';
import ResetPassword from './pages/ResetPassword.tsx';
import About from './pages/About.tsx';

const queryClient = new QueryClient();

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset_password" element={<ResetPassword />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/pops/*"
                element={
                  <PrivateRoute>
                    <Pops />
                  </PrivateRoute>
                }
              />
              <Route
                path="/olts/*"
                element={
                  <PrivateRoute>
                    <Olts />
                  </PrivateRoute>
                }
              />
              <Route
                path="/onts/*"
                element={
                  <PrivateRoute>
                    <Onts />
                  </PrivateRoute>
                }
              />
              <Route
                path="/users/*"
                element={
                  <PrivateRoute>
                    <Users />
                  </PrivateRoute>
                }
              />
              <Route
                path="/about/*"
                element={
                  <PrivateRoute>
                    <About />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings/*"
                element={
                  <PrivateRoute>
                    <Settings />
                  </PrivateRoute>
                }
              />
              <Route
                path="/email-templates/*"
                element={
                  <PrivateRoute>
                    <EmailTemplates />
                  </PrivateRoute>
                }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
