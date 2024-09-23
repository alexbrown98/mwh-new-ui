import * as React from 'react';
import Popover from '@mui/material/Popover';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export default function SaveSessionPopover({ buttonText, onSaveSession }) {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [sessionName, setSessionName] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [success, setSuccess] = React.useState(false);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
        // Reset states when opening the popover
        setSessionName('');
        setError(null);
        setSuccess(false);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleSessionNameChange = (event) => {
        setSessionName(event.target.value);
    };

    const handleSaveSession = async () => {
        if (sessionName.trim() === '') {
            setError('Please enter a session name');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            await onSaveSession(sessionName);
            setSuccess(true);
            setSessionName(''); // Clear input after successful save
        } catch (error) {
            console.error('Error saving session:', error);
            setError('Failed to save session. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const open = Boolean(anchorEl);
    const id = open ? 'save-session-popover' : undefined;

    return (
        <div>
            <Button
                aria-describedby={id}
                variant="contained"
                onClick={handleClick}
            >
                {buttonText}
            </Button>
            <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
            >
                <Box sx={{ p: 2, width: 300 }}>
                    <TextField
                        fullWidth
                        label="Session Name"
                        variant="outlined"
                        value={sessionName}
                        onChange={handleSessionNameChange}
                        disabled={loading}
                        sx={{ mb: 2 }}
                    />
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleSaveSession}
                        disabled={loading || sessionName.trim() === ''}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Save Session'}
                    </Button>
                    {error && (
                        <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>
                    )}
                    {success && (
                        <Typography color="success" sx={{ mt: 1 }}>Session saved successfully!</Typography>
                    )}
                </Box>
            </Popover>
        </div>
    );
}