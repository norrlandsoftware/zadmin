import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { ResultBarProvider } from './contexts/ResultBarContext.tsx';
import theme from './theme.ts';

// Pages
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Pops from './pages/Pops.tsx';
import Bngs from './pages/Bngs.tsx';
import Olts from './pages/Olts.tsx';
import OltSettings from './pages/OltConfiguration.tsx';
import OltRenderedConfigurations from './pages/OltRenderedConfigurations.tsx';
import OltRenderedConfigurationDetails from './pages/OltRenderedConfigurationDetails.tsx';
import OltInitializationWorkflow from './pages/OltInitializationWorkflow.tsx';
import Onts from './pages/Onts.tsx';
import Switches from './pages/Switches.tsx';
import Users from './pages/Users.tsx';
import Settings from './pages/Settings.tsx';
import EmailTemplates from './pages/EmailTemplates.tsx';
import ConfigTemplates from './pages/ConfigTemplates.tsx';
import ResetPassword from './pages/ResetPassword.tsx';
import About from './pages/About.tsx';
import DeviceModels from './pages/DeviceModels.tsx';

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
        <ResultBarProvider>
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
                path="/bngs/*"
                element={
                  <PrivateRoute>
                    <Bngs />
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
                path="/olts/:id/settings"
                element={
                  <PrivateRoute>
                    <OltSettings />
                  </PrivateRoute>
                }
              />
              <Route
                path="/olts/:id/rendered-configurations"
                element={
                  <PrivateRoute>
                    <OltRenderedConfigurations />
                  </PrivateRoute>
                }
              />

              <Route
                path="/olts/:id/workflow/:instanceId"
                element={
                  <PrivateRoute>
                    <OltInitializationWorkflow />
                  </PrivateRoute>
                }
              />

              <Route
                path="/olts/:id/rendered-configurations/:renderedId"
                element={
                  <PrivateRoute>
                    <OltRenderedConfigurationDetails />
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
                path="/switches/*"
                element={
                  <PrivateRoute>
                    <Switches />
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
              <Route
                path="/config-templates/*"
                element={
                  <PrivateRoute>
                    <ConfigTemplates />
                  </PrivateRoute>
                }
              />
              <Route
                path="/device-models/:modelType"
                element={
                  <PrivateRoute>
                    <DeviceModels />
                  </PrivateRoute>
                }
              />
              </Routes>
            </Router>
          </AuthProvider>
        </ResultBarProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
