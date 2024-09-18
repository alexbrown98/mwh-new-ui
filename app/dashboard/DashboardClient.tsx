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
import FileHandlingButtons from "@/app/ui/FileHandlingButtons";
import * as React from "react";
import InputSection from "@/app/ui/InputSection";
import FacilityDataTable from "@/app/ui/FacilityDataTable";
import MapComponent from "@/app/ui/MapComponent";
import ZoneSelector from "@/app/ui/ZoneSelector";
import * as XLSX from "xlsx";
import {generateAssignmentMap, getGeoboundary, loadSessionurl, saveSessionUrl, uploadFileToS3} from "@/app/lib/utils";
import Backdrop from '@mui/material/Backdrop';
import '@/app/lib/constants'
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import {lmp_dir, multiparous_dir, nulliparous_dir} from "@/app/lib/constants";
import HorizontalNonLinearStepper from "@/app/lib/HorizontalNonLinearStepper";
import {CustomTextInput, Item} from "@/app/dashboard/customTextInput";
import {Amplify} from 'aws-amplify';
import config from '../amplifyconfiguration.json';
import type {WithAuthenticatorProps} from '@aws-amplify/ui-react';

Amplify.configure(config);

export default function DashboardClient({signOut,user}: WithAuthenticatorProps) {

    const [travelSpeedType, setTravelSpeedType] = React.useState('single');
    const [travelSpeedTypeDisplay, setTravelSpeedTypeDisplay] = React.useState('multiple');
    const [travelSpeedMotorizedUnmapped, setTravelSpeedMotorizedUnmapped] = React.useState();
    const [travelSpeedMotorizedMapped, setTravelSpeedMotorizedMapped] = React.useState();
    const [travelSpeedWalkingUnmapped, setTravelSpeedWalkingUnmapped] = React.useState();
    const [travelSpeedWalkingMapped, setTravelSpeedWalkingMapped] = React.useState();

    const [latentPhaseType, setLatentPhaseType] = React.useState('single');
    const [latentPhaseTypeDisplay, setLatentPhaseTypeDisplay] = React.useState('multiple');
    const [laborType, setLaborType] = React.useState('single');
    const [laborTypeDisplay, setLaborTypeDisplay] = React.useState('multiple');
    const [travelSpeedDemandType, setTravelSpeedDemandType] = React.useState('manual');
    const [travelSpeedDemandTypeDisplay, setTravelSpeedDemandTypeDisplay] = React.useState('manual');
    const [latentPhaseDemandType, setLatentPhaseDemandType] = React.useState('manual');
    const [latentPhaseDemandTypeDisplay, setLatentPhaseDemandTypeDisplay] = React.useState('manual');
    const [laborDemandType, setLaborDemandType] = React.useState('manual');
    const [laborDemandTypeDisplay, setLaborDemandTypeDisplay] = React.useState('manual');
    const [travelSpeedMotorizedDemand, setTravelSpeedMotorizedDemand] = React.useState('100')
    const [latentPhaseMultiDemand, setLatentPhaseMultiDemand] = React.useState('100')
    const [laborMultiDemand, setLaborMultiDemand] = React.useState('100')
    const [userAuth, setUserAuth] = React.useState(() => {
        // Initialize userAuth state from localStorage, default to 'false' if not set
        const token = localStorage.getItem('id_token');
        return token ? 'true' : 'false';
    });    const [loading, setLoading] = React.useState(true);
    const [backdropOpen, setBackdropOpen] = React.useState(false);
    const [backdropText, setBackdropText] = React.useState("");
    const [backdropProgress, setBackdropProgress] = React.useState(0);

    const [facilityFile, setFacilityFile] = React.useState()
    const [facilityFileName, setFacilityFileName] = React.useState()
    const [facilityFileJson, setFacilityFileJson] = React.useState()
    const [totalDemandFile, setTotalDemandFile] = React.useState()
    const [totalDemandFileName, setTotalDemandFileName] = React.useState()
    const [geofenceFile, setGeofenceFile] = React.useState()
    const [geofenceFileName, setGeofenceFileName] = React.useState()
    const [laborOnsetFileLMP, setLaborOnsetFileLMP] = React.useState()
    const [laborOnsetFileLMPName, setLaborOnsetFileLMPName] = React.useState()
    const [laborOnsetFileNoLMP, setLaborOnsetFileNoLMP] = React.useState()
    const [laborOnsetFileNoLMPName, setLaborOnsetFileNoLMPName] = React.useState()
    const [latentPhaseFileNuli, setLatentPhaseFileNuli] = React.useState();
    const [latentPhaseFileNuliName, setLatentPhaseFileNuliName] = React.useState();
    const [latentPhaseFileMulti, setLatentPhaseFileMulti] = React.useState();
    const [latentPhaseFileMultiName, setLatentPhaseFileMultiName] = React.useState();
    const [zone1, setZone1] = React.useState('');
    const [zone1Selected, setZone1Selected] = React.useState('true')
    const [zone1Manual, setZone1Manual] = React.useState('');
    const [zone2, setZone2] = React.useState('');
    const [zone2Selected, setZone2Selected] = React.useState('false')
    const [zone2Manual, setZone2Manual] = React.useState('');
    const [zone3, setZone3] = React.useState('');
    const [zone3Selected, setZone3Selected] = React.useState('false')
    const [zone3Manual, setZone3Manual] = React.useState('');
    const [numZonesSelector, setNumZonesSelector] = React.useState('one')
    const [alertVisible, setAlertVisible] = React.useState(false);
    const [generateMapAlertText, setGenerateMapAlertText] = React.useState('This Alert displays the default close icon.');
    const [pregnancyValues, setPregnancyValues] = React.useState(null)
    const [username, setUsername] = React.useState("")
    const [idToken, setIdToken] = React.useState();
    const [sessionName, setSessionName] = React.useState("")
    const [costMatrixData, setCostMatrixData] = React.useState(null);
    const [costAndOptimizationData, setCostAndOptimizationData] = React.useState(null);
    const [fileHash, setFileHash] = React.useState()
    const [fileHashTotal, setFileHashTotal] = React.useState()
    const [optimisationEngineData, setOptimisationEngineData] = React.useState(null);
    const [assignmentMapRows, setAssignmentMapRows] = React.useState(null);
    const assignmentMapCols: GridColDef[] = [
        { field: 'hfName', headerName: 'HF Name', flex: 1, minWidth: 150 },
        { field: 'assignedMwh', headerName: 'Assigned MWH', flex: 1, minWidth: 150 },
        { field: 'maxPbba', headerName: 'Max PBBA', type: 'number', flex: 1, minWidth: 100, align: 'left', headerAlign: 'left' },
        { field: 'minPbba', headerName: 'Min PBBA', type: 'number', flex: 1, minWidth: 100, align: 'left', headerAlign: 'left' },

    ];

    const [activeStep, setActiveStep] = React.useState(1);
    const [policyValue, setPolicyValue] = React.useState('egalitarian');
    const [tableRows, setTableRows] = React.useState([]);


    const handleGenerateMapAlertClose = () => {
        setAlertVisible(false);
    };

    const updateGenerateMapAlertText = (newText) => {
        setGenerateMapAlertText(newText);
        if (newText) {
            setAlertVisible(true);
        } else {
            setAlertVisible(false);
        }
    };
    const handlePolicyChange = (event) => {
        const policy = event.target.value
        setPolicyValue(policy);
    };

    const handleNumZonesSelector =(event) => {
        const numZones = event.target.value
        setNumZonesSelector(numZones)
        if (numZones == 'one') {
            setZone1Selected('true')
            setZone2Selected('false')
            setZone3Selected('false')
        }
        if (numZones == 'two') {
            setZone1Selected('true')
            setZone2Selected('true')
            setZone3Selected('false')
        }
        if (numZones == 'three') {
            setZone1Selected('true')
            setZone2Selected('true')
            setZone3Selected('true')
        }
    }
    const handleZone1Change = (event) => {
        const newValue = event.target.value;
        setZone1(newValue);
        // Reset manualDays if another option is selected
        if (newValue !== 'manual') {
            setZone1Manual('');
        }
    };

    const handleInputChangeMotorizedUnmapped = (event) => {
        setTravelSpeedMotorizedUnmapped(event.target.value);
    };

    const handleInputChangeMotorizedMapped = (event) => {
        setTravelSpeedMotorizedMapped(event.target.value);
    };

    const handleZone1ManualInput = (event) => {
        const newValue = event.target.value;
        setZone1Manual(newValue);
        // Update the zone1 state if manual input changes
        setZone1(newValue);
    };

    const handleZone2Change = (event) => {
        const newValue = event.target.value;
        setZone2(newValue);
        // Reset manualDays if another option is selected
        if (newValue !== 'manual') {
            setZone2Manual('');
        }
    };

    const handleZone2ManualInput = (event) => {
        const newValue = event.target.value;
        setZone2Manual(newValue);
        // Update the zone1 state if manual input changes
        setZone2(newValue);
    };

    const handleZone3Change = (event) => {
        const newValue = event.target.value;
        setZone3(newValue);
        // Reset manualDays if another option is selected
        if (newValue !== 'manual') {
            setZone3Manual('');
        }
    };

    const handleZone3ManualInput = (event) => {
        const newValue = event.target.value;
        setZone3Manual(newValue);
        // Update the zone1 state if manual input changes
        setZone3(newValue);
    };
    const geoboundaryObject =   {
        pregnancyValues,
        handler: setPregnancyValues
    };


    const zone1Object = {
        name: "Zone1",
        value: zone1,
        handler: handleZone1Change,
        manualValue: zone1Manual,
        manualHandler: handleZone1ManualInput,
        selected:zone1Selected
    }

    const zone2Object = {
        name: "Zone2",
        value: zone2,
        handler: handleZone2Change,
        manualValue: zone2Manual,
        manualHandler: handleZone2ManualInput,
        selected:zone2Selected
    }

    const zone3Object = {
        name: "Zone3",
        value: zone3,
        handler: handleZone3Change,
        manualValue: zone3Manual,
        manualHandler: handleZone3ManualInput,
        selected:zone3Selected
    }

    const generateMapObject = {
        facilityFileJson,
        totalDemandFile,
        facilityFile,
        geofenceFile,
        updateGenerateMapAlertText,
        geoboundaryObject,
        laborType,
        latentPhaseType,
        username,
        setCostMatrixData,
        setCostAndOptimizationData,
        setFileHash,
        setFileHashTotal,
        setBackdropOpen,
        setBackdropText,
        setBackdropProgress,
        travelSpeedMotorizedUnmapped,
        travelSpeedMotorizedMapped,
        travelSpeedWalkingUnmapped,
        travelSpeedWalkingMapped,
        latentPhaseFileMulti,
        latentPhaseFileNuli,
        laborOnsetFileLMP,
        policyValue,
        objective: policyValue,
        num_zones: numZonesSelector,
        zone1Object,
        zone2Object,
        zone3Object
    }


    const step1CheckObject = {
        travelSpeedMotorizedUnmapped,
        travelSpeedMotorizedMapped,
        latentPhaseFileMulti,
        laborOnsetFileLMP
    }


    const generateAssignmentMapObject = {
        speed: travelSpeedType,
        labor: laborType,
        latent: latentPhaseType,
        username: username,
        tif_filename: totalDemandFileName,
        table: facilityFileJson,
        filehash: fileHash,
        idToken: idToken,
        nulli_file: latentPhaseFileNuli,
        multi_file: latentPhaseFileMulti,
        lmp_file: laborOnsetFileLMP,
        objective: policyValue,
        num_zones: numZonesSelector,
        setOptimisationEngineData: setOptimisationEngineData,
        setBackdropOpen,
        setBackdropText,
        setBackdropProgress,
        zone1Object,
        zone2Object,
        zone3Object

    }


    const facilityFileObject = {
        fileName: facilityFileName,
        fileHandler: handleFacilityUpload,
        fileType: "",
        fileClearHandler: handleFacilityUploadClear
    }
    const totalDemandFileObject = {
        fileName: totalDemandFileName,
        fileHandler: handleTotalDemandUpload,
        fileType: "Total Demand File (.tif)",
        fileClearHandler: handleTotalDemandClear,
        website_sector: "total-demand"
    }
    const geofenceFileObject = {
        fileName: geofenceFileName,
        fileHandler: handleGeofenceUpload,
        fileType: "Geofence File (.geojson)",
        fileClearHandler: handleGeofenceClear,
        website_sector: "geo-plot"
    }

    const laborOnsetFileObjectLMP = {
        fileName: laborOnsetFileLMPName,
        fileHandler: handleLaborOnsetLMPUpload,
        fileType: "Labor Onset LMP (.xlsx)",
        fileClearHandler: handleLaborOnsetLMPClear,
        website_sector: "lmp"
    }

    const laborOnsetFileObjectNoLMP = {
        fileName: laborOnsetFileNoLMPName,
        fileHandler: handleLaborOnsetNoLMPUpload,
        fileType: "Labor Onset No LMP (.csv)",
        fileClearHandler: handleLaborOnsetNoLMPClear,
        website_sector: "no-lmp-labour"
    }

    const latentPhaseFileObjectNuli = {
        fileName: latentPhaseFileNuliName,
        fileHandler: handleLatentPhaseNuliUpload,
        fileType: "Latent Phase Nulliparous (.xlsx)",
        fileClearHandler: handleLatentPhaseNuliClear,
        website_sector: "nulliparous",
    }

    const latentPhaseFileObjectMulti = {
        fileName: latentPhaseFileMultiName,
        fileHandler: handleLatentPhaseMultiUpload,
        fileType: "Latent Phase Multiparous (.xlsx)",
        fileClearHandler: handleLatentPhaseMultiClear,
        website_sector: "multiparous",
    }

    function handleFacilityUpload(event) {
        if (event.target.files[0] && event.target.files[0].name) {
            setFacilityFile(event.target.files[0])
            setFacilityFileName(event.target.files[0].name)
            processFacilityFile(event.target.files[0])
        }
    }
    const processFacilityFile = async (file) => {
        if (file) {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, {type: 'buffer'});
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Explicitly add 'Assigned MWH' field to the raw JSON data
            const enhancedJsonData = jsonData.map(row => ({
                ...row,
                'Assigned MWH': row['Facility'] // Default to the Facility name
            }));

            // Process the data and set the initial rows
            const processedData = enhancedJsonData.map((row, index) => ({
                id: index + 1,
                facility: row['Facility'],
                district: row['District'],
                patientBeds: row['MWH Patient Beds'],
                assignedMwh: row['Assigned MWH'],
                latitude: row['Latitude'],
                longitude: row['Longitude'],
                facilities: enhancedJsonData.map((r) => r['Facility'])
            }));

            // Update both the raw JSON and the processed rows
            setFacilityFileJson(enhancedJsonData);
            setTableRows(processedData);
        }
    }

    function handleFacilityUploadClear() {
        setFacilityFile(null)
        setFacilityFileName(null)
        setFacilityFileJson(null)
    }

    function handleTotalDemandUpload(event) {
        if (event.target.files[0] && event.target.files[0].name) {
            setTotalDemandFile(event.target.files[0])
            setTotalDemandFileName(event.target.files[0].name)
        }
    }
    function handleTotalDemandClear() {
        setTotalDemandFile(null)
        setTotalDemandFileName(null)
    }
    function handleGeofenceUpload(event) {
        if (event.target.files[0] && event.target.files[0].name) {
            setGeofenceFile(event.target.files[0])
            setGeofenceFileName(event.target.files[0].name)
        }
    }
    function handleGeofenceClear() {
        setGeofenceFile(null)
        setGeofenceFileName(null)
    }

    async function handleLaborOnsetLMPUpload(event) {
        if (event.target.files[0] && event.target.files[0].name) {
            setLaborOnsetFileLMP(event.target.files[0])
            setLaborOnsetFileLMPName(event.target.files[0].name)
            const s3Key = await uploadFileToS3(username, lmp_dir, event.target.files[0], event.target.files[0].name);
            if (s3Key) {
                console.log("File uploaded to S3 with key:", s3Key);
            }
        }
    }
    function handleLaborOnsetLMPClear() {
        setLaborOnsetFileLMP(null)
        setLaborOnsetFileLMPName(null)
    }

    function handleLaborOnsetNoLMPUpload(event) {
        if (event.target.files[0] && event.target.files[0].name) {
            setLaborOnsetFileNoLMP(event.target.files[0])
            setLaborOnsetFileNoLMPName(event.target.files[0].name)
        }
    }
    function handleLaborOnsetNoLMPClear() {
        setLaborOnsetFileNoLMP(null)
        setLaborOnsetFileNoLMPName(null)
    }

    async function handleLatentPhaseNuliUpload(event) {
        if (event.target.files[0] && event.target.files[0].name) {
            setLatentPhaseFileNuli(event.target.files[0])
            setLatentPhaseFileNuliName(event.target.files[0].name)
            const s3Key = await uploadFileToS3(username, nulliparous_dir, event.target.files[0], event.target.files[0].name);
            if (s3Key) {
                console.log("File uploaded to S3 with key:", s3Key);
            }
        }
    }
    function handleLatentPhaseNuliClear() {
        setLatentPhaseFileNuli(null)
        setLatentPhaseFileNuliName(null)
    }

    async function handleLatentPhaseMultiUpload(event) {
        console.debug("inside multi upload handler")
        if (event.target.files[0] && event.target.files[0].name) {
            setLatentPhaseFileMulti(event.target.files[0])
            setLatentPhaseFileMultiName(event.target.files[0].name)
            const s3Key = await uploadFileToS3(username, multiparous_dir, event.target.files[0], event.target.files[0].name);
            if (s3Key) {
                console.log("File uploaded to S3 with key:", s3Key);
            }
        }
    }
    function handleLatentPhaseMultiClear() {
        setLatentPhaseFileMulti(null)
        setLatentPhaseFileMultiName(null)
    }


    const handleTravelSpeedDemandTypeChange = () => {
        if (travelSpeedDemandType == 'manual') {
            setTravelSpeedDemandType('file')
            setTravelSpeedDemandTypeDisplay('Manual Input')
        }
        else if (travelSpeedDemandType == 'file') {
            setTravelSpeedDemandType('manual')
            setTravelSpeedDemandTypeDisplay('File Input')
        }
    }
    const handleLatentPhaseDemandTypeChange = () => {
        if (latentPhaseDemandType == 'manual') {
            setLatentPhaseDemandType('file')
            setLatentPhaseDemandTypeDisplay('Manual Input')
        }
        else if (latentPhaseDemandType == 'file') {
            setLatentPhaseDemandType('manual')
            setLatentPhaseDemandTypeDisplay('File Input')

        }
    }
    const handleLaborDemandTypeChange = () => {
        if (laborDemandType == 'manual') {
            setLaborDemandType('file')
            setLaborDemandTypeDisplay('Manual Input')
        }
        else if (laborDemandType == 'file') {
            setLaborDemandType('manual')
            setLaborDemandTypeDisplay('File Input')

        }
    }
    const handleTravelSpeedTypeChange = () => {
        if (travelSpeedType == "single") {
            setTravelSpeedType('multiple');
            setTravelSpeedTypeDisplay('single')
        }
        else if (travelSpeedType == 'multiple') {
            setTravelSpeedType('single')
            setTravelSpeedTypeDisplay('multiple')
            setTravelSpeedMotorizedDemand('100')
        }
    };
    const handleLatentPhaseTypeChange = () => {
        if (latentPhaseType == "single") {
            setLatentPhaseType('multiple');
            setLatentPhaseTypeDisplay('single')
        }
        else if (latentPhaseType == 'multiple') {
            setLatentPhaseType('single')
            setLatentPhaseTypeDisplay('multiple')
            setLatentPhaseMultiDemand('100')
        }
    };
    const handleLaborTypeChange = () => {
        if (laborType == "single") {
            setLaborType('multiple');
            setLaborTypeDisplay('single')
        }
        else if (laborType == 'multiple') {
            setLaborType('single')
            setLaborTypeDisplay('multiple')
            setLaborMultiDemand('100')
        }
    };
    const handleTravelSpeedDemandInputChange = (event) => {
        const newValue = event.target.value;
        const numValue = parseInt(newValue, 10);
        if (newValue === '' || (numValue >= 1 && numValue <= 100)) {
            setTravelSpeedMotorizedDemand(newValue);
        }
    };
    const handleLatentPhaseDemandInputChange = (event) => {
        const newValue = event.target.value;
        const numValue = parseInt(newValue, 10);
        if (newValue === '' || (numValue >= 1 && numValue <= 100)) {
            setLatentPhaseMultiDemand(newValue);
        }
    };
    const handleLaborDemandInputChange = (event) => {
        const newValue = event.target.value;
        const numValue = parseInt(newValue, 10);
        if (newValue === '' || (numValue >= 1 && numValue <= 100)) {
            setLaborMultiDemand(newValue);
        }
    };
    const handleLogin = () => {
        window.location.href = "https://mwh.auth.eu-west-2.amazoncognito.com/login?client_id=kp11r8hfcst3dj1nq5f73qdlg&redirect_uri=http://localhost:3000/dashboard&response_type=code"
        // setUserAuth('true')
    }


    const travelSpeedObject = {
        type: travelSpeedType,
        motorized_unmapped: travelSpeedMotorizedUnmapped,
        motorized_mapped: travelSpeedMotorizedMapped,
        walking_unmapped: travelSpeedWalkingUnmapped,
        walking_mapped: travelSpeedWalkingMapped,
        demand: travelSpeedMotorizedDemand
    }

    const latentPhaseObject = {
        typeChangeHandler : handleLatentPhaseTypeChange,
        type: latentPhaseType,
        typeDisplay: latentPhaseTypeDisplay,
        demandValue: latentPhaseMultiDemand,
        demandType: latentPhaseDemandType,
        demandTypeDisplay: latentPhaseDemandTypeDisplay,
        demandInputChangeHandler: handleLatentPhaseDemandInputChange,
        demandTypeChangeHandler: handleLatentPhaseDemandTypeChange,
        sectionName: "B. Latent Phase Duration",
        multiLabel1: "Multiparous",
        multiLabel2: "Nulliparous",
        fileObject_1: latentPhaseFileObjectMulti,
        fileObject_2: latentPhaseFileObjectNuli
    }
    const laborObject = {
        typeChangeHandler : handleLaborTypeChange,
        type: laborType,
        typeDisplay: laborTypeDisplay,
        demandValue: laborMultiDemand,
        demandType: laborDemandType,
        demandTypeDisplay: laborDemandTypeDisplay,
        demandInputChangeHandler: handleLaborDemandInputChange,
        demandTypeChangeHandler: handleLaborDemandTypeChange,
        sectionName: "C. Labor Onset Uncertainty",
        multiLabel1: "LMP",
        multiLabel2: "",
        fileObject_1: laborOnsetFileObjectLMP,
        fileObject_2: null
    }

    const handleSaveSession = async () => {
        console.log("Saving session.")
        try {
            const result = await createSessionObject();
            console.log(result); // Handle success message or update UI
            // Optionally, update some state or provide feedback to the user
        } catch (error) {
            console.error('Error saving session:', error); // Handle error
            // Optionally, update some state or provide feedback to the user
        }
    };

    const backdropObject = {
        setBackdropProgress,
        setBackdropText,
        setBackdropOpen
    }

    const createSessionObject = async () => {
        let latentPhaseSessionObject = createSessionDemandObject(latentPhaseObject)
        let laborOnsetSessionObject = createSessionDemandObject(laborObject)
        let travelSpeedSessionObject = createSessionTravelSpeedObject(travelSpeedObject)
        setUsername(username)
        setSessionName("sessionNewUi")
        const sessionObject = {
            username,
            session_name: sessionName,
            session_id: username + '_' + sessionName,
            demand_data_geofence_file_name: geofenceFileName,
            demand_data_tif_file_name: totalDemandFileName,
            demand_data_labor_onset: laborOnsetSessionObject,
            demand_data_latent_phase: latentPhaseSessionObject,
            demand_data_travel_speed: travelSpeedSessionObject,
            facility_data: facilityFileJson,
            // TODO: remove hardcoded policy objective
            policy_definition: {
                num_zones: numZonesSelector,
                policy_objective: "egalitarian"
            }
        }
        const payload = {item: sessionObject};
        try {
            const response = await fetch(saveSessionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                return "Session saved successfully!";
            } else {
                return "Failed to save session.";
            }
        } catch (error) {
            return `Failed to save session: ${error}`;
        }

    }

    const createSessionTravelSpeedObject = (fieldObject) => {
        let travelObject = {};
        if (fieldObject.type ==='single'){
            travelObject = {
                single: {
                    mapped_speed: fieldObject.motorized_mapped,
                    unmapped_speed: fieldObject.motorized_unmapped
                }
            }
        } else if (fieldObject.type ==='multiple') {
            travelObject = {
                multiple : {
                    motorized: {
                        mapped_speed: fieldObject.motorized_mapped,
                        unmapped_speed: fieldObject.motorized_unmapped
                    },
                    total_demand: {
                        type: travelSpeedDemandType,
                        value: travelSpeedMotorizedDemand
                    },
                    walking: {
                        mapped_speed: fieldObject.walking_mapped,
                        unmapped_speed: fieldObject.walking_unmapped
                    }
                }
            }
        }
        return travelObject;
    }

    const createSessionDemandObject = (fieldObject) => {
        let demandObject = {};
        if (fieldObject.type === 'single') {
            demandObject = {
                single: {
                    file_name: fieldObject.fileObject_1.fileName
                }
            };
        } else if (fieldObject.type === 'multiple') {
            demandObject = {
                multiple: {
                    multiparous_file_name: fieldObject.fileObject_1.fileName,
                    nuliparous_file_name: fieldObject.fileObject_2.fileName,
                    total_demand: {
                        manual_input: fieldObject.demandValue
                    }
                }
            };
        }
        return demandObject;
    }

    const loadSession = async () => {
        setUsername(username)
        setSessionName("sessionNewUi")

        console.log(`Getting user session for ${sessionName}`);
        const payload = {
            username: "74877d13-99d1-4164-aaaa-0884d86a223c",
            session_name: "sessionNewUi"
        };

        try {
            const response = await fetch(loadSessionurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const sessionData = await response.json();
                console.log(sessionData)
                populateSessionData(sessionData)

                return sessionData;
            } else {
                console.error("Couldn't get session data");
            }
        } catch (error) {
            console.error('Error fetching user session:', error);
        }
    }

    const populateSessionData = (sessionObject) => {
        //TODO: complete this, and add file loading
        setGeofenceFileName(sessionObject.demand_data_geofence_file_name.S)
        setTotalDemandFileName(sessionObject.demand_data_tif_file_name.S)
    }


    React.useEffect(() => {
        if (user) {
            setUsername(user.username)
        } else {
            console.log("user not logged in.")
        }
    },[user])

    return (
        <Container maxWidth={'false'}>
            {user && (

                <Box>
                    <Backdrop
                        sx={(theme) => ({
                            color: '#fff',
                            zIndex: theme.zIndex.drawer + 1,
                            display: 'flex',             // Add flex display
                            flexDirection: 'column',     // Align children in a column
                            justifyContent: 'center',    // Center children vertically
                            alignItems: 'center'         // Center children horizontally
                        })}
                        open={backdropOpen}
                    >
                        <Typography variant="h4">{backdropText}</Typography>
                        <LinearProgress
                            variant="determinate"
                            value={backdropProgress}
                            sx={{ width: '50%', mt: 2 }}  // Adjust width and margin-top for spacing
                        />
                    </Backdrop>
                    <Navbar user={user} logoutHandler={signOut} loadSessionHandler={loadSession} saveSessionHandler={handleSaveSession}/>
                    <HorizontalNonLinearStepper mainPageActiveStepHandler={setActiveStep} step1CheckObject={step1CheckObject}/>

                    {/*demand data input*/}
                    <Box sx={{mt: 3, mb:5,display: activeStep === 1 ? 'block' : 'none'}} id={'section1'}>
                        <Typography variant="h5" gutterBottom={true}>
                            I. Demand Data Input
                        </Typography>
                        <Grid container spacing={2} columns={16}>
                            <Grid xs={8}>
                                <Item>
                                    <Box>
                                        <FileHandlingButtons
                                            fileObject={totalDemandFileObject}
                                        />
                                    </Box>
                                </Item>
                            </Grid>
                            <Grid xs={8}>
                                <Item>
                                    <Box>
                                        <FileHandlingButtons
                                            fileObject={geofenceFileObject}
                                        />
                                    </Box>
                                </Item>
                            </Grid>
                        </Grid>
                        {/*Travel Speed*/}
                        <Box sx={{px: 5, mt:3 }}>
                            <Typography variant="h5" gutterBottom={true}>
                                A. Travel Speed
                            </Typography>
                            <Button
                                variant="contained"
                                onClick={handleTravelSpeedTypeChange}
                            >Switch to {travelSpeedTypeDisplay}
                            </Button>
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
                                {travelSpeedType=='single' && (
                                    <Grid item xs={12}>
                                        <Grid container spacing={2} columns={12}>
                                            <Grid item xs={3}>
                                                <Item>
                                                    <Box>
                                                        <Typography variant="h6" gutterBottom={true}>
                                                            N/A
                                                        </Typography>
                                                    </Box>
                                                </Item>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Item>
                                                    <Box>
                                                        <Grid container spacing={2} columns={16}>
                                                            <Grid item xs={8}>
                                                                <Item>
                                                                    <Box>
                                                                        <Typography>Unmapped Ways Speed (km/h)</Typography>
                                                                        <TextField size={'small'} id="outlined-basic" variant="outlined"
                                                                                   value={travelSpeedMotorizedUnmapped || ''}
                                                                                   onChange={handleInputChangeMotorizedUnmapped}
                                                                        />
                                                                    </Box>
                                                                </Item>
                                                            </Grid>
                                                            <Grid item xs={8}>
                                                                <Item>
                                                                    <Box>
                                                                        <Typography>Mapped Ways Speed (km/h)</Typography>
                                                                        <TextField  size={'small'} id="outlined-basic" variant="outlined"
                                                                                    value={travelSpeedMotorizedMapped || ''}
                                                                                    onChange={handleInputChangeMotorizedMapped}
                                                                        />
                                                                    </Box>
                                                                </Item>
                                                            </Grid>
                                                        </Grid>
                                                    </Box>
                                                </Item>
                                            </Grid>
                                            <Grid item xs={3}>
                                                <Item>
                                                    <Box>
                                                        <Typography variant="h6" gutterBottom={true}>
                                                            {travelSpeedMotorizedDemand}
                                                        </Typography>
                                                    </Box>
                                                </Item>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                )}
                                {/*Multiple*/}
                                {travelSpeedType=='multiple' && (
                                    <>
                                        <Grid item xs={12}>
                                            <Grid container spacing={2} columns={12}>
                                                <Grid item xs={3}>
                                                    <Item>
                                                        <Box>
                                                            <Typography variant="h6" gutterBottom={true}>
                                                                Motorized
                                                            </Typography>
                                                        </Box>
                                                    </Item>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Item>
                                                        <Box>
                                                            <Grid container spacing={2} columns={16}>
                                                                <Grid item xs={8}>
                                                                    <Item>
                                                                        <Box>
                                                                            <Typography>Unmapped Ways Speed (km/h)</Typography>
                                                                            <TextField size={'small'} id="outlined-basic" variant="outlined" />
                                                                        </Box>
                                                                    </Item>
                                                                </Grid>
                                                                <Grid item xs={8}>
                                                                    <Item>
                                                                        <Box>
                                                                            <Typography>Mapped Ways Speed (km/h)</Typography>
                                                                            <TextField size={'small'} id="outlined-basic" variant="outlined" />
                                                                        </Box>
                                                                    </Item>
                                                                </Grid>
                                                            </Grid>
                                                        </Box>
                                                    </Item>
                                                </Grid>
                                                <Grid item xs={3}>
                                                    {travelSpeedDemandType == 'manual' && (
                                                        <Item>
                                                            <Box sx={{mt:3, ml:2}} display="flex" justifyContent="left" alignItems="center" >
                                                                <CustomTextInput
                                                                    value={travelSpeedMotorizedDemand}
                                                                    onChange={handleTravelSpeedDemandInputChange}
                                                                />
                                                                <Button onClick={handleTravelSpeedDemandTypeChange}>{travelSpeedDemandTypeDisplay}</Button>
                                                            </Box>
                                                        </Item>
                                                    )}
                                                    {travelSpeedDemandType == 'file' && (
                                                        <Item>
                                                            <Box sx={{mt:3, ml:2}} display="flex" justifyContent="left" alignItems="center" >
                                                                <FileHandlingButtons/>
                                                                <Button onClick={handleTravelSpeedDemandTypeChange}>{travelSpeedDemandTypeDisplay}</Button>
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
                                                                Walking
                                                            </Typography>
                                                        </Box>
                                                    </Item>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Item>
                                                        <Box>
                                                            <Grid container spacing={2} columns={16}>
                                                                <Grid item xs={8}>
                                                                    <Item>
                                                                        <Box>
                                                                            <Typography>Unmapped Ways Speed (km/h)</Typography>
                                                                            <TextField size={'small'} id="outlined-basic" variant="outlined" />
                                                                        </Box>
                                                                    </Item>
                                                                </Grid>
                                                                <Grid item xs={8}>
                                                                    <Item>
                                                                        <Box>
                                                                            <Typography>Mapped Ways Speed (km/h)</Typography>
                                                                            <TextField size={'small'} id="outlined-basic" variant="outlined" />
                                                                        </Box>
                                                                    </Item>
                                                                </Grid>
                                                            </Grid>
                                                        </Box>
                                                    </Item>
                                                </Grid>
                                                <Grid item xs={3}>
                                                    {travelSpeedDemandType=='manual' && (
                                                        <Item>
                                                            <Box sx={{mt:3, ml:2}} display="flex" justifyContent="left" alignItems="center" >
                                                                <TextField InputProps={{
                                                                    readOnly: true,
                                                                }} sx={{width:'50%'}}size={'small'}
                                                                           value={100-travelSpeedMotorizedDemand}></TextField>
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
                        <InputSection fieldObject={latentPhaseObject}/>
                        <InputSection fieldObject={laborObject}/>
                    </Box>
                    {/*facility data input*/}
                    <Box sx={{mt:5, mb: 5,display: activeStep === 2 ? 'block' : 'none'}}>
                        <Typography sx={{mb:3}} variant="h5" gutterBottom={true}>
                            II. Facility Data Input
                        </Typography>
                        <FileHandlingButtons fileObject={facilityFileObject}/>
                        {/*Table*/}
                        <FacilityDataTable
                            filename={facilityFileName}
                            fileJson={facilityFileJson}
                            setFacilityFileJson={setFacilityFileJson}
                            rows={tableRows}
                            setRows={setTableRows}
                        />
                        <Box sx={{mt:5}}>

                        </Box>
                    </Box>
                    {/* policy definition */}
                    <Box sx={{mt:5, mb:5,display: activeStep === 3 ? 'block' : 'none'}}>
                        <Typography variant="h5" gutterBottom={true} sx={{mb:3}}>
                            III - Policy Definition
                        </Typography>
                        <Box sx={{mb:3}}>
                            <FormLabel id="objective_label">Policy Objective</FormLabel>
                            <RadioGroup
                                row
                                aria-labelledby="demo-row-radio-buttons-group-label"
                                name="row-radio-buttons-group"
                                value={policyValue}
                                onChange={handlePolicyChange}
                            >
                                <FormControlLabel value="egalitarian" control={<Radio />} label="Egalitarian" />
                                <FormControlLabel value="utilitarian" control={<Radio />} label="Utilitarian" />
                            </RadioGroup>
                        </Box>
                        <Box sx={{mb:3}}>
                            <FormLabel id="num_zones_label">Number of Zones</FormLabel>
                            <RadioGroup
                                row
                                aria-labelledby="demo-row-radio-buttons-group-label"
                                name="row-radio-buttons-group"
                                value={numZonesSelector}
                                onChange={handleNumZonesSelector
                                }
                            >
                                <FormControlLabel value="one" control={<Radio />} label="1" />
                                <FormControlLabel value="two" control={<Radio />} label="2" />
                                <FormControlLabel value="three" control={<Radio />} label="3" />
                                <FormControlLabel value="infinite" control={<Radio />} label="∞" />
                            </RadioGroup>
                        </Box>
                        <Box sx={{mb:3}}>
                            <FormLabel id="move_after_date_label">Allow recommended MWH move after expected due date?</FormLabel>
                            <RadioGroup
                                row
                                aria-labelledby="demo-row-radio-buttons-group-label"
                                name="row-radio-buttons-group"
                            >
                                <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                                <FormControlLabel value="no" control={<Radio />} label="No" />
                            </RadioGroup>
                        </Box>
                        <Box>
                            <ZoneSelector zoneObject={zone1Object}/>
                            <ZoneSelector zoneObject={zone2Object}/>
                            <ZoneSelector zoneObject={zone3Object}/>
                        </Box>



                    </Box>
                    {/*assignment map*/}
                    <Box sx={{mt:5, mb:5, display: activeStep === 4 ? 'block' : 'none'}}>
                        {assignmentMapRows && (
                            <DataGrid
                                rows={assignmentMapRows}
                                columns={assignmentMapCols}
                                initialState={{
                                    pagination: {
                                        paginationModel: { page: 0, pageSize: 10 },
                                    },
                                }}
                                pageSizeOptions={[10]}
                                checkboxSelection = {false}
                            />
                        )}

                        <Typography variant="h5" gutterBottom={true}>
                            V - MWH Assignment Map
                        </Typography>
                        <MapComponent facilityFileJson = {facilityFileJson} geoboundaryData={geoboundaryObject.pregnancyValues} costAndOptimizationData={costAndOptimizationData}
                                      optimizationEngineData = {optimisationEngineData}
                                      setAssignmentMapRows = {setAssignmentMapRows}
                                      backdropObject={backdropObject}
                                      isVisible={activeStep === 4}
                        />
                        <Box sx={{mt:5, mb:3}}>
                            <Button
                                onClick={() => {getGeoboundary(generateMapObject)}}
                                variant={'contained'} color={'success'}>Generate Map</Button>
                            {alertVisible && (
                                <Alert
                                    sx={{ mt: 2 }}
                                    severity="warning"
                                    onClose={handleGenerateMapAlertClose}
                                >
                                    {generateMapAlertText}
                                </Alert>
                            )}
                        </Box>
                        <Button variant="contained"
                                sx = {{'mt': 3}}
                                onClick={() => generateAssignmentMap(generateAssignmentMapObject)}
                                disabled={costAndOptimizationData === null}
                        >
                            Generate Assignment Map
                        </Button>
                    </Box>

                </Box>
            )}
            {!user && (
                <Navbar userAuth={userAuth} loginHandler={handleLogin} logoutHandler={signOut}/>
            )}


        </Container>
    );
}
//
// // This is a wrapper component that applies the withAuthenticator HOC
// function AuthenticatedDashboardPage(props: any) {
//     const AuthenticatedPage = withAuthenticator(DashboardPage);
//     return <AuthenticatedPage {...props} />;
// }
//
// // This is the default export that Next.js expects
// export default AuthenticatedDashboardPage;