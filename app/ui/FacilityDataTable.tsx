import {DataGrid, GridColDef} from '@mui/x-data-grid';
import {Box, MenuItem, Select, Tooltip, Typography} from "@mui/material";
import React from "react";
import Button from "@mui/material/Button";
import axios from "axios";


const defaultProps = {
    filename: "",
    fileJson: null,
    setFacilityFileJson: null
}

export default function FacilityDataTable(props = defaultProps) {
    const [rows, setRows] = React.useState([]);
    const [initialLoad, setInitialLoad] = React.useState(true); // Track initial load

    const columns: GridColDef[] = [
        { field: 'facility', headerName: 'Facility', flex: 1, minWidth: 150 },
        { field: 'district', headerName: 'District', flex: 1, minWidth: 150 },
        { field: 'patientBeds', headerName: 'MWH Patient Beds', type: 'number', flex: 1, minWidth: 100, align: 'left', headerAlign: 'left' },
        {
            field: 'assignedMwh',
            headerName: 'Assigned MWH',
            flex: 1,
            minWidth: 150,
            renderCell: (params) => (
                <AssignedMwhCellRenderer value={params.value} row={params.row} setRows={setRows} />
            ),
        },
    ];
    const processFacilityFile = async () => {
        if (props.fileJson && initialLoad) {
            console.log("Processing facility file...");
            const jsonData = props.fileJson;
            const facilities = jsonData.map((row) => row['Facility']);
            const processedData = jsonData.map((row, index) => ({
                id: index + 1,
                facility: row['Facility'],
                district: row['District'],
                patientBeds: row['MWH Patient Beds'],
                assignedMwh: row['Facility'],
                latitude: row['Latitude'],
                longitude: row['Longitude'],
                facilities
            }));

            setRows(processedData);
            const updatedJsonData = processedData.map(row => ({
                Latitude: row.latitude,
                Longitude: row.longitude,
                Facility: row.facility,
                District: row.district,
                'MWH Patient Beds': row.patientBeds,
                'Assigned MWH': row.assignedMwh,
            }));

            // Call props.setFacilityFileJson with the updated JSON data
            console.log("Updating json with new mwh assignment.")
            props.setFacilityFileJson(updatedJsonData);
            setInitialLoad(false); // Set initial load to false after processing
        } else {
            console.log("No file or not initial load.");
        }
    };

    React.useEffect(() => {
        processFacilityFile();
    }, [props.fileJson]);

    // Function to export the data as JSON
    const exportDataAsJson = () => {
        return rows.map(({ id, facilities, assignedMwh, latitude, longitude, facility, district, patientBeds }) => {
            // Ensure correct property names and include Latitude and Longitude

            return {
                Latitude: latitude,
                Longitude: longitude,
                Facility: facility,
                District: district,
                'MWH Patient Beds': patientBeds,
                'Assigned MWH': assignedMwh,
            };
        });
    };
    const getMwhAssignment = async (method: String) => {
        const url = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/mwh-assignment'
        const data = exportDataAsJson();
        const payload = {
            data: data,
            method: method
        };
        try {
            console.log('Sending payload:', JSON.stringify(payload, null, 2));
            const response = await axios.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log('Response received:', response);

            const updatedData = response.data.modified_data;

            // Process and update the rows with the new data, while preserving Latitude and Longitude
            const newRows = updatedData.map((row, index) => {
                // Find the original row by facility name to preserve Latitude and Longitude
                const originalRow = rows.find(originalRow => originalRow.facility === row.Facility);
                    return {
                    id: index + 1,
                    latitude: originalRow ? originalRow.latitude : null,  // Preserve original Latitude
                    longitude: originalRow ? originalRow.longitude : null, // Preserve original Longitude
                    facility: row.Facility,
                    district: row.District,
                    patientBeds: row['MWH Patient Beds'],
                    assignedMwh: row['Assigned MWH'] || row.Facility, // Update with the new assigned MWH
                    facilities: originalRow ? originalRow.facilities : [], // Preserve the facilities dropdown options
                };
            });
            console.log(newRows)
            setRows(newRows);
            // Convert newRows back to the original JSON format
            const updatedJsonData = newRows.map(row => ({
                Latitude: row.latitude,
                Longitude: row.longitude,
                Facility: row.facility,
                District: row.district,
                'MWH Patient Beds': row.patientBeds,
                'Assigned MWH': row.assignedMwh,
            }));

            // Call props.setFacilityFileJson with the updated JSON data
            console.log("Updating json with new mwh assignment.")
            props.setFacilityFileJson(updatedJsonData);
        } catch (error) {
            console.error("Error fetching MWH assignment:", error);
            console.error("Error response:", error.response);
        }

    }

    return (
        <Box>
            <Box>
                { props.fileJson && (
                    <Box >
                        <DataGrid
                            rows={rows}
                            columns={columns}
                            initialState={{
                                pagination: {
                                    paginationModel: { page: 0, pageSize: 10 },
                                },
                            }}
                            checkboxSelection
                        />
                    </Box>
                )}
            </Box>
            <Box  sx={{mt:3}} display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" gutterBottom={true}>
                    Automatically Apply Assigned MWH:
                </Typography>
                <Box>
                    <Tooltip title="No MWH Patient Stay From Outside MWH Facility Catchment Area">
                        <Button onClick={() => getMwhAssignment('no-outside-stay')} sx={{ mr: 3 }} variant="contained" size="large">No Outside</Button>
                    </Tooltip>
                    <Tooltip title="MWH Patient Stay From All Nearest Facilities Without MWH Beds">
                        <Button onClick={() => getMwhAssignment('all-nearest-facilities')} variant="contained" size="large">All Nearest</Button>
                    </Tooltip>
                </Box>
            </Box>
        </Box>
    );
}

const AssignedMwhCellRenderer = ({ value, row, setRows }) => {
    const handleChange = (event) => {
        const newAssignedMwh = event.target.value;
        setRows((prevRows) =>
            prevRows.map((r) =>
                r.id === row.id ? { ...r, assignedMwh: newAssignedMwh } : r
            )
        );
    };

    return (
        <Select
            value={value}
            onChange={handleChange}
            displayEmpty
            fullWidth
        >
            {/* List of all facilities */}
            {row.facilities.map((facility) => (
                <MenuItem key={facility} value={facility}>
                    {facility}
                </MenuItem>
            ))}
        </Select>
    );
};

