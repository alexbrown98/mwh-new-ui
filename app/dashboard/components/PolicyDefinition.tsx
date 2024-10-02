import React from 'react';
import { FormLabel, RadioGroup, FormControlLabel, Radio } from '@mui/material';

const PolicyDefinition = ({ policyValue, handlePolicyChange }) => {
    return (
        <div>
            <FormLabel>Policy Objective</FormLabel>
            <RadioGroup value={policyValue} onChange={handlePolicyChange}>
                <FormControlLabel value="egalitarian" control={<Radio />} label="Egalitarian" />
                <FormControlLabel value="utilitarian" control={<Radio />} label="Utilitarian" />
            </RadioGroup>
        </div>
    );
};

export default PolicyDefinition;
