import React from 'react';
import FacilityDataTable from "@/app/ui/FacilityDataTable";

const FacilityDataInput = ({ facilityFileJson, facilityFileName, setFacilityFileJson, tableRows, setTableRows }) => {
    return (
        <FacilityDataTable
            filename={facilityFileName}
            fileJson={facilityFileJson}
            setFacilityFileJson={setFacilityFileJson}
            rows={tableRows}
            setRows={setTableRows}
        />
    );
};

export default FacilityDataInput;
