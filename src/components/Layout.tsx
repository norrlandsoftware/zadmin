import React, { useState } from 'react';
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
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import RouterIcon from '@mui/icons-material/Router';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernet';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import EmailIcon from '@mui/icons-material/Email';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DeveloperBoardIcon from '@mui/icons-material/DeveloperBoard';
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
  const [adminOpen, setAdminOpen] = useState(isDeviceModelsRoute);
  const [deviceModelsOpen, setDeviceModelsOpen] = useState(isDeviceModelsRoute);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'POPs', icon: <LocationOnIcon />, path: '/pops' },
    { text: 'OLTs', icon: <DeviceHubIcon />, path: '/olts' },
    { text: 'ONTs', icon: <RouterIcon />, path: '/onts' },
    { text: 'Switch', icon: <SettingsEthernetIcon />, path: '/switches' },
  ];

  const adminMenuItems = [
    { text: 'About', icon: <InfoOutlinedIcon />, path: '/about' },
    { text: 'Email Templates', icon: <EmailIcon />, path: '/email-templates' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    { text: 'Users', icon: <PeopleIcon />, path: '/users' },
  ];

  const deviceModelMenuItems = [
    { text: 'OLT', path: '/device-models/olt' },
    { text: 'OLT Line Card', path: '/device-models/olt-line-card' },
    { text: 'OLT Uplink Card', path: '/device-models/olt-uplink-card' },
    { text: 'Switch', path: '/device-models/switch' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleAdminToggle = () => {
    setAdminOpen((current) => !current);
  };

  const handleDeviceModelsToggle = () => {
    setDeviceModelsOpen((current) => !current);
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
            <AdminPanelSettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Admin" />
          {adminOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
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
                <InfoOutlinedIcon />
              </ListItemIcon>
              <ListItemText
                primary="About"
                primaryTypographyProps={{ fontSize: '0.875rem' }}
              />
            </ListItem>
            <ListItem button sx={{ pl: 4 }} onClick={handleDeviceModelsToggle}>
              <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                <DeveloperBoardIcon />
              </ListItemIcon>
              <ListItemText
                primary="Device Models"
                primaryTypographyProps={{ fontSize: '0.875rem' }}
              />
              {deviceModelsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
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
            <MenuIcon />
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
