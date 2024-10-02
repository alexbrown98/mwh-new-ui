import React from 'react';
import FileHandlingButtons from "@/app/ui/FileHandlingButtons";

const FileHandlingSection = ({ fileObject }) => {
    return (
        <FileHandlingButtons fileObject={fileObject} />
    );
};

export default FileHandlingSection;
