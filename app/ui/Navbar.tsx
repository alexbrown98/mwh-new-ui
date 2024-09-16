'use client';
import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import {Button} from "@mui/material";

export default function MenuAppBar({userAuth, loginHandler, logoutHandler, loadSessionHandler, saveSessionHandler}) {
    const [auth, setAuth] = React.useState(userAuth);
    const [anchorEl, setAnchorEl] = React.useState(null);

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        MWH
                    </Typography>
                    {userAuth == 'false' && (
                        <Button variant={'contained'} color={'secondary'}
                        onClick={loginHandler}>Login</Button>
                    )}
                    {userAuth == 'true' && (
                        <div>
                            <IconButton
                                size="large"
                                aria-label="account of current user"
                                aria-controls="menu-appbar"
                                aria-haspopup="true"
                                onClick={handleMenu}
                                color="inherit"
                            >
                                <ArrowDownwardIcon />
                            </IconButton>
                            <Menu
                                id="menu-appbar"
                                anchorEl={anchorEl}
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                open={Boolean(anchorEl)}
                                onClose={handleClose}
                            >

                                <MenuItem onClick={handleClose}>
                                    <Button onClick={loadSessionHandler} variant="contained" >Load Session</Button>
                                </MenuItem>
                                <MenuItem onClick={handleClose}>
                                    <Button onClick={saveSessionHandler} variant="contained" color='secondary'>Save Session</Button>
                                </MenuItem>
                                <MenuItem onClick={handleClose}>
                                    <Button onClick={logoutHandler} variant={'contained'} color={'error'}>Logout</Button>
                                </MenuItem>
                            </Menu>
                        </div>
                    )}
                </Toolbar>
            </AppBar>
        </Box>
    );
}