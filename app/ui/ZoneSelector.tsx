import * as React from "react";
import {Box, FormControl, InputLabel, MenuItem, Select, TextField} from "@mui/material";

export const CustomTextInput = ({value, onChange}) => {
    return <TextField
                      value={value} onChange={onChange}
                      label="Enter Days"
                      type="number"
                      sx={{ mt: 2, width: '100%' }}
    ></TextField>
}

export const CustomZoneSelector = ({zoneObject}) => {
    return(
        <Select
            labelId={zoneObject.name+ "-select-label"}
            id={zoneObject.name+"-select"}
            value={zoneObject.value}
            label="Zone 1"
            onChange={zoneObject.handler}
            autowidth

        >
            <MenuItem value={'computed'}>Computed</MenuItem>
            <MenuItem value={'no_mwh'}>No MWH</MenuItem>
            <MenuItem value={'manual'}>Manual Input of # Days Before EDD</MenuItem>
        </Select>
    )
}

export const CustomZoneFormControl = ({zoneObject}) => {
    return (
        <FormControl sx={{ mr: 3, minWidth:150 }}>
            <InputLabel id={zoneObject.name+"-label"}>{zoneObject.name}</InputLabel>
            <CustomZoneSelector zoneObject={zoneObject}/>
            {zoneObject.value === 'manual' && (
                <CustomTextInput value={zoneObject.manualValue}
                                 onChange={zoneObject.manualHandler}

                />
            )}
        </FormControl>
    )
}
export default function ZoneSelector({zoneObject}) {

    return(
        <span>
            {zoneObject.selected =='true' && (
                <CustomZoneFormControl zoneObject={zoneObject}/>
            )}
        </span>

    )

}