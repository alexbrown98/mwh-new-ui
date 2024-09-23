import * as React from 'react';
import Popover from '@mui/material/Popover';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export default function BasicPopover({ buttonText, username, loadSessionHandler }) {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [sessions, setSessions] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);

    const handleClick = async (event) => {
        setAnchorEl(event.currentTarget);
        if (username) {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/get_sessions_for_user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username }),
                });
                const data = await response.json();
                console.log('Raw API response:', data); // For debugging
                if (Array.isArray(data.sessions)) {
                    setSessions(data.sessions);
                } else {
                    throw new Error('Received data is not in the expected format');
                }
            } catch (error) {
                console.error('Error fetching sessions:', error);
                setError('Failed to fetch sessions. Please try again.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleSessionSelect = async (session) => {
        console.log('Selected session:', session);
        setLoading(true);
        await loadSessionHandler(session)
        setLoading(false);
        handleClose();
    };

    const open = Boolean(anchorEl);
    const id = open ? 'simple-popover' : undefined;

    return (
        <div>
            <Button
                aria-describedby={id}
                variant="contained"
                onClick={handleClick}
                disabled={!username}
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
                {loading ? (
                    <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress />
                    </div>
                ) : error ? (
                    <Typography color="error" sx={{ p: 2 }}>{error}</Typography>
                ) : sessions.length > 0 ? (
                    <List sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
                        {sessions.map((session, index) => (
                            <ListItem key={index} disablePadding>
                                <ListItemButton onClick={() => handleSessionSelect(session)}>
                                    <ListItemText primary={session} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography sx={{ p: 2 }}>No sessions found.</Typography>
                )}
            </Popover>
        </div>
    );
}