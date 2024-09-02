import {DataGrid, GridColDef} from '@mui/x-data-grid';
import {Box, MenuItem, Select, Tooltip, Typography} from "@mui/material";
import React from "react";
import Button from "@mui/material/Button";
import axios from "axios";


const defaultProps = {
    filename: "",
    fileJson: null
}

export default function FacilityDataTable(props = defaultProps) {
    const [rows, setRows] = React.useState([]);
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
        if (props.fileJson) {
            console.log("Processing facility file...");
            const jsonData = props.fileJson
            const facilities = jsonData.map((row) => row['Facility']);
            const processedData = jsonData.map((row, index) => ({
                id: index + 1,
                facility: row['Facility'],
                district: row['District'],
                patientBeds: row['MWH Patient Beds'],
                assignedMwh: row['Facility'],
                facilities
            }));

            setRows(processedData);
        } else {
            console.log("No file.");
        }
    }

    React.useEffect(() => {
        processFacilityFile();
    }, [props.fileJson]);

    // Function to export the data as JSON
    const exportDataAsJson = () => {
        return rows.map(({ id, facilities, assignedMwh, ...rest }) => {
            // Ensure correct property names
            return {
                Latitude: rest.Latitude,
                Longitude: rest.Longitude,
                Facility: rest.facility,
                District: rest.district,
                'MWH Patient Beds': rest.patientBeds,
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

            const updatedData = response.data;

            // Process and update the rows with the new data
            const newRows = updatedData.map((row, index) => ({
                id: index + 1,
                Latitude: row['Latitude'],
                Longitude: row['Longitude'],
                facility: row.Facility,
                district: row.District,
                patientBeds: row['MWH Patient Beds'],
                assignedMwh: row['Assigned MWH'] || row.Facility, // Update with the new assigned MWH
                facilities: rows[0].facilities // Preserve the facilities dropdown options
            }));

            setRows(newRows);
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
                                    paginationModel: { page: 0, pageSize: 25 },
                                },
                            }}
                            pageSizeOptions={[10, 25, 50]}
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

