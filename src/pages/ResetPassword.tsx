import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { users } from '../services/api.ts';

const passwordRuleLabels = [
  'At least 8 characters',
  'At least one uppercase letter',
  'At least one lowercase letter',
  'At least one digit',
  'At least one symbol: !@#$%^&*()-_=+[]{}|;:,.<>?/',
];

const passwordSymbols = '!@#$%^&*()-_=+[]{}|;:,.<>?/';

const getPasswordRuleResults = (value: string) => [
  value.length > 7,
  /[A-Z]/.test(value),
  /[a-z]/.test(value),
  /\d/.test(value),
  Array.from(value).some((character) => passwordSymbols.includes(character)),
];

const getErrorMessage = (err: any) => {
  const data = err?.response?.data;
  if (typeof data === 'string') {
    return data;
  }
  if (data?.context?.message) {
    return data.context.message;
  }
  if (data?.detail?.context?.message) {
    return data.detail.context.message;
  }
  if (Array.isArray(data?.detail)) {
    return data.detail.map((item: any) => item?.msg || String(item)).join('\n');
  }
  return data?.detail || data?.message || 'Unable to update the password.';
};

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user_id');
  const resetPasswordToken = searchParams.get('reset_password_token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRuleResults = useMemo(() => getPasswordRuleResults(password), [password]);
  const isPasswordValid = passwordRuleResults.every(Boolean);
  const passwordsMatch = password === confirmPassword;
  const shouldShowPasswordRules = password.length > 0;
  const shouldShowConfirmError = confirmPassword.length > 0 && !passwordsMatch;
  const canSubmit =
    Boolean(userId && resetPasswordToken) &&
    isPasswordValid &&
    passwordsMatch &&
    confirmPassword.length > 0 &&
    !isSubmitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!userId || !resetPasswordToken) {
      setError('Missing reset password link parameters.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (!isPasswordValid) {
      setError('The password does not respect all the password rules.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await users.updatePassword(userId, {
        password,
        reset_password_token: resetPasswordToken,
      });
      setSuccess('Password updated successfully. You can now sign in.');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
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
            Reset Password
          </Typography>
          {success ? (
            <Box sx={{ mt: 2, width: '100%' }}>
              <Alert severity="success" sx={{ mt: 2 }}>
                {success}
              </Alert>
              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 3 }}
                onClick={() => navigate('/login')}
              >
                Return to Login
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="New Password"
                type="password"
                autoComplete="new-password"
                autoFocus
                value={password}
                error={shouldShowPasswordRules && !isPasswordValid}
                helperText=" "
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
              />
              {shouldShowPasswordRules && (
                <Box sx={{ mt: -1, ml: 1.75 }}>
                  {passwordRuleLabels.map((label, index) => {
                    const isOk = passwordRuleResults[index];
                    return (
                      <Typography
                        key={label}
                        variant="caption"
                        component="div"
                        sx={{
                          color: isOk ? 'success.main' : 'error.main',
                          lineHeight: 1.35,
                        }}
                      >
                        - {label}
                      </Typography>
                    );
                  })}
                </Box>
              )}
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                error={shouldShowConfirmError}
                helperText={shouldShowConfirmError ? 'Passwords do not match.' : ' '}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError('');
                }}
              />
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={!canSubmit}
                sx={{ mt: 3, mb: 2 }}
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </Button>
              <Button
                fullWidth
                variant="text"
                onClick={() => navigate('/login')}
              >
                Back to Login
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ResetPassword;
