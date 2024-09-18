import React from 'react';
import Plot from 'react-plotly.js';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import {fromCognitoIdentityPool} from "@aws-sdk/credential-providers"; // Import necessary AWS SDK components
import * as XLSX from 'xlsx';

const defaultProps = {
    facilityFileJson: null,
    geoboundaryData: null,
    costMatrixData: null,
    costAndOptimizationData: null,
    optimizationEngineData: null,
    setAssignmentMapRows: null,
    backdropObject: null,
};

function MapComponent(props) {
    const [facilityData, setFacilityData] = React.useState(null);
    const [geoboundaryData, setGeoboundaryData] = React.useState(null);
    const [plotData, setPlotData] = React.useState([]); // State to store plot data
    const bucketName = "user-facility-files"; // Your S3 bucket name

    React.useEffect(() => {
        if (props.facilityFileJson) {
            processFacilityData(props.facilityFileJson);
        } else {
            setFacilityData(null);
        }
    }, [props.facilityFileJson]);

    React.useEffect(() => {
        if (props.geoboundaryData) {
            const processedGeoboundaryData = processPregnancyValues(props.geoboundaryData);
            setGeoboundaryData(processedGeoboundaryData);
        } else {
            setGeoboundaryData(null);
        }
    }, [props.geoboundaryData]);

    React.useEffect(() => {
        if (props.costAndOptimizationData) {
            updateMapWithCostAndOptimization(props.costAndOptimizationData);
        }
    }, [props.costAndOptimizationData]);

    React.useEffect(() => {
        if (props.optimizationEngineData) {
            fetchAndProcessFiles(props.optimizationEngineData);
        }
    }, [props.optimizationEngineData]);


    // Function to fetch and process files from S3
    const fetchAndProcessFiles = async (outputFiles) => {
        console.log("Fetching optimisation result files.", outputFiles)
        const s3Client = new S3Client({
            region: "eu-west-2", // Replace with your region
            credentials: fromCognitoIdentityPool({
                clientConfig: { region: "eu-west-2" }, // Replace with your region
                identityPoolId: "eu-west-2:f891c50a-12ec-47dd-820e-7f7d224309ad", // Replace with your Identity Pool ID
            }),
        });
        let newTableData = [];
        let allLats = [];
        let allLons = [];
        let allPbbaTexts = [];
        let allNames = [];
        let pbbaValues = [];

        for (const s3Key of outputFiles.output_files) {
            try {
                const getObjectParams = { Bucket: bucketName, Key: s3Key };
                const command = new GetObjectCommand(getObjectParams);
                const response = await s3Client.send(command);

                // Convert response body stream to buffer
                const buffer = await readableStreamToBuffer(response.Body);
                const { hfName, assignedMwh, maxPbba, minPbba, df } = processFile(buffer);

                if (!hfName) {
                    console.log(`Skipping file due to processing error: ${s3Key}`);
                    continue;
                }

                // Update table data
                newTableData.push({
                    id: hfName,
                    'hfName': hfName,
                    'assignedMwh': assignedMwh,
                    'maxPbba': maxPbba,
                    'minPbba': minPbba
                });

                const latLonData = df.map(row => ({ lat: row['lat'], lon: row['lon'] }));
                const pbbaData = df.map(row => row['PBBA']);

                allLats.push(...latLonData.map(item => item.lat));
                allLons.push(...latLonData.map(item => item.lon));
                allPbbaTexts.push(...pbbaData.map(pbba => `PBBA: ${pbba.toFixed(3)}`));
                allNames.push(...latLonData.map(() => hfName));
                pbbaValues.push(...pbbaData);

            } catch (error) {
                console.error(`Error retrieving file from S3: ${s3Key}, Error: ${error.message}`);
            }
        }

        // Create traces
        createTraces(allLats, allLons, allPbbaTexts, allNames, pbbaValues);
        props.setAssignmentMapRows(newTableData);
        props.backdropObject.setBackdropOpen(false);
        props.backdropObject.setBackdropText("");
        props.backdropObject.setBackdropProgress(0);
    };

    // Convert ReadableStream to a Buffer (compatible with browser)
    const readableStreamToBuffer = async (readableStream) => {
        const reader = readableStream.getReader();
        const chunks = [];
        let done, value;

        while (!done) {
            ({ done, value } = await reader.read());
            if (value) {
                chunks.push(value);
            }
        }

        // Concatenate all chunks into a single Uint8Array
        const buffer = new Uint8Array(chunks.reduce((acc, val) => acc + val.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
            buffer.set(chunk, offset);
            offset += chunk.length;
        }

        return buffer;
    };

    //TODO: map reloads every time

    // Process the file content (adapted from Python code)
    const processFile = (fileBuffer) => {
        try {
            const workbook = XLSX.read(fileBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            const hfName = jsonData[0]['Facility'];
            const assignedMwh = jsonData[0]['Nearest MWH'];
            const maxPbba = Math.max(...jsonData.map(row => row['PBBA']));
            const minPbba = Math.min(...jsonData.map(row => row['PBBA']));

            console.debug(`Processed Excel file successfully: ${hfName}`);

            return {
                hfName,
                assignedMwh,
                maxPbba,
                minPbba,
                df: jsonData,
            };
        } catch (error) {
            console.error(`Error processing Excel file: ${error.message}`);
            return { hfName: null, assignedMwh: null, maxPbba: null, minPbba: null, df: null };
        }
    };

    // Function to create and add traces
    const createTraces = (lats, lons, pbbaTexts, names, pbbaValues) => {
        // PBBA gradient trace
        const pbbaTrace = {
            type: 'scattermapbox',
            lat: lats,
            lon: lons,
            mode: 'markers',
            marker: {
                size: 12,
                color: pbbaValues,
                colorscale: 'Viridis',
                opacity: 0.7
            },
            text: pbbaTexts,
            name: 'PBBA Gradient'
        };

        // Facility categories trace
        const colorMap = {};
        names.forEach((name, index) => {
            if (!colorMap[name]) {
                colorMap[name] = `hsl(${Math.random() * 360}, 100%, 50%)`; // Random colors for example
            }
        });
        const facilityColors = names.map(name => colorMap[name]);

        const facilityTrace = {
            type: 'scattermapbox',
            lat: lats,
            lon: lons,
            mode: 'markers',
            marker: {
                size: 12,
                color: facilityColors,
                opacity: 0.7
            },
            text: pbbaTexts,
            name: 'Facility Categories'
        };

        setPlotData(prevData => [...prevData, pbbaTrace, facilityTrace]);
    };

    const processFacilityData = (data) => {
        const processedData = data.map(row => ({
            Facility: row.Facility,
            Latitude: parseFloat(row.Latitude),
            Longitude: parseFloat(row.Longitude),
            District: row.District,
            MwhPatientBeds: row['MWH Patient Beds']
        })).filter(row => !isNaN(row.Latitude) && !isNaN(row.Longitude));

        const centerLatitude = processedData.reduce((sum, row) => sum + row.Latitude, 0) / processedData.length;
        const centerLongitude = processedData.reduce((sum, row) => sum + row.Longitude, 0) / processedData.length;

        setFacilityData({
            centerPoint: { centerLatitude, centerLongitude },
            facilitiesList: processedData,
            facilitiesProcessed: processedData.length
        });
    };

    const processPregnancyValues = (data) => {
        const { X, Y, Value } = data.pregnancy_values;
        return {
            lat: Object.values(Y),
            lon: Object.values(X),
            value: Object.values(Value)
        };
    };

    const updateMapWithCostAndOptimization = (costAndOptimizationData) => {
        console.log('Update map with cost and optimization');

        if (costAndOptimizationData) {
            // Parse the JSON string if necessary
            let parsedData;
            try {
                parsedData = typeof costAndOptimizationData === 'string'
                    ? JSON.parse(costAndOptimizationData)
                    : costAndOptimizationData;
            } catch (e) {
                console.error('Failed to parse cost and optimization data:', e);
                return;
            }

            const optimizationData = parsedData['cost-and-optimization'];

            if (optimizationData) {
                const lats = Object.values(optimizationData.lat);
                const lons = Object.values(optimizationData.lon);
                const times = Object.values(optimizationData.time_sec_post);

                const travelTimeAreaExists = plotData.some(trace => trace.name === 'Travel time area');

                if (!travelTimeAreaExists) {
                    const newTraceCost = {
                        type: 'scattermapbox',
                        name: 'Travel time area',
                        lat: lats,
                        lon: lons,
                        text: times.map(time => `<b> Time: </b>${Math.round(time/60)} mins <br>`),
                        marker: {
                            size: 11,
                            color: times,
                            colorscale: 'rdylgn',
                            reversescale: false
                        }
                    };

                    setPlotData(prevData => {
                        const updatedData = [...prevData, newTraceCost];
                        return updatedData;
                    });
                }
            } else {
                console.log("Cost optimization data doesn't exist; skip adding to map");
            }
        } else {
            console.log("Cost optimization data doesn't exist; skip adding to map");
        }
    };

    const layout = facilityData ? {
        mapbox: {
            style: 'open-street-map',
            center: {
                lat: facilityData.centerPoint.centerLatitude,
                lon: facilityData.centerPoint.centerLongitude
            },
            zoom: 6
        },
        margin: { r: 0, t: 0, l: 0, b: 0 },
        height: 550,
        hovermode: 'closest',
        showlegend: true,
        legend: { x: 1, y: 0.95 }
    } : {
        mapbox: {
            style: 'open-street-map',
            center: {
                lat: 5,
                lon: 5
            },
            zoom: 1
        },
        margin: { r: 0, t: 0, l: 0, b: 0 },
        height: 550,
        hovermode: 'closest',
        showlegend: true,
        legend: { x: 1, y: 0.95 }
    };

    const data = [
        ...(geoboundaryData ? [{
            type: 'scattermapbox',
            name: 'Demand Data',
            lat: geoboundaryData.lat,
            lon: geoboundaryData.lon,
            text: geoboundaryData.value.map(value => `Value: ${value.toFixed(1)}`),
            hoverinfo: 'text',
            marker: {
                size: 11,
                color: geoboundaryData.value,
                colorscale: [
                    [0, 'rgb(165,0,38)'],
                    [0.2, 'rgb(215,48,39)'],
                    [0.4, 'rgb(252,141,89)'],
                    [0.6, 'rgb(254,224,139)'],
                    [0.8, 'rgb(217,239,139)'],
                    [1, 'rgb(26,152,80)']
                ],
                reversescale: true
            }
        }] : []),
        ...plotData,
        ...(facilityData ? [{
            type: 'scattermapbox',
            name: 'Health Facility (HF)',
            lat: facilityData.facilitiesList.map(facility => facility.Latitude),
            lon: facilityData.facilitiesList.map(facility => facility.Longitude),
            mode: 'markers',
            marker: {
                size: 14,
                color: facilityData.facilitiesList.map(facility => facility.MwhPatientBeds === 0 ? 'black' : 'rgb(255, 0, 255)')
            },
            text: facilityData.facilitiesList.map(facility =>
                `<b>Facility:</b> ${facility.Facility}<br><b>District:</b> ${facility.District}<br><b>Beds:</b> ${facility.MwhPatientBeds}`
            ),
        }] : [
            {
                type: 'scattermapbox'
            }
        ])
    ];

    return (
        <Plot
            data={data}
            layout={layout}
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
        />
    );
}

export default MapComponent;
