// ==============================================
// This file is responsible for processing and serializing the data stored in the raw
// Google "2020 Us Region Mobility Report.csv" file, which contains important traffic
// data used for comparison with pollutant values.
// ==============================================

// Function to parse Mobility data csv, then store into session storage
d3.csv("data/2020_US_Region_Mobility_Report.csv", function(d) {
    return {
        date: new Date(d.date),
        subRegion1: d.sub_region_1,
        subRegion2: d.sub_region_2,
        transitChange: +d.transit_stations_percent_change_from_baseline // Convert to number
    };
}).then(function(data) {
    let filteredData = aggregateData(data);
    console.info("Traffic data loaded successfully", filteredData)
    localStorage.setItem('trafficData', JSON.stringify(filteredData));
    document.dispatchEvent(new CustomEvent('TrafficDataLoaded'));
}).catch(function(error) {
    console.error("Error loading CSV:", error);
});

// Here we filter for only the counties that correspond with our target cities.
function aggregateData(data) {
    // Filter data for a specific city or cities
    const filteredData = data.filter(d =>
        d.subRegion1 === 'California' && d.subRegion2 === "Los Angeles County" ||
        d.subRegion1 === 'Illinois' && d.subRegion2 === "Cook County" ||
        d.subRegion1 === 'Washington' && d.subRegion2 === "King County" ||
        d.subRegion1 === 'New York' && d.subRegion2 === "New York County" ||
        d.subRegion1 === 'Florida' && d.subRegion2 === "Miami-Dade County");

    // We map the counties, as they are understood in the mobility report, to cities we've selected to study
    // from the OpenAQ data.
    const mappedCounties = {"Los Angeles County": "Los Angeles-Long Beach-Santa Ana",
        "Cook County": "Chicago-Naperville-Joliet",
        "King County": "Seattle-Tacoma-Bellevue",
        "New York County": "New York-Northern New Jersey-Long Island",
        "Miami-Dade County": "Miami-Fort Lauderdale-Miami Beach"}
    let aggregatedData = {"Los Angeles-Long Beach-Santa Ana": [],
        "Chicago-Naperville-Joliet": [],
        "Seattle-Tacoma-Bellevue": [],
        "New York-Northern New Jersey-Long Island": [],
        "Miami-Fort Lauderdale-Miami Beach": []}
    filteredData.forEach(dataPoint => {
        const newDataPoint = {date: dataPoint.date.toISOString().slice(0, 10),transitChange: dataPoint.transitChange}
        aggregatedData[mappedCounties[dataPoint.subRegion2]].push(newDataPoint)
    })

    return aggregatedData
}
