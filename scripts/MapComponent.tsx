// import React from 'react';
// import Plot from 'react-plotly.js';
//
// const defaultProps = {
//     facilityFileJson: null,
//     geoboundaryData: null,
//     costMatrixData: null,
//     costAndOptimizationData: null
// }
// function MapComponent(props) {
//     const [facilityData, setFacilityData] = React.useState(null);
//     const [geoboundaryData, setGeoboundaryData] = React.useState(null);
//     const [plotData, setPlotData] = React.useState([]); // State to store plot data
//     const bucketName = "user-facility-files";
//
//     React.useEffect(() => {
//         if (props.facilityFileJson) {
//             processFacilityData(props.facilityFileJson);
//         } else {
//             setFacilityData(null)
//         }
//     }, [props.facilityFileJson]);
//
//     React.useEffect(() => {
//         if (props.geoboundaryData) {
//             const processedGeoboundaryData = processPregnancyValues(props.geoboundaryData);
//             setGeoboundaryData(processedGeoboundaryData);
//         } else {
//             setGeoboundaryData(null);
//         }
//     }, [props.geoboundaryData]);
//
//     React.useEffect(() => {
//         if (props.costAndOptimizationData) {
//             updateMapWithCostAndOptimization(props.costAndOptimizationData);
//         }
//     }, [props.costAndOptimizationData]);
//
//     const processFacilityData = (data) => {
//         const processedData = data.map(row => ({
//             Facility: row.Facility,
//             Latitude: parseFloat(row.Latitude),
//             Longitude: parseFloat(row.Longitude),
//             District: row.District,
//             MwhPatientBeds: row['MWH Patient Beds']
//         })).filter(row => !isNaN(row.Latitude) && !isNaN(row.Longitude));
//
//         const centerLatitude = processedData.reduce((sum, row) => sum + row.Latitude, 0) / processedData.length;
//         const centerLongitude = processedData.reduce((sum, row) => sum + row.Longitude, 0) / processedData.length;
//
//         setFacilityData({
//             centerPoint: { centerLatitude, centerLongitude },
//             facilitiesList: processedData,
//             facilitiesProcessed: processedData.length
//         });
//     };
//
//     const processPregnancyValues = (data) => {
//         const { X, Y, Value } = data.pregnancy_values;
//         return {
//             lat: Object.values(Y),
//             lon: Object.values(X),
//             value: Object.values(Value)
//         };
//     };
//
//     const updateMapWithCostAndOptimization = (costAndOptimizationData) => {
//         console.log('Update map with cost and optimization');
//
//         if (costAndOptimizationData) {
//             // Parse the JSON string if necessary
//             let parsedData;
//             try {
//                 parsedData = typeof costAndOptimizationData === 'string'
//                     ? JSON.parse(costAndOptimizationData)
//                     : costAndOptimizationData;
//             } catch (e) {
//                 console.error('Failed to parse cost and optimization data:', e);
//                 return;
//             }
//
//             const optimizationData = parsedData['cost-and-optimization'];
//
//             if (optimizationData) {
//                 // Extract the data from the structure
//                 const lats = Object.values(optimizationData.lat);
//                 const lons = Object.values(optimizationData.lon);
//                 const times = Object.values(optimizationData.time_sec_post);
//
//                 // Check if the trace for 'Travel time area' already exists
//                 const travelTimeAreaExists = plotData.some(trace => trace.name === 'Travel time area');
//
//                 if (!travelTimeAreaExists) {
//                     // Create a new trace for the map
//                     const newTraceCost = {
//                         type: 'scattermapbox',
//                         name: 'Travel time area',
//                         lat: lats, // Extract latitude
//                         lon: lons, // Extract longitude
//                         text: times.map(time => `<b> Time: </b>${Math.round(time)} mins <br>`), // Generate text for each point
//                         marker: {
//                             size: 11,
//                             color: times, // Color based on time
//                             colorscale: 'rdylgn',
//                             reversescale: false
//                         }
//                     };
//
//                     // Update the state with the new trace
//                     setPlotData(prevData => {
//                         const updatedData = [...prevData, newTraceCost];
//                         return updatedData;
//                     });
//                 }
//             } else {
//                 console.log("Cost optimization data doesn't exist; skip adding to map");
//             }
//         } else {
//             console.log("Cost optimization data doesn't exist; skip adding to map");
//         }
//     };
//
//
//     const layout = facilityData ? {
//         mapbox: {
//             style: 'open-street-map',
//             center: {
//                 lat: facilityData.centerPoint.centerLatitude,
//                 lon: facilityData.centerPoint.centerLongitude
//             },
//             zoom: 6
//         },
//         margin: { r: 0, t: 0, l: 0, b: 0 },
//         height: 550,
//         hovermode: 'closest',
//         showlegend: true,
//         legend: { x: 1, y: 0.95 }
//     } :{
//         mapbox: {
//             style: 'open-street-map',
//             center: {
//                 lat: 5,
//                 lon: 5
//             },
//             zoom: 1
//         },
//         margin: { r: 0, t: 0, l: 0, b: 0 },
//         height: 550,
//         hovermode: 'closest',
//         showlegend: true,
//         legend: { x: 1, y: 0.95 }
//     };
//
//     const data = [
//         ...(geoboundaryData ? [{
//             type: 'scattermapbox',
//             name: 'Demand Data',
//             lat: geoboundaryData.lat,
//             lon: geoboundaryData.lon,
//             text: geoboundaryData.value.map(value => `Value: ${value.toFixed(1)}`),
//             hoverinfo: 'text',
//             marker: {
//                 size: 11,
//                 color: geoboundaryData.value,
//                 colorscale: [
//                     [0, 'rgb(165,0,38)'],     // Dark red
//                     [0.2, 'rgb(215,48,39)'],  // Red
//                     [0.4, 'rgb(252,141,89)'], // Orange
//                     [0.6, 'rgb(254,224,139)'],// Yellow
//                     [0.8, 'rgb(217,239,139)'],// Light green
//                     [1, 'rgb(26,152,80)']     // Green
//                 ],
//
//                 reversescale: true
//             }
//         }] : []),
//         ...plotData,
//         ...(facilityData ? [{
//             type: 'scattermapbox',
//             name: 'Health Facility (HF)',
//             lat: facilityData.facilitiesList.map(facility => facility.Latitude),
//             lon: facilityData.facilitiesList.map(facility => facility.Longitude),
//             mode: 'markers',
//             marker: {
//                 size: 14,
//                 color: facilityData.facilitiesList.map(facility => facility.MwhPatientBeds === 0 ? 'black' : 'rgb(255, 0, 255)')
//             },
//             text: facilityData.facilitiesList.map(facility =>
//                 `<b>Facility:</b> ${facility.Facility}<br><b>District:</b> ${facility.District}<br><b>Beds:</b> ${facility.MwhPatientBeds}`
//             ),
//         }] : [
//             {
//                 type: 'scattermapbox'
//             }
//         ])
//     ];
//
//
//     return (
//         <Plot
//             data={data}
//             layout={layout}
//             useResizeHandler
//             style={{ width: "100%", height: "100%" }}
//         />
//     );
// }
//
// export default MapComponent;
