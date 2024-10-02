import React from 'react';
import { TextField, Typography, Grid } from '@mui/material';

const TravelSpeedInput = ({ travelSpeedType, travelSpeedMotorizedUnmapped, travelSpeedMotorizedMapped, handleInputChangeMotorizedUnmapped, handleInputChangeMotorizedMapped }) => {
    return (
        <Grid container spacing={2}>
            <Grid item xs={3}>
                <Typography variant="h6">Motorized</Typography>
            </Grid>
            <Grid item xs={6}>
                <TextField
                    value={travelSpeedMotorizedUnmapped || ''}
                    onChange={handleInputChangeMotorizedUnmapped}
                    label="Unmapped Ways Speed (km/h)"
                />
                <TextField
                    value={travelSpeedMotorizedMapped || ''}
                    onChange={handleInputChangeMotorizedMapped}
                    label="Mapped Ways Speed (km/h)"
                />
            </Grid>
        </Grid>
    );
};

export default TravelSpeedInput;
