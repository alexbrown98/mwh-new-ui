import {TextField} from "@mui/material";
import * as React from "react";
import {styled} from "@mui/material/styles";
import Box from "@mui/material/Box";
import {black} from "next/dist/lib/picocolors";

// @ts-ignore
export const CustomTextInput = ({value, onChange}) => {
    const isError = value !== '' && (isNaN(value) || value < 1 || value > 100);
    return <TextField sx={{width: '50%'}} size={'small'}
                      value={value} onChange={onChange}
                      error={isError}
                      helperText={isError ? 'Enter a number between 1 and 100' : ''}
    ></TextField>
}
// @ts-ignore
export const Item = styled(Box)(({theme}) => ({
    textAlign: 'center',
    color: 'black',

}));