'use client';
import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {Button, FormControl, IconButton, InputLabel, MenuItem, Modal, Select, SelectChangeEvent} from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {styled} from '@mui/material/styles';
import CancelIcon from '@mui/icons-material/Cancel';
import {getSavedFiles} from '@/app/lib/utils'

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

const defaultObject = {
    fileName: "",
    fileType: "",
    fileHandler: null,
    fileClearHandler: null,
    website_sector: "",
    username:null,
    generating:null,
}

export default function FileHandlingButtons({fileObject= defaultObject}) {

    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    const [files, setFiles] = React.useState([]);
    const [selectedFile, setSelectedFile] = React.useState('');


    const handleFileChange = async (event) => {
        const fileUrl = event.target.value;
        setSelectedFile(fileUrl);
        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const file = new File([blob], files.find(file => file.url === fileUrl).file_name, { type: blob.type });
            if (fileObject.fileHandler) {
                fileObject.fileHandler({target: {files: [file]}})
            }
            console.log("Loaded file successfully.")
            setOpen(false)
            setFiles([])
        } catch (error) {
            console.error("Error fetching file from URL:", error);
        }
    };



    React.useEffect(() => {
        const fetchData = async () => {
            const data = await getSavedFiles(fileObject.website_sector, fileObject.username);
            setFiles(data);
        };
        if (open) {
            fetchData();
        }
    }, [open, fileObject.website_sector]);


    return (
        <Box>
            <Box>
                <Typography variant="h6" gutterBottom={true}>
                    {fileObject.fileType}
                </Typography>
            </Box>
            <Box>
                <Button  size={'small'} sx={{mr:2, mb:1}} variant="contained"
                         disabled={fileObject.generating}
                         component="label"
                         startIcon={<CloudUploadIcon />}
                >Upload file
                    <VisuallyHiddenInput key={Date.now()} type="file" onChange={fileObject.fileHandler} />
                </Button>
                <Button
                    onClick={handleOpen}
                    disabled={fileObject.generating}
                    size={'small'}  sx={{mb:1}}
                    color={"secondary"}
                    variant="contained"
                >Saved Files</Button>
                <Modal
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="modal-modal-title"
                    aria-describedby="modal-modal-description"
                >
                    <Box sx={style}>
                        <Typography sx={{mb:5}} id="modal-modal-title" variant="h5" component="h2">
                            Select File
                        </Typography>
                        <FormControl fullWidth>
                            <InputLabel id="demo-simple-select-label">File</InputLabel>
                            <Select
                                labelId="demo-simple-select-label"
                                id="demo-simple-select"
                                value={selectedFile}
                                label="File"
                                onChange={handleFileChange}
                            >
                                {files.map(file => (
                                    <MenuItem key={file.url} value={file.url}>
                                        {file.file_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                    </Box>
                </Modal>
                {fileObject.fileName && (
                    <Box>
                        <Button disableRipple={true} sx={{color:'green',cursor: 'default'}} variant="text" gutterBottom={true}>
                            {fileObject.fileName}
                        </Button>
                        <IconButton disabled={fileObject.generating} onClick={fileObject.fileClearHandler} color={'error'} size={'small'}>
                            <CancelIcon></CancelIcon>
                        </IconButton>
                    </Box>

                )}
            </Box>

        </Box>

    )
}

const style = {
    position: 'absolute' as 'absolute',
    top: '20%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
};