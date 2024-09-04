import axios from "axios";
import crypto from 'crypto-js';
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import {fromCognitoIdentityPool} from "@aws-sdk/credential-providers";

export const formatCurrency = (amount) => {
  return (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

export const fileDbUrl = "https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/databaseFileManager"
export const geoboundaryUrl = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/geoboundary'
export const saveSessionUrl = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/save_user_session'
export const loadSessionurl = "https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/get_user_session"
const data_consolidation_lambda_endpoint = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/file-consolidation'
// const optimisation_engine_url = "https://opt.ewser.com/run-optimization"
const optimisation_engine_url = "https://acf2a7bc-c344-47e6-8561-a2b599742982.mock.pstmn.io/run-optimization"



export const generateAssignmentMap = async (generateAssignmentMapObject) => {
  let speed, latent, labor;
  generateAssignmentMapObject.speed == 'single' ? speed = 'walking' : speed = 'Motorized, Walking'
  generateAssignmentMapObject.labor == 'single' ? labor = 'LMP certain' : 'LMP certain, LMP uncertain'
  generateAssignmentMapObject.latent == 'single' ? latent = 'nulliparous' : 'Multiparous, Nulliparous'

  let payloadObject = {
    speed,
    labor,
    latent,
    username: generateAssignmentMapObject.username,
    filehash: generateAssignmentMapObject.filehash,
    tif_filename: generateAssignmentMapObject.tif_filename,
    table: generateAssignmentMapObject.table
  }
  generateAssignmentMapObject.setBackdropOpen(true);
  generateAssignmentMapObject.setBackdropText("Step 1/2: Making call for file consolidation..")
  generateAssignmentMapObject.setBackdropProgress(10)
  let payload = JSON.stringify(payloadObject);
  const response = await fetch(data_consolidation_lambda_endpoint,{
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });

  if (response.ok) {
    console.log("Consolidation successful.");
    let responseJson = await response.json();
    let parsedBody;
    try {
      parsedBody = JSON.parse(responseJson.body);
    } catch (error) {
      console.error("Error parsing response body:", error);
      return;
    }
    const s3Key = parsedBody.s3_key;
    let opti_payload = {
      s3_key: s3Key,
      username: generateAssignmentMapObject.username,
      hash: generateAssignmentMapObject.filehash
    }
    generateAssignmentMapObject.setBackdropText("Step 2/2: Making call to optimization engine..")
    generateAssignmentMapObject.setBackdropProgress(50)
    console.log("Making request to optimisation engine.")
    const opti_response = await fetch(optimisation_engine_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opti_payload),
    })

    if (opti_response.ok) {
      generateAssignmentMapObject.setBackdropProgress(80);
      console.log("Optimisation response: ", opti_response)
      const responseBody = await opti_response.json();
      const results = await pollForOptimizationFiles(responseBody)
      console.log("Polling done:", results)
      generateAssignmentMapObject.setOptimisationEngineData(results);
      generateAssignmentMapObject.setBackdropProgress(100);
    }

    generateAssignmentMapObject.setBackdropText("")
    generateAssignmentMapObject.setBackdropOpen(false);
    generateAssignmentMapObject.setBackdropProgress(0);

  } else {
    console.error("Error in consolidation request:", response.statusText);
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
  if (generateMapObject.facilityFile && generateMapObject.geofenceFile && generateMapObject.totalDemandFile) {
    generateMapObject.updateGenerateMapAlertText("")
    generateMapObject.setBackdropOpen(true);
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

      let jsonData = response.data;
      let parsedResponse = JSON.parse(jsonData.results);
      const result = {
        pregnancy_values: parsedResponse
      }
      generateMapObject.geoboundaryObject.handler(result)
      generateMapObject.setBackdropProgress(20);

      if (result && generateMapObject.facilityFileJson) {
        const { s3Url, filename } = await uploadToS3(generateMapObject.facilityFileJson, result, generateMapObject.username);
        if (s3Url) {
          generateMapObject.setBackdropProgress(25);
          generateMapObject.setBackdropText("Step 2/2: Generating cost matrix data...")

          const backendResults = await requestToBackend(s3Url, generateMapObject.username, generateMapObject.travelSpeedMotorizedUnmapped, generateMapObject.travelSpeedMotorizedMapped, generateMapObject.setBackdropProgress); //TODO: change hardcoded
          if (backendResults) {
            //TODO: if travel speed is multiple, there will be 2 cost and optimization layers
            console.log('Backend processing completed successfully:', backendResults);
            generateMapObject.setCostMatrixData(JSON.parse(backendResults.costMatrixResults));
            generateMapObject.setCostAndOptimizationData(JSON.parse(backendResults.costAndOptimizationResults));
            generateMapObject.setFileHash(filename)
            generateMapObject.setBackdropText("")
            generateMapObject.setBackdropOpen(false);
            generateMapObject.setBackdropProgress(0);
          } else {
            console.log('Failed to process backend data.');
          }
        }
      }

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

const uploadToS3 = async (facilitiesData, mapData, username) => {
  try {
    // Step 1: Prepare the data dictionary
    const dataDict = {
      facilities: facilitiesData,
      map_data: mapData,
      username: username,
    };
    const filename = generateCombinedFileHash(facilitiesData,mapData);
    const s3Key = `${username}/cost-matrix-inputs/demand-data-and-facilities-${filename}.json`;
    const presignedUrlServiceUrl = `https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/get-presigned-url?filename=${s3Key}`;
    const dataJson = JSON.stringify(dataDict);
    const uploadResult = await sendFileToS3(dataJson, s3Key, presignedUrlServiceUrl, true);
    if (!uploadResult) {
      throw new Error('Failed to upload the file to S3');
    }

    // Step 6: Construct the S3 URL and return it
    const bucketName = 'user-facility-files';
    const s3Url = `https://${bucketName}.s3.amazonaws.com/${s3Key}`;
    return { s3Url, filename };

  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error; // Re-throw the error to handle it higher up the call chain if needed
  }
}



const generateCombinedFileHash = (file1Content, file2Content) => {
  // Convert the content objects to JSON strings with sorted keys
  const jsonStr1 = JSON.stringify(file1Content, Object.keys(file1Content).sort());
  const jsonStr2 = JSON.stringify(file2Content, Object.keys(file2Content).sort());

  // Concatenate the JSON strings
  const combinedStr = jsonStr1 + jsonStr2;

  // Generate the MD5 hash of the combined string
  return crypto.MD5(combinedStr).toString();
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

const requestToBackend = async (s3Url, username, unmappedSpeed, mappedSpeed , setBackdropProgress) => {
  try {
    // Lambda endpoint URLs
    const lambdaEndpoint = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/distance-to-road';
    const costMatrixLambdaEndpoint = 'https://rxhlpn2bd8.execute-api.eu-west-2.amazonaws.com/dev/cost-matrix';
    const costAndOptimizationEndpoint = 'https://cmatrix.ewser.com/process';

    // Prepare the payload for Distance to Road
    const payload = {
      file_url: s3Url,
      unmapped_speed: unmappedSpeed, //TODO: pass both unmapped values in an object (send -1 if single)
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

    // Send the payload to the first Lambda endpoint
    const response = await fetch(lambdaEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

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
      mapped_speed: mappedSpeed, //TODO: send both mapped speeds in an object (-1 if single)
    };

    // Send the payload to the Cost Matrix Lambda endpoint
    const responseCostMatrix = await fetch(costMatrixLambdaEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadCostMatrix),
    });


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
        // Make the fetch request without awaiting the response
        fetch(costAndOptimizationEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadCostAndOptimization),
        }).catch((error) => {
          console.error('Error in cost and optimization request:', error);
        });
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
        continue;
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

async function pollForOptimizationFiles(responseBody) {
  const waitTime = 5000; // 5 seconds in milliseconds
  const maxAttempts = 100;
  const fileCount = responseBody.num_files;
  const s3OutputDir = responseBody.s3_output_dir;
  const s3OutputUri = `s3://user-facility-files/${s3OutputDir}`;
  const parsedUrl = new URL(s3OutputUri.replace("s3://", "https://"));
  const bucketName = parsedUrl.hostname;
  const prefix = parsedUrl.pathname.slice(1); // Remove leading '/'
  console.log(s3OutputDir)
  console.log(bucketName)

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




