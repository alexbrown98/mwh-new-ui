import axios from "axios";
import crypto from 'crypto-js';
import {GetObjectCommand, ListObjectsV2Command, S3Client} from "@aws-sdk/client-s3";
import {fromCognitoIdentityPool} from "@aws-sdk/credential-providers";
import * as XLSX from 'xlsx';
import {empirical_data_dir, status_error_generate_map, status_generating_map} from "@/app/lib/constants";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const formatCurrency = (amount) => {
  return (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

export const fileDbUrl = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/databaseFileManager';
export const geoboundaryUrl = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/geoboundary';
export const saveSessionUrl = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/save_user_session';
export const loadSessionurl = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/get_user_session';
const data_consolidation_lambda_endpoint = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/file-consolidation';
const optimisation_engine_url = 'https://30c2-94-46-236-217.ngrok-free.app/run-optimization';
const lambdaEndpoint = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/distance-to-road';
const costMatrixLambdaEndpoint = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/cost-matrix';
const costAndOptimizationEndpoint ='https://30c2-94-46-236-217.ngrok-free.app/process';


export const generateAssignmentMap = async (generateAssignmentMapObject) => {
  let speed, latent, labor;
  generateAssignmentMapObject.speed == 'single' ? speed = 'walking' : speed = 'Motorized, Walking'
  generateAssignmentMapObject.labor == 'single' ? labor = 'LMP certain' : 'LMP certain, LMP uncertain'
  generateAssignmentMapObject.latent == 'single' ? latent = 'nulliparous' : 'Multiparous, Nulliparous'

  if (!generateAssignmentMapObject.multi_file) {
    console.log("Cannot proceed without labor onset file.")
    return;
  }
  if (!generateAssignmentMapObject.lmp_file) {
    console.log("Cannot proceed without latent phase file.")
    return;
  }
  generateAssignmentMapObject.setCurrentStatusVerbose("combining input files..")
  generateAssignmentMapObject.isGenerating(true);
  const empirical_data_s3_key = await
      combineXlsxFiles(generateAssignmentMapObject.lmp_file,
          generateAssignmentMapObject.nulli_file, generateAssignmentMapObject.multi_file,
          generateAssignmentMapObject.username, empirical_data_dir)
  if (!empirical_data_s3_key) {
    console.log("Error when combining files.")
    generateAssignmentMapObject.isGenerating(false);
    generateAssignmentMapObject.setCurrentStatusVerbose("");

    return;
  }

  let payloadObject = {
    speed,
    labor,
    latent,
    username: generateAssignmentMapObject.username,
    filehash: generateAssignmentMapObject.filehash,
    tif_filename: generateAssignmentMapObject.tif_filename,
    table: generateAssignmentMapObject.table
  }

  generateAssignmentMapObject.setCurrentStatusVerbose("making call for file consolidation..")
  let payload = JSON.stringify(payloadObject);
  const response = await fetch(data_consolidation_lambda_endpoint,{
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });

  if (response.ok) {
    generateAssignmentMapObject.setCurrentStatusVerbose("consolidation successful..")
    let responseJson = await response.json();
    let parsedBody;
    try {
      parsedBody = JSON.parse(responseJson.body);
    } catch (error) {
      console.error("Error parsing response body:", error);
      generateAssignmentMapObject.isGenerating(false);
      generateAssignmentMapObject.setCurrentStatusVerbose("");

      return;
    }

    let num_zones_int = mapNumZones(generateAssignmentMapObject.num_zones)

    let policyData = {
      objective: generateAssignmentMapObject.objective,
      num_zones: num_zones_int,
      zones: getZoneObjects(generateAssignmentMapObject.zone1Object, generateAssignmentMapObject.zone2Object,
          generateAssignmentMapObject.zone3Object, num_zones_int),
    }

    let empiricalData = {
      multi: generateAssignmentMapObject.multi_file,
      nulli: generateAssignmentMapObject.nulli_file,
      gestation: generateAssignmentMapObject.lmp_file
    }
    generateAssignmentMapObject.setCurrentStatusVerbose("generating input hash..")

    const s3Key = parsedBody.s3_key;
    const file_count = parsedBody.file_count;
    const extractedHash = extractFileHash(s3Key)

    if (!extractedHash || (extractedHash !== generateAssignmentMapObject.filehash)) {
      console.error("Hash mismatch.", extractedHash, generateAssignmentMapObject.filehash)
      generateAssignmentMapObject.setBackdropText("")
      generateAssignmentMapObject.setBackdropOpen(false);
      generateAssignmentMapObject.setBackdropProgress(0);
      return;
    }

    const newHashString = extractedHash + JSON.stringify(empiricalData) + JSON.stringify(policyData);
    const newHash = crypto.MD5(newHashString).toString();
    console.debug("Generated second hash: ", newHash)
    const dirForCheck = generateAssignmentMapObject.username + "/optimization-engine-results/" + newHash + "/"
    const checkOptiExists = await checkS3DirectoryExists('user-facility-files', dirForCheck, file_count);
    generateAssignmentMapObject.setCurrentStatusVerbose("checking if hash already exists..")

    if (!checkOptiExists) {
      generateAssignmentMapObject.setCurrentStatusVerbose("making call to optimization engine..")

      // hashed file doesnt exist, generate it
      let opti_payload = {

        s3_key: s3Key,
        username: generateAssignmentMapObject.username,
        hash: newHash,
        excel_key: empirical_data_s3_key,
        objective: generateAssignmentMapObject.objective,
        num_zones: num_zones_int,
        zones: getZoneObjects(generateAssignmentMapObject.zone1Object, generateAssignmentMapObject.zone2Object,
            generateAssignmentMapObject.zone3Object, num_zones_int),
      }

      console.debug("Making request to optimisation engine.")
      const opti_response = await fetch(optimisation_engine_url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(opti_payload),
      })

      if (opti_response.ok) {
        generateAssignmentMapObject.setCurrentStatusVerbose("processing files..")
        console.debug("Optimisation response: ", opti_response)
        const responseBody = await opti_response.json();
        try {
          const results = await pollForOptimizationFiles(responseBody.s3_output_dir, file_count)
          console.debug("Polling done:", results)
          generateAssignmentMapObject.setOptimisationEngineData(results);
          generateAssignmentMapObject.isGenerating(false);
          generateAssignmentMapObject.setCurrentStatusVerbose("");
        } catch (e) {
          console.error("An error occurred when polling for results.", e)
          generateAssignmentMapObject.isGenerating(false);
          generateAssignmentMapObject.setCurrentStatusVerbose("");


        }
      }
    } else {
      // output dir exists,  no need to call optimization engine
      generateAssignmentMapObject.setCurrentStatusVerbose("hash exists, generating output..")
      try {
        const results = await pollForOptimizationFiles(dirForCheck, file_count)
        console.debug("Polling done:", results)
        generateAssignmentMapObject.setOptimisationEngineData(results);
      } catch (e) {
        console.error("An error occurred when polling for results.", e)
        generateAssignmentMapObject.isGenerating(false);
        generateAssignmentMapObject.setCurrentStatusVerbose("");

      }
    }



  } else {
    console.error("Error in consolidation request:", response.statusText);
    generateAssignmentMapObject.isGenerating(false);
  }
}


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
  if (!generateMapObject.travelSpeedMotorizedUnmapped || !generateMapObject.travelSpeedMotorizedMapped) {
    console.log("No travel speed data.")
    generateMapObject.updateGenerateMapAlertText("Travel speed data is missing.");
    return
  }
  if (generateMapObject.travelSpeedType === 'multiple') {
    if (!generateMapObject.travelSpeedWalkingUnmapped || !generateMapObject.travelSpeedWalkingMapped) {
      console.log("No walking travel speed data.")
      generateMapObject.updateGenerateMapAlertText("Travel speed data is missing.");
      return
    }
  }
  if (!generateMapObject.latentPhaseFileMulti) {
    console.log("Latent Phase file is missing.")
    generateMapObject.updateGenerateMapAlertText("Latent Phase file is missing.");
    return
  }
  if (!generateMapObject.laborOnsetFileLMP) {
    console.log("Labor Onset file is missing.")
    generateMapObject.updateGenerateMapAlertText("Labor Onset file is missing.");
    return
  }
  if (generateMapObject.facilityFile && generateMapObject.geofenceFile && generateMapObject.totalDemandFile) {
    generateMapObject.isGenerating(true);
    generateMapObject.setCostMatrixData(null);
    generateMapObject.setCostAndOptimizationData(null);
    generateMapObject.updateGenerateMapAlertText("")
    generateMapObject.setCurrentStatusVerbose("generating travel speed data...");
    generateMapObject.setBackdropText("Step 1/2: Generating travel speed data...")
    generateMapObject.setBackdropProgress(5);
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
      generateMapObject.setCurrentStatusVerbose("processing travel speed data...");

      let jsonData = response.data;
      let parsedResponse = JSON.parse(jsonData.results);
      const result = {
        pregnancy_values: parsedResponse
      }
      generateMapObject.geoboundaryObject.handler(result)
      generateMapObject.setBackdropProgress(20);

      let speedData = {
        motorized_mapped: generateMapObject.travelSpeedMotorizedMapped,
        motorized_unmapped: generateMapObject.travelSpeedMotorizedUnmapped,
        walking_mapped: generateMapObject.travelSpeedWalkingMapped,
        walking_unmapped: generateMapObject.travelSpeedWalkingUnmapped
      }

      if (result && generateMapObject.facilityFileJson) {
        const { s3Url, filename } = await uploadToS3(generateMapObject.facilityFileJson, result, generateMapObject.username,
            speedData);
        if (s3Url) {
          generateMapObject.setBackdropProgress(25);
          generateMapObject.setCurrentStatusVerbose("generating cost matrix data...");
          generateMapObject.setBackdropText("Step 2/2: Generating cost matrix data...")

          const backendResults = await requestToBackend(filename, s3Url, generateMapObject.username, generateMapObject.travelSpeedMotorizedUnmapped, generateMapObject.travelSpeedMotorizedMapped, generateMapObject.setBackdropProgress);
          if (backendResults) {
            //TODO: if travel speed is multiple, there will be 2 cost and optimization layers
            console.log('Backend processing completed successfully:', backendResults);
            generateMapObject.setCostMatrixData(JSON.parse(backendResults.costMatrixResults));
            generateMapObject.setCostAndOptimizationData(JSON.parse(backendResults.costAndOptimizationResults));
            generateMapObject.setOptimisationEngineData(null);
            generateMapObject.setFileHash(filename)
            generateMapObject.isGenerating(false);
            generateMapObject.setCurrentStatusVerbose("");
          } else {
            console.log('Failed to process backend data.');
            //TODO: add feedback here
            generateMapObject.setBackdropText("")
            generateMapObject.setBackdropOpen(false);
            generateMapObject.setBackdropProgress(0);
            generateMapObject.isGenerating(false);
            generateMapObject.setCurrentStatusVerbose("");


          }
        }
      }

    } catch (error) {
      console.error('Error reading files or uploading:', error);
      generateMapObject.setCurrentStatus(status_error_generate_map);
      generateMapObject.isGenerating(false);
      generateMapObject.setCurrentStatusVerbose("");
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

const uploadToS3 = async (facilitiesData, mapData, username, speedData) => {
  try {
    // Step 1: Prepare the data dictionary
    const dataDict = {
      facilities: facilitiesData,
      map_data: mapData,
      username: username,
    };
    const hashInitial = generateCombinedFileHash(facilitiesData,mapData, speedData);
    console.log("Generated initial hash: ", hashInitial)
    const s3Key = `${username}/cost-matrix-inputs/demand-data-and-facilities-${hashInitial}.json`;
    const presignedUrlServiceUrl = `https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/get-presigned-url?filename=${s3Key}`;
    const dataJson = JSON.stringify(dataDict);
    const uploadResult = await sendFileToS3(dataJson, s3Key, presignedUrlServiceUrl, true);
    if (!uploadResult) {
      throw new Error('Failed to upload the file to S3');
    }

    // Step 6: Construct the S3 URL and return it
    const bucketName = 'user-facility-files';
    const s3Url = `https://${bucketName}.s3.amazonaws.com/${s3Key}`;
    return { s3Url, filename: hashInitial };

  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error; // Re-throw the error to handle it higher up the call chain if needed
  }
}



const generateCombinedFileHash = (facilityData, mapData, speedData, empiricalData, policyData) => {


  // Convert the content objects to JSON strings with sorted keys
  const facilityJson = JSON.stringify(facilityData);
  const mapJson = JSON.stringify(mapData);
  const speedJson = JSON.stringify(speedData);

  // Concatenate the JSON strings
  const hashInitial = crypto.MD5(facilityJson + mapJson + speedJson);

  return hashInitial.toString()
};

function extractFileHash(s3Key) {
  const match = s3Key.match(/optimization-engine-input-([a-f0-9]{32})\.zip$/);
  return match ? match[1] : null;
}


const mapNumZones = (numZones) => {
  let numZonesInt;
  switch (numZones) {
    case "one":
      numZones = 1;
      break
    case "two":
      numZonesInt = 2;
      break;
    case "three":
      numZonesInt = 3;
      break;
    default:
      numZonesInt = -1;
      console.log("Unable to map number of zones.")
  }
  return numZonesInt
}

const getZoneObjects = (zone1Object, zone2Object, zone3Object, numZones) => {
  const zoneObjects = [zone1Object, zone2Object, zone3Object].slice(0, numZones);
  const typeMapping = {
    'no_mwh': 'no_mwh',
    'computed': 'computed'
  };

  return zoneObjects.map(zone => {
    const { value, manualValue } = zone;

    if (value === 'manual') {
      return { type: { manual: manualValue } };
    } else if (value in typeMapping) {
      return { type: typeMapping[value] };
    } else {
      // Handle unexpected values if necessary
      return { type: 'unknown' };
    }
  });
};



const sendFileToS3 = async (fileContent, fileName, presignedUrlServiceUrl, needEncoding = false) => {
  try {
    // Step 1: Get the Pre-Signed URL from the backend service
    const presignedUrlResponse = await fetch(`${presignedUrlServiceUrl}&filename=${encodeURIComponent(fileName)}`);
    if (!presignedUrlResponse.ok) {
      throw new Error(`Error getting pre-signed URL: ${presignedUrlResponse.statusText}`);
    }
    console.log('Presigned URL Response:', presignedUrlResponse);


    const { presigned_url: presignedUrl } = await presignedUrlResponse.json();
    // Step 2: Upload the file to S3 using the pre-signed URL
    let uploadResponse;
    if (!needEncoding) {
      // Decode the file if not encoded (assuming the fileContent is base64-encoded)
      const decodedFile = atob(fileContent); // `atob` decodes a base64-encoded string
      const binaryData = new Uint8Array(decodedFile.split('').map(char => char.charCodeAt(0)));

      uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: binaryData,
      });
    } else {
      // Upload JSON data directly with proper headers
      uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: fileContent,
      });
    }

    if (!uploadResponse.ok) {
      throw new Error(`Error uploading file to S3: ${uploadResponse.statusText}`);
    }

    console.log("File upload to S3 successful");
    return { message: "File uploaded successfully" };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
};

const requestToBackend = async (hash, s3Url, username, unmappedSpeed, mappedSpeed , setBackdropProgress) => {
  try {

    // Prepare the payload for Distance to Road
    const payload = {
      file_url: s3Url,
      unmapped_speed: unmappedSpeed, //TODO: pass both unmapped values in an object (send -1 if single) {}
    };

    // Extract bucket name and file paths from S3 URL
    const parsedUrl = new URL(s3Url);
    const bucketName = "user-facility-files"
    // Extract the base path
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const baseKeyPath = pathSegments.slice(0, 2).join('/'); // Get only the first two segments

    const part = pathSegments[pathSegments.length - 1]; // Get the last part (filename)
    const fileNameParts = part.split('-').pop();
    const filehash = fileNameParts.split('.')[0];
    // Construct the correct key

    setBackdropProgress(30);
    const distance_to_road_exists = await checkS3FileExists(bucketName, `${baseKeyPath}/distance_to_road_${filehash}.zip`)
    if (!distance_to_road_exists) {
      console.log("Distance to road doesnt exist for hash ", filehash);
      // Send the payload to the first Lambda endpoint 
      const response = fetch(lambdaEndpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });
    }

    // Poll for the "distance to road" result
    const distanceToRoadKey = `${baseKeyPath}/distance_to_road_${filehash}.zip`;
    const distanceToRoadResults = await pollS3ForFile(distanceToRoadKey, bucketName);

    let distanceFileExists = !!distanceToRoadResults;
    let costMatrixFileExists = false;

    if (!distanceFileExists) {
      console.log("Distance file doesn't exist.");
    } else {
      console.log('Distance to road file exists');
    }
    setBackdropProgress(60);

    const parsedPath = parsedUrl.pathname.slice(1);

    // Prepare the payload for Cost Matrix
    const payloadCostMatrix = {
      file_url: parsedPath,
      mapped_speed: mappedSpeed, //TODO: send both mapped speeds in an object (-1 if single) {motorized:5, walking: -1}
    };

    const cost_matrix_exists = await checkS3FileExists(bucketName, `${baseKeyPath}/cost_matrix_${filehash}.zip`)
    if (!cost_matrix_exists) {
      console.log("Cost matrix doesnt exist for hash ", filehash);

      // Send the payload to the Cost Matrix Lambda endpoint
      const responseCostMatrix = fetch(costMatrixLambdaEndpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payloadCostMatrix),
      });
    }

    // Poll for the Cost Matrix results
    const costMatrixKey = `${baseKeyPath}/cost_matrix_${filehash}.zip`;
    const costMatrixResults = await pollS3ForFile(costMatrixKey, bucketName);

    if (costMatrixResults) {
      console.log('Cost matrix file exists');
      costMatrixFileExists = true;
    } else {
      console.log("Cost matrix file doesn't exist.");
    }
    setBackdropProgress(80);

    // If both files are available, perform the final processing
    if (costMatrixFileExists && distanceFileExists) {
      console.log('Combining files...');
      const payloadCostAndOptimization = {
        distance_to_road_key: distanceToRoadKey,
        unmapped_speed: unmappedSpeed, //TODO: send both unmapped speeds as object (-1 if single)
        cost_matrix_key: costMatrixKey,
      };

      try {
        const costAndOptiExists = await checkS3FileExists(bucketName, `${username}/cost-and-optimization-results/cost-and-optimization-${filehash}.zip`)
        if (!costAndOptiExists) {
          console.log("Cost and Optimization doesnt exist for hash ", filehash);
          // Make the fetch request without awaiting the response
          const cost_response = await fetch(costAndOptimizationEndpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payloadCostAndOptimization),
          })

          if (!cost_response.ok) {
            // there was an issue with the cost matrix call
            console.log("Issue with cost matrix server.")
            return null;
          }
        }

        setBackdropProgress(90);
        // Continue immediately to polling logic
        console.log('Polling for file', `${username}/cost-and-optimization-results/cost-and-optimization-${filehash}.zip`);

        const costAndOptimizationResults = await pollS3ForFile(`${username}/cost-and-optimization-results/cost-and-optimization-${filehash}.zip`, bucketName);

        if (costAndOptimizationResults) {
          setBackdropProgress(100);
          return { costMatrixResults, costAndOptimizationResults };
        }
      } catch (error) {
        console.error('Unexpected error:', error);
      }
    }
  } catch (error) {
    console.error('Error in requestToBackend:', error);
    return null;
  }
  return null;
};


const pollS3ForFile = async (s3Key, bucketName, maxRetries = 20, retryInterval = 30000) => {
  const lambdaEndpoint = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/poll-for-files';
  const payload = {
    bucket_name: bucketName,
    s3_key: s3Key,
    downloaded: false,
  };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Polling for ${s3Key} in ${bucketName}...`);

      const response = await fetch(lambdaEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.status === 404) {
        console.log('File not found, retrying...');
        await new Promise((resolve) => setTimeout(resolve, retryInterval));

      } else if (response.ok) {
        console.log('File found in S3.');
        const data = await response.json();
        const presignedUrl = data.url;
        const fileResponse = await fetch(presignedUrl);
        if (fileResponse.ok) {
          const fileContent = await fileResponse.text(); // or .blob() if binary
          return fileContent;
        } else {
          console.log('Failed to fetch file content from S3.');
          return null;
        }
      } else {
        console.log(`Unexpected response from Lambda function: ${response.status}`);
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
      }
    } catch (error) {
      console.error(`Error during polling attempt ${attempt + 1}:`, error);
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }
  }

  console.log('Max retries reached. File not found in S3.');
  return null;
};

async function pollForOptimizationFiles(s3OutputDir, fileCount) {
  const waitTime = 5000; // 5 seconds in milliseconds
  const maxAttempts = 100;
  const s3OutputUri = `s3://user-facility-files/${s3OutputDir}`;
  const parsedUrl = new URL(s3OutputUri.replace("s3://", "https://"));
  const bucketName = parsedUrl.hostname;
  const prefix = parsedUrl.pathname.slice(1); // Remove leading '/'

  // Initialize S3 client
  const s3Client = new S3Client({
    region: "eu-west-2", // Replace with your region
    credentials: fromCognitoIdentityPool({
      clientConfig: { region: "eu-west-2" }, // Replace with your region
      identityPoolId: "eu-west-2:f891c50a-12ec-47dd-820e-7f7d224309ad", // Replace with your Identity Pool ID
    }),
  });
  let attempt = 0;

  // Helper function to poll the S3 bucket
  const pollS3 = async (resolve, reject) => {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      });

      const response = await s3Client.send(command);
      const contents = response.Contents || [];

      if (contents.length >= fileCount) {
        // Return the list of keys
        const result = {
          output_files: contents.map((obj) => obj.Key),
        };
        resolve(result);
      } else if (attempt < maxAttempts) {
        // Wait before the next attempt
        attempt++;
        console.log(`Polling attempt ${attempt}: ${contents.length} files found, waiting...`);
        setTimeout(() => pollS3(resolve, reject), waitTime);
      } else {
        // Max attempts reached
        reject(new Error(`Desired file count not met after ${(maxAttempts * waitTime) / 1000} seconds`));
      }
    } catch (error) {
      reject(error);
    }
  };

  // Return a promise that resolves when polling is complete
  return new Promise((resolve, reject) => {
    pollS3(resolve, reject);
  });
}

export async function uploadFileToS3(username, sectionId, uploadedFile, uploadedFilename) {
  try {
    const s3Filename = generateFileName(username, sectionId, uploadedFilename);
    const presignedUrlServiceUrl = `https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/get-presigned-url?filename=${uploadedFilename}`;

    // Upload to S3 without any base64 conversion
    const uploadResult = await s3Upload(uploadedFile, s3Filename, presignedUrlServiceUrl);
    if (!uploadResult) {
      console.log("Failed to upload file to S3");
      return null; // Early return for failure
    }

    // Upload file metadata to database
    const dbUploadResult = await uploadItemToDatabase(username, sectionId, uploadedFilename, s3Filename);
    if (!dbUploadResult) {
      console.log("Failed to upload item to database.");
      return null;
    }

    console.log("Uploaded file successfully");
    return s3Filename; // Return the S3 key if successful
  } catch (error) {
    console.error("Error during file upload:", error);
    return null;
  }
}



function  generateFileName(username, section, filename) {
  return `${username}/${section}/${filename}`;
}

export async function s3Upload(fileContent, fileName, presignedUrlServiceUrl) {
  try {
    // Get the pre-signed URL from the backend service
    const presignedUrlResponse = await axios.get(presignedUrlServiceUrl, {
      params: { filename: fileName }
    });

    const presignedUrl = presignedUrlResponse.data.presigned_url;

    // Upload the raw file (binary data) directly to S3 using the presigned URL
    const uploadResponse = await axios.put(presignedUrl, fileContent, {
      headers: {
        'Content-Type': fileContent.type // Use the actual content type of the file
      }
    });

    return uploadResponse.status === 200; // Return true if upload is successful
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    return null;
  }
}

async function uploadItemToDatabase(username, section, filename, s3Key) {
  const lambdaEndpoint = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/databaseFileManager';
  const payload = {
    type: 'upload',
    username: username,
    website_sector: section,
    filename: filename,
    s3_key: s3Key,
  };

  try {
    const response = await axios.post(lambdaEndpoint, payload);
    return response.status === 200;
  } catch (error) {
    console.error('Error uploading file metadata to database:', error);
    return null;
  }
}


export async function combineXlsxFiles(laborOnsetFileLMP, latentPhaseFileNuli, latentPhaseFileMulti, username, uploadDir) {
  // Create a new workbook
  const newWorkbook = XLSX.utils.book_new();

  // Helper function to read a file and extract the sheet data
  const readUploadedFile = async (file) => {
    if (!file) return null;

    // Read the file as binary string
    const data = await file.arrayBuffer(); // Reading file content as array buffer
    const workbook = XLSX.read(data, { type: 'array' });

    // Assume the uploaded file only contains a single sheet, return the first sheet data
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return worksheet ? XLSX.utils.sheet_to_json(worksheet, { header: 1 }) : null; // Return the sheet data
  };

  // 1. Populate the Multiparous Latent sheet
  const multiparousLatentSheet = await readUploadedFile(latentPhaseFileMulti);
  const multiparousLatentWS = XLSX.utils.aoa_to_sheet(multiparousLatentSheet || []);
  XLSX.utils.book_append_sheet(newWorkbook, multiparousLatentWS, 'Multiparous Latent');

  // 2. Populate the Nulliparous Latent sheet
  const nulliparousLatentSheet = await readUploadedFile(latentPhaseFileNuli);
  const nulliparousLatentWS = XLSX.utils.aoa_to_sheet(nulliparousLatentSheet || []);
  XLSX.utils.book_append_sheet(newWorkbook, nulliparousLatentWS, 'Nulliparous Latent');

  // 3. Populate the Gestation sheet
  const gestationSheet = await readUploadedFile(laborOnsetFileLMP);
  const gestationWS = XLSX.utils.aoa_to_sheet(gestationSheet || []);
  XLSX.utils.book_append_sheet(newWorkbook, gestationWS, 'Gestation');

  // Export the new workbook as binary string
  const workbookBinary = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'binary' });

  // Convert the binary string to an ArrayBuffer and then to a Blob
  const combinedFile = new Blob([s2ab(workbookBinary)], { type: 'application/octet-stream' });
  const s3Key = await uploadFileToS3(username, uploadDir, combinedFile, 'CombinedData.xlsx');
// // Create a download link and trigger download
//   const downloadLink = document.createElement('a');
//   downloadLink.href = URL.createObjectURL(combinedFile);
//   downloadLink.download = 'CombinedData.xlsx';
//   document.body.appendChild(downloadLink);
//   downloadLink.click();
//   document.body.removeChild(downloadLink);
  if (s3Key) {
    console.log("Combined file uploaded to S3 with key:", s3Key);
    return s3Key;
  } else {
    console.log("Failed to upload the combined file to S3");
    return null;
  }

}

async function checkS3FileExists(bucket, key) {
  const client = new S3Client({
    region: "eu-west-2", // Replace with your region
    credentials: fromCognitoIdentityPool({
      clientConfig: { region: "eu-west-2" }, // Replace with your region
      identityPoolId: "eu-west-2:f891c50a-12ec-47dd-820e-7f7d224309ad", // Replace with your Identity Pool ID
    }),
  });
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  try {
    const response = await client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return false;
    }
    // Log the error for debugging
    console.error("Error checking S3 file:", error);
    // Re-throw the error
    throw error;
  }
}

async function checkS3DirectoryExists(bucket, prefix, expectedFileCount = null) {
  const client = new S3Client({
    region: "eu-west-2", // Replace with your region
    credentials: fromCognitoIdentityPool({
      clientConfig: { region: "eu-west-2" }, // Replace with your region
      identityPoolId: "eu-west-2:f891c50a-12ec-47dd-820e-7f7d224309ad", // Replace with your Identity Pool ID
    }),
  });
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix.endsWith('/') ? prefix : `${prefix}/`
  });

  try {
    let totalFiles = 0;
    let isTruncated = true;
    let continuationToken = undefined;

    while (isTruncated) {
      const response = await client.send(command);

      if (response.Contents) {
        totalFiles += response.Contents.length;
      }

      // If we've already exceeded the expected count, we can stop
      if (expectedFileCount !== null && totalFiles > expectedFileCount) {
        console.log("Wrong number of files found.", totalFiles)
        return false;
      }

      isTruncated = response.IsTruncated;
      continuationToken = response.NextContinuationToken;

      if (isTruncated) {
        command.input.ContinuationToken = continuationToken;
      }
    }

    if (expectedFileCount === null) {
      return totalFiles > 0;
    } else {
      console.debug("Expected "+ expectedFileCount + ", Actual: " + totalFiles)
      return totalFiles === expectedFileCount;
    }
  } catch (error) {
    console.error("Error checking S3 directory:", error);
    return false;
  }
}

export async function getFileFromS3(s3Key) {
  const bucketName = "user-facility-files"; // Replace with your S3 bucket name
  const s3Client = new S3Client({
    region: "eu-west-2", // Replace with your region
    credentials: fromCognitoIdentityPool({
      clientConfig: { region: "eu-west-2" }, // Replace with your region
      identityPoolId: "eu-west-2:f891c50a-12ec-47dd-820e-7f7d224309ad", // Replace with your Identity Pool ID
    }),
  });

  try {
    // Create a command to get the object
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    // Generate a pre-signed URL
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour

    // Return the signed URL
    return {
      url: signedUrl,
      key: s3Key
    };

  } catch (error) {
    console.error("Error retrieving file from S3:", error);
    throw error;
  }
}


// Helper function to convert binary string to an ArrayBuffer
function s2ab(s) {
  const buf = new ArrayBuffer(s.length); // Create a buffer
  const view = new Uint8Array(buf); // Create a view into the buffer
  for (let i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i) & 0xFF; // Fill buffer with binary data
  }
  return buf;
}

export function extractSpeeds(data) {
  try {
    const travelSpeedData = data.demand_data_travel_speed.M;

    if ('single' in travelSpeedData) {
      // Handle single case
      const singleData = travelSpeedData.single.M;
      return {
        type: 'single',
        unmappedSpeed: parseInt(singleData.unmapped_speed.N, 10),
        mappedSpeed: parseInt(singleData.mapped_speed.N, 10)
      };
    } else if ('multiple' in travelSpeedData) {
      // Handle multiple case
      const multipleData = travelSpeedData.multiple.M;
      return {
        type: 'multiple',
        totalDemand: {
          type: multipleData.total_demand.M.type.S,
          value: parseInt(multipleData.total_demand.M.value.S, 10)
        },
        walking: {
          unmappedSpeed: parseInt(multipleData.walking.M.unmapped_speed.N, 10),
          mappedSpeed: parseInt(multipleData.walking.M.mapped_speed.N, 10)
        },
        motorized: {
          unmappedSpeed: parseInt(multipleData.motorized.M.unmapped_speed.N, 10),
          mappedSpeed: parseInt(multipleData.motorized.M.mapped_speed.N, 10)
        }
      };
    } else {
      throw new Error("Unknown demand_data_travel_speed structure");
    }
  } catch (error) {
    console.error("Error extracting speeds:", error);
    return null;
  }
}

export function extractDemandData(data, field) {
  if (!data[field] || !data[field].M) {
    return null;
  }

  const fieldData = data[field].M;
  const type = Object.keys(fieldData)[0]; // 'single' or 'multiple'
  const content = fieldData[type].M;

  const result = {
    type: type,
    files: []
  };

  if (type === 'single') {
    result.files.push({
      key: content.file_key_1.S,
      name: content.file_name_1.S
    });
  } else if (type === 'multiple') {
    for (let i = 1; i <= 2; i++) {
      const fileKey = `file_key_${i}`;
      const fileName = `file_name_${i}`;
      if (content[fileKey] && content[fileName]) {
        result.files.push({
          key: content[fileKey].S,
          name: content[fileName].S
        });
      }
    }
    if (content.total_demand && content.total_demand.M.manual_input) {
      result.totalDemand = content.total_demand.M.manual_input.S;
    }
  }

  return result;
}