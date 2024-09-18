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

export default function FileHandlingButtons({filetype, filename}) {
    return (
        <Box>
            <Box>
                <Typography variant="h6" gutterBottom>
                    {filetype}
                </Typography>
            </Box>
            <Box>
                <Button sx={{mr:2}} variant="contained">Upload</Button>
                <Button color={"secondary"} variant="contained">Saved Files</Button>
            </Box>
            <Box>
                <Typography variant="h6" gutterBottom>
                    {filename}
                </Typography>
            </Box>
        </Box>

    )
}