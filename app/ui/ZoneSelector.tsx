import React from 'react';
import { FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';

const CustomTextInput = ({ value, onChange }) => {
    return (
        <TextField
            value={value}
            onChange={onChange}
            label="Enter Days"
            type="number"
            sx={{ mt: 2, width: '100%' }}
        />
    );
};

const CustomZoneSelector = ({ zoneObject }) => {
    return (
        <Select
            labelId={`${zoneObject.name}-select-label`}
            id={`${zoneObject.name}-select`}
            value={zoneObject.value}
            label={zoneObject.name}
            onChange={zoneObject.handler}
            autoWidth
        >
            <MenuItem value="computed">Computed</MenuItem>
            <MenuItem value="no_mwh">No MWH</MenuItem>
            <MenuItem value="manual">Manual Input of # Days Before EDD</MenuItem>
        </Select>
    );
};

const CustomZoneFormControl = ({ zoneObject }) => {
    return (
        <FormControl sx={{ mr: 3, minWidth: 150 }}>
            <InputLabel id={`${zoneObject.name}-label`}>{zoneObject.name}</InputLabel>
            <CustomZoneSelector zoneObject={zoneObject} />
            {zoneObject.value === 'manual' && (
                <CustomTextInput
                    value={zoneObject.manualValue}
                    onChange={zoneObject.manualHandler}
                />
            )}
        </FormControl>
    );
};

const ZoneSelector = ({ zoneObject }) => {
    if (zoneObject.selected !== 'true') {
        return null;
    }

    return <CustomZoneFormControl zoneObject={zoneObject} />;
};

export default ZoneSelector;