import React, { useState } from 'react';
import MaterialSymbol from './MaterialSymbol.tsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Collapse,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext.tsx';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const location = useLocation();
  const isDeviceModelsRoute = location.pathname.startsWith('/device-models');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(() => {
    const stored = localStorage.getItem('layout.adminOpen');
    if (stored != null) {
      return stored === 'true';
    }
    return isDeviceModelsRoute;
  });
  const [deviceModelsOpen, setDeviceModelsOpen] = useState(() => {
    const stored = localStorage.getItem('layout.deviceModelsOpen');
    if (stored != null) {
      return stored === 'true';
    }
    return isDeviceModelsRoute;
  });
  const { logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { text: 'Dashboard', icon: <MaterialSymbol name="dashboard" />, path: '/' },
    { text: 'POPs', icon: <MaterialSymbol name="location_on" />, path: '/pops' },
    { text: 'BNG', icon: <MaterialSymbol name="captive_portal" />, path: '/bngs' },
    { text: 'OLTs', icon: <MaterialSymbol name="device_hub" />, path: '/olts' },
    { text: 'ONTs', icon: <MaterialSymbol name="router" />, path: '/onts' },
    { text: 'Switch', icon: <MaterialSymbol name="settings_ethernet" />, path: '/switches' },
  ];

  const adminMenuItems = [
    { text: 'About', icon: <MaterialSymbol name="info" />, path: '/about' },
    { text: 'Email Templates', icon: <MaterialSymbol name="email" />, path: '/email-templates' },
    { text: 'Config Templates', icon: <MaterialSymbol name="dashboard_2_gear" />, path: '/config-templates' },
    { text: 'Settings', icon: <MaterialSymbol name="settings" />, path: '/settings' },
    { text: 'Users', icon: <MaterialSymbol name="people" />, path: '/users' },
  ];

  const deviceModelMenuItems = [
    { text: 'OLT', path: '/device-models/olt' },
    { text: 'OLT Line Card', path: '/device-models/olt-line-card' },
    { text: 'OLT Uplink Card', path: '/device-models/olt-uplink-card' },
    { text: 'BNG', path: '/device-models/bng' },
    { text: 'Switch', path: '/device-models/switch' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleAdminToggle = () => {
    setAdminOpen((current) => {
      const next = !current;
      localStorage.setItem('layout.adminOpen', String(next));
      return next;
    });
  };

  const handleDeviceModelsToggle = () => {
    setDeviceModelsOpen((current) => {
      const next = !current;
      localStorage.setItem('layout.deviceModelsOpen', String(next));
      return next;
    });
  };

  const drawer = (
    <div>
      <Toolbar sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <img 
          src="/ztroom-logo.png" 
          alt="ZTRoom Logo" 
          style={{ maxWidth: '80%', height: 'auto', maxHeight: '50px' }}
        />
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
          >
            <ListItemIcon sx={{ color: 'primary.main' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
        <ListItem button onClick={handleAdminToggle}>
          <ListItemIcon sx={{ color: 'primary.main' }}>
            <MaterialSymbol name="admin_panel_settings" />
          </ListItemIcon>
          <ListItemText primary="Admin" />
          {adminOpen ? <MaterialSymbol name="expand_less" /> : <MaterialSymbol name="expand_more" />}
        </ListItem>
        <Collapse in={adminOpen} timeout="auto" unmountOnExit={false}>
          <List component="div" disablePadding>
            <ListItem
              button
              sx={{ pl: 4 }}
              onClick={() => {
                navigate('/about');
                setMobileOpen(false);
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                <MaterialSymbol name="info" />
              </ListItemIcon>
              <ListItemText
                primary="About"
                primaryTypographyProps={{ fontSize: '0.875rem' }}
              />
            </ListItem>
            <ListItem button sx={{ pl: 4 }} onClick={handleDeviceModelsToggle}>
              <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                <MaterialSymbol name="developer_board" />
              </ListItemIcon>
              <ListItemText
                primary="Device Models"
                primaryTypographyProps={{ fontSize: '0.875rem' }}
              />
              {deviceModelsOpen ? <MaterialSymbol name="expand_less" /> : <MaterialSymbol name="expand_more" />}
            </ListItem>
            <Collapse in={deviceModelsOpen} timeout="auto" unmountOnExit={false}>
              <List component="div" disablePadding>
                {deviceModelMenuItems.map((item) => (
                  <ListItem
                    button
                    key={item.text}
                    sx={{ pl: 7 }}
                    onClick={() => {
                      navigate(item.path);
                      setMobileOpen(false);
                    }}
                  >
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{ fontSize: '0.8125rem' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
            {adminMenuItems
              .filter((item) => item.text !== 'About')
              .map((item) => (
              <ListItem
                button
                key={item.text}
                sx={{ pl: 4 }}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar
          variant="dense"
          sx={{
            minHeight: { xs: 52, sm: 52 },
          }}
        >
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MaterialSymbol name="menu" />
          </IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap component="div" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              ZADMIN
            </Typography>
            {title && (
              <Typography variant="caption" noWrap component="div" sx={{ opacity: 0.95, lineHeight: 1.1 }}>
                {title}
              </Typography>
            )}
          </Box>
          <Button color="inherit" onClick={logout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          pt: 2,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
