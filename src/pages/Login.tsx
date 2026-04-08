import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Paper,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext.tsx';
import { auth } from '../services/api.ts';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  const handleForgotPasswordClose = () => {
    setForgotPasswordOpen(false);
    setResetEmail('');
    setResetError('');
    setResetMessage('');
    setIsResetSubmitting(false);
  };

  const handleForgotPasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetError('');
    setResetMessage('');

    if (!resetEmail) {
      setResetError('Please enter your email.');
      return;
    }

    setIsResetSubmitting(true);

    try {
      await auth.requestPasswordReset(resetEmail);
    } catch (err) {
      // Intentionally swallow backend lookup details to avoid exposing user existence.
    } finally {
      setResetMessage('If the user exists, you will recevie an email with the link to reset the password');
      setIsResetSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h5">
            ZAPI Login
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <Typography color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign In
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => setForgotPasswordOpen(true)}
            >
              Forgot password?
            </Button>
          </Box>
        </Paper>
      </Box>

      <Dialog open={forgotPasswordOpen} onClose={handleForgotPasswordClose} fullWidth maxWidth="xs">
        <form onSubmit={handleForgotPasswordSubmit}>
          <DialogTitle>Forgot Password</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Email"
              type="email"
              fullWidth
              value={resetEmail}
              onChange={(event) => setResetEmail(event.target.value)}
              required
            />
            {resetError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {resetError}
              </Alert>
            )}
            {resetMessage && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {resetMessage}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            {resetMessage ? (
              <Button onClick={handleForgotPasswordClose} variant="contained">
                Return to Login
              </Button>
            ) : (
              <>
                <Button onClick={handleForgotPasswordClose}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isResetSubmitting}>
                  {isResetSubmitting ? 'Sending...' : 'Continue'}
                </Button>
              </>
            )}
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default Login;
