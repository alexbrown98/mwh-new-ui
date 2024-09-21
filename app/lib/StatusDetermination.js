import * as React from "react";
import {
    status_facilityData,
    status_generating_map,
    status_geojson, status_lmp,
    status_motorized,
    status_multiparous,
    status_nulliparous, status_ready_generate_assignment, status_ready_generate_map,
    status_tif,
    status_walking
} from "./constants";
import {Loader, Message} from "@aws-amplify/ui-react";
import {Box} from "@mui/material";

const StatusDetermination = ({
                                 onStatusChange,
                                 currentStatus,
                                 isGenerating,
                                 canGenerateMap,
                                 totalDemandFile,
                                 geofenceFile,
                                 travelSpeedMotorizedMapped,
                                 travelSpeedMotorizedUnmapped,
                                 travelSpeedWalkingMapped,
                                 travelSpeedWalkingUnmapped,
                                 latentPhaseFileMulti,
                                 latentPhaseFileNuli,
                                 laborOnsetFileLMP,
                                 travelSpeedType,
                                 latentType,
                                 facilityData,
                                 costAndOptimizationData,
                                 optimizationEngineData
                             }) => {

    React.useEffect(() => {
        const determineStatus = () => {
            canGenerateMap(false);
            console.debug("Setting status.")
            if (isGenerating) {
                return status_generating_map
            }
            if (!totalDemandFile) {
                return status_tif;
            } else if (!geofenceFile) {
                return status_geojson;
            } else if (!travelSpeedMotorizedMapped || !travelSpeedMotorizedUnmapped) {
                return status_motorized;
            } else if (
                travelSpeedType === 'multiple' &&
                (!travelSpeedMotorizedMapped || !travelSpeedMotorizedUnmapped || !travelSpeedWalkingMapped || !travelSpeedWalkingUnmapped)
            ) {
                return status_walking;
            } else if (!latentPhaseFileMulti) {
                return status_multiparous;
            } else if (
                latentType === 'multiple' &&
                (!latentPhaseFileMulti || !latentPhaseFileNuli)
            ) {
                return status_nulliparous;
            } else if (!laborOnsetFileLMP) {
                return status_lmp;
            } else if (!facilityData) {
                return status_facilityData
            }
            else if (costAndOptimizationData) {
                canGenerateMap(true);
                return status_ready_generate_assignment;
            } else {
                canGenerateMap(true);
                return status_ready_generate_map;
            }
        };

        const newStatus = determineStatus();
        if (newStatus !== currentStatus) {
            onStatusChange(newStatus);
        }


    }, [
        totalDemandFile,
        geofenceFile,
        travelSpeedMotorizedMapped,
        travelSpeedMotorizedUnmapped,
        travelSpeedWalkingMapped,
        travelSpeedWalkingUnmapped,
        latentPhaseFileMulti,
        latentPhaseFileNuli,
        laborOnsetFileLMP,
        travelSpeedType,
        latentType,
        facilityData,
        costAndOptimizationData,
        optimizationEngineData,
        onStatusChange, currentStatus, isGenerating
    ]);



    return (
        <Box sx={{mt: 3, width: '30%'}}>

        </Box>
    );
};

export default StatusDetermination;