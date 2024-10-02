"use client";
import Navbar from "@/app/ui/Navbar"
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import {
    Alert,
    Container,
    FormControlLabel,
    FormLabel,
    LinearProgress,
    Radio,
    RadioGroup,
    TextField,
    Typography
} from "@mui/material";
import * as React from "react";
import { Amplify } from 'aws-amplify';
import config from '../amplifyconfiguration.json';
import { Loader, Message, WithAuthenticatorProps } from '@aws-amplify/ui-react';
import StatusDetermination from "@/app/lib/StatusDetermination";
import FileHandlingSection from './components/FileHandlingSection';
import TravelSpeedInput from './components/TravelSpeedInput';
import LatentPhaseInput from './components/LatentPhaseInput';
import LaborInput from './components/LaborInput';
import FacilityDataInput from './components/FacilityDataInput';
import PolicyDefinition from './components/PolicyDefinition';

Amplify.configure(config);

export default function DashboardClient({ signOut, user }: WithAuthenticatorProps) {
    // State declarations...

    return (
        <Container maxWidth={'false'}>
            {user && (
                <Box>
                    <Navbar user={user} logoutHandler={signOut} />
                    <FileHandlingSection fileObject={totalDemandFileObject} />
                    <TravelSpeedInput 
                        travelSpeedType={travelSpeedType} 
                        travelSpeedMotorizedUnmapped={travelSpeedMotorizedUnmapped} 
                        travelSpeedMotorizedMapped={travelSpeedMotorizedMapped} 
                        handleInputChangeMotorizedUnmapped={handleInputChangeMotorizedUnmapped} 
                        handleInputChangeMotorizedMapped={handleInputChangeMotorizedMapped} 
                    />
                    <LatentPhaseInput latentPhaseObject={latentPhaseObject} />
                    <LaborInput laborObject={laborObject} />
                    <FacilityDataInput 
                        facilityFileJson={facilityFileJson} 
                        facilityFileName={facilityFileName} 
                        setFacilityFileJson={setFacilityFileJson} 
                        tableRows={tableRows} 
                        setTableRows={setTableRows} 
                    />
                    <PolicyDefinition policyValue={policyValue} handlePolicyChange={handlePolicyChange} />
                    {/* Other components and logic */}
                </Box>
            )}
            {!user && (
                <Navbar userAuth={userAuth} loginHandler={handleLogin} logoutHandler={signOut} />
            )}
        </Container>
    );
}
