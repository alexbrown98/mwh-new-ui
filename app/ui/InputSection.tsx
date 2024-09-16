import FileHandlingButtons from "@/app/ui/FileHandlingButtons";
import * as React from "react";
import {Box, Button, TextField, Typography} from "@mui/material";
import Grid from '@mui/material/Unstable_Grid2';

import {CustomTextInput, Item} from "@/app/dashboard/customTextInput";


export default function InputSection({fieldObject})  {
    return (
        <Box sx={{px: 5, mt:3 }}>
            <Typography variant="h5" gutterBottom={true}>
                {fieldObject.sectionName}
            </Typography>
            {!fieldObject.sectionName.includes("Labor") && (
                <Button
                    variant="contained"
                    onClick={fieldObject.typeChangeHandler}
                >Switch to {fieldObject.typeDisplay}
                </Button>
            )}

            <Grid container spacing={2} columns={12} sx={{mt:2}}>
                <Grid xs={3} sx={{borderBottom: "2px solid"}}>
                    <Item>
                        <Box>
                            <Typography variant="h6" gutterBottom={true}>
                                Label
                            </Typography>
                        </Box>
                    </Item>
                </Grid>
                <Grid xs={6} sx={{borderBottom: "2px solid"}}>
                    <Item>
                        <Box>
                            <Typography variant="h6" gutterBottom={true}>
                                Values
                            </Typography>
                        </Box>
                    </Item>
                </Grid>
                <Grid xs={3} sx={{borderBottom: "2px solid"}}>
                    <Item>
                        <Box>
                            <Typography variant="h6" gutterBottom={true}>
                                % Total Demand
                            </Typography>
                        </Box>
                    </Item>
                </Grid>

                {/*Single*/}
                {fieldObject.type =='single' && (
                    <Grid item xs={12}>
                        <Grid container spacing={2} columns={12}>
                            <Grid item xs={3}>
                                <Item>
                                    <Box>
                                        <Typography variant="h6" gutterBottom={true}>
                                            {fieldObject.multiLabel1}
                                        </Typography>
                                    </Box>
                                </Item>
                            </Grid>
                            <Grid item xs={6}>
                                <Item>
                                    <Box display="flex" justifyContent="center" alignItems="center">
                                        <FileHandlingButtons fileObject={fieldObject.fileObject_1} />
                                    </Box>
                                </Item>
                            </Grid>
                            <Grid item xs={3}>
                                <Item>
                                    <Box>
                                        <Typography variant="h6" gutterBottom={true}>
                                            {fieldObject.demandValue}
                                        </Typography>
                                    </Box>
                                </Item>
                            </Grid>
                        </Grid>
                    </Grid>
                )}
                {/*Multiple*/}
                {fieldObject.type=='multiple' && (
                    <>
                        <Grid item xs={12}>
                            <Grid container spacing={2} columns={12}>
                                <Grid item xs={3}>
                                    <Item>
                                        <Box>
                                            <Typography variant="h6" gutterBottom={true}>
                                                {fieldObject.multiLabel1}
                                            </Typography>
                                        </Box>
                                    </Item>
                                </Grid>
                                <Grid item xs={6}>
                                    <Item>
                                        <FileHandlingButtons fileObject={fieldObject.fileObject_1}/>
                                    </Item>
                                </Grid>
                                <Grid item xs={3}>
                                    {fieldObject.demandType == 'manual' && (
                                        <Item>
                                            <Box sx={{mt:3, ml:2}} display="flex" justifyContent="left" alignItems="center" >
                                                <CustomTextInput
                                                    value={fieldObject.demandValue}
                                                    onChange={fieldObject.demandInputChangeHandler}
                                                />
                                                <Button onClick={fieldObject.demandTypeChangeHandler}>{fieldObject.demandTypeDisplay}</Button>
                                            </Box>
                                        </Item>
                                    )}
                                    {fieldObject.demandType == 'file' && (
                                        <Item>
                                            <Box sx={{mt:3, ml:2}} display="flex" justifyContent="left" alignItems="center" >
                                                <FileHandlingButtons/>
                                                <Button onClick={fieldObject.demandTypeChangeHandler}>{fieldObject.demandTypeDisplay}</Button>
                                            </Box>
                                        </Item>
                                    )}
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid item xs={12}>
                            <Grid container spacing={2} columns={12}>
                                <Grid item xs={3}>
                                    <Item>
                                        <Box>
                                            <Typography variant="h6" gutterBottom={true}>
                                                {fieldObject.multiLabel2}
                                            </Typography>
                                        </Box>
                                    </Item>
                                </Grid>
                                <Grid item xs={6}>
                                    <Item>
                                        <FileHandlingButtons fileObject={fieldObject.fileObject_2}/>
                                    </Item>
                                </Grid>
                                <Grid item xs={3}>
                                    {fieldObject.demandType=='manual' && (
                                        <Item>
                                            <Box sx={{mt:3, ml:2}} display="flex" justifyContent="left" alignItems="center" >
                                                <TextField InputProps={{
                                                    readOnly: true,
                                                }} sx={{width:'50%'}}size={'small'}
                                                           value={100-fieldObject.demandValue}></TextField>
                                            </Box>
                                        </Item>
                                    )}
                                </Grid>
                            </Grid>
                        </Grid>
                    </>
                )}

            </Grid>
        </Box>
    )
}