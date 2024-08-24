import axios from "axios";

export const formatCurrency = (amount) => {
  return (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

export const fileDbUrl = "https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/databaseFileManager"
export const optimisation_engine_url = "https://7bcf-86-4-207-130.ngrok-free.app"
export const geoboundaryUrl = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/geoboundary'

export const getGeoboundary = async (generateMapObject) => {
  if (!generateMapObject.totalDemandFile) {
    console.log(".tif file is missing.")
    generateMapObject.updateGenerateMapAlertText(".tif file is missing.")
    return
  }
  if (!generateMapObject.geofenceFile) {
    console.log(".geojson file is missing.")
    generateMapObject.updateGenerateMapAlertText(".geojson file is missing.")
    return
  }
  if (!generateMapObject.facilityFile) {
    console.log(" Facility file is missing.")
    generateMapObject.updateGenerateMapAlertText("Facility file is missing.")
    return
  }
  if (generateMapObject.facilityFile && generateMapObject.geofenceFile && generateMapObject.totalDemandFile) {
    generateMapObject.updateGenerateMapAlertText("")
    try {
      const totalDemandBase64 = await readFileAsBase64(generateMapObject.totalDemandFile);
      const geofenceBase64 = await readFileAsBase64(generateMapObject.geofenceFile);

      const payload = {
        tif_file: totalDemandBase64,
        geo_file: geofenceBase64
      };

      const response = await axios.post(geoboundaryUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      let jsonData = response.data;
      let parsedResponse = JSON.parse(jsonData.results);
      const result = {
        pregnancy_values: parsedResponse
      }
      generateMapObject.geoboundaryObject.handler(result)

    } catch (error) {
      console.error('Error reading files or uploading:', error);
    }
  }
}

// GET SAVED FILES
export const getSavedFiles = async (fileType, username) => {
  const type = "fetch"
  const payload = {
    type: type,
    username: username,
    website_sector: fileType
  }
  try {
    console.log('Getting saved files for :', fileType);
    const response = await axios.post(fileDbUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Response received:', response);
    return response.data; // Return the data from the response
  } catch (error) {
    console.error("Error fetching Saved Files:", error.response);
    return [];
  }
}

const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};



