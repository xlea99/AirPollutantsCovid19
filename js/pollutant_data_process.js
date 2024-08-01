// ==============================================
// This file is responsible for processing and serializing the data stored in the raw
// OpenAQ "data_all.json" file into an object usable by the program for visualization. Once
// complete, it stores the finished pollutant data object in session storage on the web page.
// ==============================================

// Function to fetch and return the raw data
function fetchData(url) {
    return fetch(url)
        .then(response => response.json())
        .catch(error => {
            console.error("Error loading the JSON file:", error);
            throw new Error('Failed to load data');
        });
}

// This function fills all found date gaps with blank, 0 readingCount entries.
function fillDateGaps(data, startDate, endDate) {
    const completeData = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    const dataMap = new Map(data.map(item => [item.date, item.average]));

    while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        completeData.push({
            date: dateStr,
            value: dataMap.has(dateStr) ? dataMap.get(dateStr) : null
        });
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return completeData;
}

// Function to perform linear interpolation and mark interpolated values
function linearInterpolate(data) {
    let lastValidIndex = data.findIndex(d => d.value !== null);
    // Ensure initial data points have the interpolated flag
    data.forEach((d, idx) => {
        if (d.value !== null && !d.hasOwnProperty('interpolated')) {
            d.interpolated = false;
        }
    });

    for (let i = lastValidIndex + 1; i < data.length; i++) {
        if (data[i].value === null) {
            let nextValidIndex = i + 1;
            while (nextValidIndex < data.length && data[nextValidIndex].value === null) {
                nextValidIndex++;
            }
            if (nextValidIndex < data.length) {
                const slope = (data[nextValidIndex].value - data[lastValidIndex].value) / (nextValidIndex - lastValidIndex);
                for (let j = i; j < nextValidIndex; j++) {
                    data[j].value = data[lastValidIndex].value + slope * (j - lastValidIndex);
                    // Mark entry as interpolated
                    data[j].interpolated = true;
                }
                i = nextValidIndex - 1;
            }
        } else {
            lastValidIndex = i;
            if (!data[i].hasOwnProperty('interpolated')) {
                // MArk as not interpolated
                data[i].interpolated = false;
            }
        }
    }
    return data;
}

const allPollutants = ["pm25", "so2", "no2"];
const allCities = ["Chicago-Naperville-Joliet",
    "Seattle-Tacoma-Bellevue",
    "New York-Northern New Jersey-Long Island",
    "Miami-Fort Lauderdale-Miami Beach",
    "Los Angeles-Long Beach-Santa Ana"];
// "Main" function to handle fetching, processing, cleaning, and interpolating the data
// for external use with the visualizations.
async function processData() {
    try {
        const rawData = await fetchData('data/data_all.json');

        let processedData = {}
        allCities.forEach(city => {
            processedData[city] = {}
            allPollutants.forEach(pollutant => {
                const cityData = rawData[city][pollutant];

                // Fill in missing date entries
                const startDate = "2020-01-01";
                const endDate = "2020-12-31";
                const completeDataArray = fillDateGaps(cityData, startDate, endDate);

                // Interpolate missing data
                processedData[city][pollutant] = linearInterpolate(completeDataArray);
            })
        })
        console.info("Pollutant data loaded successfully: ", processedData);
        localStorage.setItem('pollutantData', JSON.stringify(processedData));
        document.dispatchEvent(new CustomEvent('PollutantDataLoaded'));

    } catch (error) {
        console.error("An error occurred during processing:", error);
    }
}

// Call the master function to run everything
processData();